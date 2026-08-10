import { Router } from 'express';
import { parseWhatsAppWebhook, buildTwiMLResponse, isTwilioConfigured, verifyTwilioRequest } from '../../lib/twilio';
import { getBusinessByWhatsAppNumber } from '../../lib/business-lookup';
import { buildSystemPromptInput, buildBookingContext } from '../../lib/business-adapters';
import { generateResponse, buildSystemPrompt, detectIntent } from '../../lib/gemini';
import { getOrCreateWhatsAppConversation, saveConversationTurn } from '../../lib/conversations';
import { checkRateLimit } from '../../lib/rate-limit';
import { resolveEffectiveBilling, isUsageAllowed } from '../../lib/billing';
import { checkAndIncrementUsage } from '../../lib/usage';
import type { PlanTier } from '../../lib/pricing';
import { asyncHandler } from '../../middleware/error-handler';

export const whatsappWebhookRouter = Router();

const WHATSAPP_RATE_LIMIT = 20;
const WHATSAPP_RATE_WINDOW_SECONDS = 60;

function xml(res: import('express').Response, body: string) {
    res.set('Content-Type', 'text/xml').send(body);
}

whatsappWebhookRouter.post('/', asyncHandler(async (req, res) => {
    // req.body is populated by express.urlencoded() (mounted globally —
    // see index.ts). Twilio signs these exact parsed form fields.
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.body)) {
        params[key] = String(value);
    }

    if (isTwilioConfigured) {
        if (!verifyTwilioRequest(req, params)) {
            console.warn('[WhatsApp] Invalid Twilio signature — rejecting request');
            res.status(403).json({ error: 'Invalid signature' });
            return;
        }
    } else {
        console.warn('[WhatsApp] Twilio not configured — signature NOT verified');
    }

    const incoming = parseWhatsAppWebhook(params);
    console.log(`[WhatsApp] From: ${incoming.from}, Message: "${incoming.body}"`);

    if (!incoming.from || !incoming.body) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const toNumber = incoming.to.replace('whatsapp:', '');
    const business = await getBusinessByWhatsAppNumber(toNumber);

    if (!business) {
        console.error('[WhatsApp] No business found, cannot process message');
        xml(res, buildTwiMLResponse("I'm sorry, we're not set up yet. Please try again later."));
        return;
    }

    const rateLimit = await checkRateLimit(`whatsapp-webhook:${business.id}`, WHATSAPP_RATE_LIMIT, WHATSAPP_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        xml(res, buildTwiMLResponse("We're getting a lot of messages right now — please try again in a minute! 🙏"));
        return;
    }

    const billing = resolveEffectiveBilling(business);
    if (!isUsageAllowed(billing.status)) {
        xml(res, buildTwiMLResponse("We're sorry, this business's Jawab account is currently inactive. Please contact them directly."));
        return;
    }
    const usage = await checkAndIncrementUsage(business.id, billing.plan as PlanTier, business.planOverrideConversationLimit);
    if (!usage.allowed) {
        xml(res, buildTwiMLResponse('Thanks for reaching out! This business has reached its monthly message limit — please try again later or contact them directly.'));
        return;
    }

    const intent = await detectIntent(incoming.body);
    const conversation = await getOrCreateWhatsAppConversation(business.id, incoming.from, incoming.profileName);
    const systemPrompt = buildSystemPrompt(buildSystemPromptInput(business));
    const bookingContext = buildBookingContext(business, incoming.from);

    const aiResponse = await generateResponse(systemPrompt, conversation.messages, incoming.body, 3, bookingContext);
    await saveConversationTurn(conversation.id, incoming.body, aiResponse, intent.intent);

    xml(res, buildTwiMLResponse(aiResponse));
}));

whatsappWebhookRouter.get('/', (_req, res) => {
    res.json({ status: 'WhatsApp webhook is active', configured: isTwilioConfigured });
});
