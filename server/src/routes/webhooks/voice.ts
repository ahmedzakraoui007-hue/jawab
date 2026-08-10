import { Router } from 'express';
import { prisma } from '../../db';
import { isTwilioConfigured, verifyTwilioRequest } from '../../lib/twilio';
import { isElevenLabsConfigured, detectTextLanguage } from '../../lib/elevenlabs';
import { getBusinessByVoiceNumber } from '../../lib/business-lookup';
import { buildSystemPromptInput, buildBookingContext } from '../../lib/business-adapters';
import { generateResponse, buildSystemPrompt } from '../../lib/gemini';
import { checkRateLimit } from '../../lib/rate-limit';
import { resolveEffectiveBilling, isUsageAllowed } from '../../lib/billing';
import { checkAndIncrementUsage } from '../../lib/usage';
import type { PlanTier } from '../../lib/pricing';
import type { Business } from '@prisma/client';

export const voiceWebhookRouter = Router();

const VOICE_RATE_LIMIT = 20;
const VOICE_RATE_WINDOW_SECONDS = 60;

const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;

function xml(res: import('express').Response, body: string) {
    res.set('Content-Type', 'text/xml').send(body);
}

function speakVerb(text: string, language: 'ar' | 'en'): string {
    if (isElevenLabsConfigured) {
        const audioUrl = `${BACKEND_URL}/tts?text=${encodeURIComponent(text)}&lang=${language}&gender=female`;
        return `<Play>${escapeXml(audioUrl)}</Play>`;
    }
    const escapedText = escapeXml(text);
    const pollyVoice = language === 'ar' ? 'Polly.Zeina' : 'Polly.Joanna';
    const pollyLang = language === 'ar' ? 'ar-XA' : 'en-US';
    return `<Say voice="${pollyVoice}" language="${pollyLang}">${escapedText}</Say>`;
}

function generateTwiML(text: string, continueGather: boolean, language: 'ar' | 'en' = 'en'): string {
    if (continueGather) {
        const noInputText = language === 'ar' ? 'لم أسمع شيء. مع السلامة!' : "I didn't hear anything. Goodbye!";
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhooks/voice" method="POST" language="${language === 'ar' ? 'ar-SA' : 'en-US'}">
    ${speakVerb(text, language)}
  </Gather>
  ${speakVerb(noInputText, language)}
  <Hangup/>
</Response>`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speakVerb(text, language)}
  <Hangup/>
</Response>`;
}

function cleanForSpeech(text: string): string {
    return text
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/[-*]\s/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function shouldEndConversation(response: string, userInput: string): boolean {
    const endPhrases = ['goodbye', 'bye', 'مع السلامة', 'شكراً', 'thank you', 'have a nice day', 'see you', 'thanks for calling'];
    const lower = (response + ' ' + userInput).toLowerCase();
    return endPhrases.some((p) => lower.includes(p));
}

function escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function checkBillingAndUsage(business: Business): Promise<{ ok: true } | { ok: false; twiml: string }> {
    const billing = resolveEffectiveBilling(business);
    if (!isUsageAllowed(billing.status)) {
        return { ok: false, twiml: generateTwiML("We're sorry, this business's account is currently inactive. Goodbye.", false, 'en') };
    }
    const usage = await checkAndIncrementUsage(business.id, billing.plan as PlanTier, business.planOverrideConversationLimit);
    if (!usage.allowed) {
        return { ok: false, twiml: generateTwiML("We're sorry, this business has reached its monthly limit. Please try again later.", false, 'en') };
    }
    return { ok: true };
}

// Deliberately not wrapped in asyncHandler: a thrown error here must
// still produce valid TwiML (the generic JSON error handler would hand
// Twilio invalid XML mid-call), so this catches its own errors instead.
voiceWebhookRouter.post('/', async (req, res) => {
  try {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.body)) params[key] = String(value);

    if (isTwilioConfigured) {
        if (!verifyTwilioRequest(req, params)) {
            console.warn('[Voice] Invalid Twilio signature — rejecting request');
            res.status(403).set('Content-Type', 'text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>');
            return;
        }
    } else {
        console.warn('[Voice] Twilio not configured — signature NOT verified');
    }

    const callSid = params.CallSid;
    const from = params.From;
    const to = params.To || '';
    const speechResult = params.SpeechResult || null;
    const digits = params.Digits || null;

    const business = await getBusinessByVoiceNumber(to);
    if (!business) {
        console.error('[Voice] No business found, cannot process call');
        xml(res, `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured. Goodbye.</Say><Hangup/></Response>`);
        return;
    }

    const rateLimit = await checkRateLimit(`voice-webhook:${business.id}`, VOICE_RATE_LIMIT, VOICE_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        xml(res, generateTwiML("We're getting a lot of calls right now — please try again in a minute.", false, 'en'));
        return;
    }

    const billingCheck = await checkBillingAndUsage(business);
    if (!billingCheck.ok) {
        xml(res, billingCheck.twiml);
        return;
    }

    // New call — greeting, no speech/digits yet.
    if (!speechResult && !digits) {
        await prisma.conversation.create({
            data: { businessId: business.id, customerPhone: from, channel: 'voice', status: 'active', handledBy: 'ai', callSid },
        });

        const greeting = `مرحباً! أهلاً بك في ${business.name}. كيف أقدر أساعدك اليوم؟`;
        xml(res, generateTwiML(greeting, true, 'ar'));
        return;
    }

    // Ongoing turn — find (or, if state was lost, recreate) the conversation.
    const userInput = speechResult || (digits ? `Pressed ${digits}` : '');
    let conversation = await prisma.conversation.findFirst({
        where: { callSid, businessId: business.id },
        include: { messages: { orderBy: { timestamp: 'asc' } } },
    });

    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: { businessId: business.id, customerPhone: from, channel: 'voice', status: 'active', handledBy: 'ai', callSid },
            include: { messages: true },
        });
    }

    const systemPrompt = buildSystemPrompt(buildSystemPromptInput(business)) + `

## Voice Call Special Instructions
- Keep responses SHORT (max 2-3 sentences for voice)
- Speak naturally, as if on a phone call
- Don't use markdown, bullet points, or formatting
- If customer wants to book, collect: service, date/time preference, name
- End with a clear question or confirmation`;

    const history = conversation.messages.map((m) => ({ role: m.role as 'user' | 'model', content: m.content }));
    const bookingContext = buildBookingContext(business, from);

    const aiResponse = await generateResponse(systemPrompt, history, userInput, 3, bookingContext);
    const cleanedResponse = cleanForSpeech(aiResponse);

    await prisma.$transaction([
        prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: userInput } }),
        prisma.message.create({ data: { conversationId: conversation.id, role: 'model', content: cleanedResponse } }),
        prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } }),
    ]);

    const shouldEndCall = shouldEndConversation(cleanedResponse, userInput);
    const language = detectTextLanguage(cleanedResponse);
    xml(res, generateTwiML(cleanedResponse, !shouldEndCall, language));
  } catch (error) {
    console.error('[Voice Webhook Error]', error);
    xml(res, `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zeina" language="ar-XA">عذراً، حصل خطأ. خليني أحولك لأحد من الفريق.</Say>
  <Hangup/>
</Response>`);
  }
});

voiceWebhookRouter.get('/', (_req, res) => {
    res.json({ status: 'Voice webhook is active', elevenlabs: isElevenLabsConfigured });
});
