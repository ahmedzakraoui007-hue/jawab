import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, buildSystemPrompt } from '@/lib/gemini';
import { detectTextLanguage, isElevenLabsConfigured } from '@/lib/elevenlabs';
import { isTwilioConfigured, verifyTwilioRequest } from '@/lib/twilio';
import { getAppUrl } from '@/lib/utils';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { BookingContext } from '@/lib/booking-actions';
import { checkRateLimit } from '@/lib/rate-limit';

// Caps how fast one business's Gemini/ElevenLabs budget can be burned by
// flooded calls — abuse mitigation, not a limit on legitimate call volume.
const VOICE_RATE_LIMIT = 20;
const VOICE_RATE_WINDOW_SECONDS = 60;

/**
 * MULTI-TENANT: Get business by voice phone number
 */
async function getBusinessByPhoneNumber(phoneNumber: string): Promise<{ business: FirebaseFirestore.DocumentData; businessId: string } | null> {
    try {
        const businessesRef = adminDb.collection('businesses');

        // Try new nested structure: phoneNumber.number
        let snapshot = await businessesRef.where('phoneNumber.number', '==', phoneNumber).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[Voice] Found business by phoneNumber.number: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Legacy: Try flat phoneNumber field
        snapshot = await businessesRef.where('phoneNumber', '==', phoneNumber).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[Voice] Found business by legacy phoneNumber: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        console.error(`[Voice] No business found for ${phoneNumber} — refusing to guess`);
        return null;
    } catch (error) {
        console.error('[Voice] Error fetching business:', error);
        return null;
    }
}

// In-memory conversation store for voice calls (needed for ongoing call state)
const voiceConversations: Record<string, {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
    firestoreConvId?: string;
    businessId?: string;
    startTime: Date;
}> = {};

// Base URL for audio files (ngrok or production URL)
const BASE_URL = getAppUrl();

/**
 * Main voice webhook handler
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Verify this request actually came from Twilio before trusting anything in it
        if (isTwilioConfigured) {
            const paramsForValidation: Record<string, string> = {};
            formData.forEach((value, key) => {
                paramsForValidation[key] = String(value);
            });
            if (!verifyTwilioRequest(request, paramsForValidation)) {
                console.warn('[Voice] Invalid Twilio signature — rejecting request');
                return new NextResponse(
                    `<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>`,
                    { status: 403, headers: { 'Content-Type': 'text/xml' } }
                );
            }
        } else {
            console.warn('[Voice] Twilio not configured — signature NOT verified');
        }

        const callSid = formData.get('CallSid') as string;
        const from = formData.get('From') as string;
        const callStatus = formData.get('CallStatus') as string;
        const speechResult = formData.get('SpeechResult') as string | null;
        const digits = formData.get('Digits') as string | null;
        const to = formData.get('To') as string || '';

        console.log(`[Voice] CallSid: ${callSid}, From: ${from}, Status: ${callStatus}`);

        // Handle new incoming call - initial greeting
        if (!speechResult && !digits) {
            // Look up the business by the called number
            const result = await getBusinessByPhoneNumber(to);

            if (!result) {
                console.error('[Voice] No business found, cannot process call');
                return new NextResponse(
                    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured. Goodbye.</Say><Hangup/></Response>`,
                    { headers: { 'Content-Type': 'text/xml' } }
                );
            }

            const { business, businessId } = result;

            const rateLimit = await checkRateLimit(`voice-webhook:${businessId}`, VOICE_RATE_LIMIT, VOICE_RATE_WINDOW_SECONDS);
            if (!rateLimit.allowed) {
                console.warn(`[Voice] Rate limit hit for business ${businessId}`);
                return new NextResponse(
                    generateTwiML("We're getting a lot of calls right now — please try again in a minute.", false, 'en'),
                    { headers: { 'Content-Type': 'text/xml' } }
                );
            }

            // Initialize conversation
            voiceConversations[callSid] = {
                messages: [],
                businessId,
                startTime: new Date(),
            };

            // Save to Firestore
            try {
                const convsRef = adminDb.collection('businesses').doc(businessId).collection('conversations');
                const convRef = await convsRef.add({
                    businessId,
                    customerPhone: from,
                    channel: 'voice',
                    status: 'active',
                    handledBy: 'ai',
                    callSid,
                    messages: [],
                    startedAt: FieldValue.serverTimestamp(),
                    lastMessageAt: FieldValue.serverTimestamp(),
                });
                voiceConversations[callSid].firestoreConvId = convRef.id;
            } catch (err) {
                console.error('[Voice] Firestore save error:', err);
            }

            // Greeting message
            const greeting = `مرحباً! أهلاً بك في ${business.name}. كيف أقدر أساعدك اليوم؟`;

            return new NextResponse(
                generateTwiML(greeting, true, 'ar'),
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        // Process speech input
        const userInput = speechResult || (digits ? `Pressed ${digits}` : '');
        console.log(`[Voice] User said: "${userInput}"`);

        // Initialize if call state was lost (Vercel cold start)
        if (!voiceConversations[callSid]) {
            // Try to recover business from the first available
            const result = await getBusinessByPhoneNumber(to);
            voiceConversations[callSid] = {
                messages: [],
                businessId: result?.businessId,
                startTime: new Date(),
            };
        }

        // Get business for system prompt
        const businessId = voiceConversations[callSid].businessId;
        let businessData: FirebaseFirestore.DocumentData | null = null;

        if (businessId) {
            const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
            if (businessDoc.exists) {
                businessData = businessDoc.data()!;
            }
        }

        if (!businessData) {
            return new NextResponse(
                `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Goodbye.</Say><Hangup/></Response>`,
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        const turnRateLimit = await checkRateLimit(`voice-webhook:${businessId}`, VOICE_RATE_LIMIT, VOICE_RATE_WINDOW_SECONDS);
        if (!turnRateLimit.allowed) {
            console.warn(`[Voice] Rate limit hit mid-call for business ${businessId}`);
            return new NextResponse(
                generateTwiML("We're getting a lot of calls right now — please try again in a minute.", false, 'en'),
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        // Generate AI response
        const systemPrompt = buildSystemPrompt({
            name: businessData.name,
            location: businessData.location || '',
            services: businessData.services || [],
            hours: businessData.hours || {},
            address: businessData.address || '',
            googleMapsLink: businessData.googleMapsLink,
            parkingInfo: businessData.parkingInfo,
            customFaqs: businessData.customFaqs,
            tone: businessData.tone,
        }) + `

## Voice Call Special Instructions
- Keep responses SHORT (max 2-3 sentences for voice)
- Speak naturally, as if on a phone call
- Don't use markdown, bullet points, or formatting
- Use verbal cues like "um", "so" sparingly for naturalness
- If customer wants to book, collect: service, date/time preference, name
- End with a clear question or confirmation`;

        const bookingContext: BookingContext = {
            businessId: businessId!,
            customerPhone: from,
            services: businessData.services || [],
            hours: businessData.hours || {},
            googleCalendar: businessData.googleCalendar,
        };

        const aiResponse = await generateResponse(
            systemPrompt,
            voiceConversations[callSid].messages,
            userInput,
            3,
            bookingContext
        );

        // Clean response for speech (remove markdown, emojis, etc.)
        const cleanedResponse = cleanForSpeech(aiResponse);

        // Update conversation history
        voiceConversations[callSid].messages.push(
            { role: 'user', content: userInput },
            { role: 'model', content: cleanedResponse }
        );

        // Save to Firestore
        const convId = voiceConversations[callSid].firestoreConvId;
        const bId = voiceConversations[callSid].businessId;
        if (convId && bId) {
            try {
                const convRef = adminDb
                    .collection('businesses').doc(bId)
                    .collection('conversations').doc(convId);
                await convRef.update({
                    messages: voiceConversations[callSid].messages.map(m => ({
                        ...m,
                        timestamp: FieldValue.serverTimestamp(),
                    })),
                    lastMessageAt: FieldValue.serverTimestamp(),
                });
            } catch (err) {
                console.error('[Voice] Firestore update error:', err);
            }
        }

        // Detect if call should end
        const shouldEndCall = shouldEndConversation(cleanedResponse, userInput);

        // Detect language for TTS
        const language = detectTextLanguage(cleanedResponse);

        return new NextResponse(
            generateTwiML(cleanedResponse, !shouldEndCall, language),
            { headers: { 'Content-Type': 'text/xml' } }
        );

    } catch (error) {
        console.error('[Voice Webhook Error]', error);

        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zeina" language="ar-XA">عذراً، حصل خطأ. خليني أحولك لأحد من الفريق.</Say>
  <Hangup/>
</Response>`;

        return new NextResponse(errorTwiml, {
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}

/**
 * Build the TwiML <Say> or <Play> markup for one line of speech.
 * Uses ElevenLabs (via /api/tts) for natural voices when configured,
 * routed through Twilio's own TwiML request cycle so no separate audio
 * hosting is needed — Twilio fetches the audio URL itself mid-call.
 * Falls back to Twilio's built-in Polly voices otherwise.
 */
function speakVerb(text: string, language: 'ar' | 'en'): string {
    if (isElevenLabsConfigured) {
        const audioUrl = `${BASE_URL}/api/tts?text=${encodeURIComponent(text)}&lang=${language}&gender=female`;
        return `<Play>${escapeXml(audioUrl)}</Play>`;
    }

    const escapedText = escapeXml(text);
    const pollyVoice = language === 'ar' ? 'Polly.Zeina' : 'Polly.Joanna';
    const pollyLang = language === 'ar' ? 'ar-XA' : 'en-US';
    return `<Say voice="${pollyVoice}" language="${pollyLang}">${escapedText}</Say>`;
}

/**
 * Generate TwiML response, using ElevenLabs audio when configured
 */
function generateTwiML(text: string, continueGather: boolean, language: 'ar' | 'en' = 'en'): string {
    if (continueGather) {
        const noInputText = language === 'ar' ? 'لم أسمع شيء. مع السلامة!' : "I didn't hear anything. Goodbye!";
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/voice" method="POST" language="${language === 'ar' ? 'ar-SA' : 'en-US'}">
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

/**
 * Clean text for speech synthesis
 */
function cleanForSpeech(text: string): string {
    return text
        // Remove emojis
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        // Remove markdown
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/[-*]\s/g, '')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Determine if conversation should end
 */
function shouldEndConversation(response: string, userInput: string): boolean {
    const endPhrases = [
        'goodbye', 'bye', 'مع السلامة', 'شكراً', 'thank you',
        'have a nice day', 'see you', 'thanks for calling',
    ];

    const lowerResponse = response.toLowerCase();
    const lowerInput = userInput.toLowerCase();

    // Check if response or input contains end phrases
    for (const phrase of endPhrases) {
        if (lowerResponse.includes(phrase) || lowerInput.includes(phrase)) {
            return true;
        }
    }

    return false;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * GET endpoint for webhook verification
 */
export async function GET() {
    return NextResponse.json({
        status: 'Voice webhook is active',
        elevenlabs: isElevenLabsConfigured ? 'configured' : 'not configured',
        timestamp: new Date().toISOString(),
    });
}
