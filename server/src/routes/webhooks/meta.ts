import { Router } from 'express';
import {
    verifyWebhook,
    verifyMetaSignature,
    isMetaConfigured,
    isMetaSignatureVerificationEnabled,
    parseWebhookPayload,
    sendDirectMessage,
    replyToComment,
    sendTypingIndicator,
    type ParsedMetaMessage,
    type MetaWebhookEntry,
    type MetaCredentials,
} from '../../lib/meta';
import { getBusinessByMetaPageId } from '../../lib/business-lookup';
import { buildSystemPromptInput, buildBookingContext } from '../../lib/business-adapters';
import { generateResponse, buildSystemPrompt, detectIntent } from '../../lib/gemini';
import { getOrCreateMetaConversation, saveConversationTurn } from '../../lib/conversations';
import { checkRateLimit } from '../../lib/rate-limit';
import { resolveEffectiveBilling, isUsageAllowed } from '../../lib/billing';
import { checkAndIncrementUsage } from '../../lib/usage';
import type { PlanTier } from '../../lib/pricing';
import type { Business } from '@prisma/client';

export const metaWebhookRouter = Router();

const META_RATE_LIMIT = 20;
const META_RATE_WINDOW_SECONDS = 60;

metaWebhookRouter.get('/', (req, res) => {
    const result = verifyWebhook(
        (req.query['hub.mode'] as string) || null,
        (req.query['hub.verify_token'] as string) || null,
        (req.query['hub.challenge'] as string) || null
    );
    if (result.success) {
        res.status(200).send(result.challenge);
        return;
    }
    res.status(403).json({ error: result.error });
});

async function processMessage(message: ParsedMetaMessage, business: Business): Promise<string | null> {
    const rateLimit = await checkRateLimit(`meta-webhook:${business.id}`, META_RATE_LIMIT, META_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        return "We're getting a lot of messages right now — please try again in a minute! 🙏";
    }

    const billing = resolveEffectiveBilling(business);
    if (!isUsageAllowed(billing.status)) {
        return "We're sorry, this business's account is currently inactive. Please contact them directly.";
    }
    const usage = await checkAndIncrementUsage(business.id, billing.plan as PlanTier, business.planOverrideConversationLimit);
    if (!usage.allowed) {
        return 'Thanks for reaching out! This business has reached its monthly message limit — please try again later.';
    }

    const intent = await detectIntent(message.text);
    const channel = message.platform === 'instagram_dm' ? 'instagram_dm' : 'messenger';
    const conversation = await getOrCreateMetaConversation(business.id, message.senderId, channel);

    let systemPrompt = buildSystemPrompt(buildSystemPromptInput(business));
    systemPrompt += message.isPublic
        ? '\n\nIMPORTANT: PUBLIC comment. Keep response concise (1-2 sentences), friendly, use emojis. Add CTA like "DM us for details!"'
        : `\n\nThis is a private ${message.platform === 'instagram_dm' ? 'Instagram' : 'Messenger'} DM. Be detailed and personal.`;

    const bookingContext = buildBookingContext(business, message.senderId);
    const aiResponse = await generateResponse(systemPrompt, conversation.messages, message.text, 3, bookingContext);

    await saveConversationTurn(conversation.id, message.text, aiResponse, intent.intent, {
        postId: message.postId,
        commentId: message.commentId,
        isPublic: message.isPublic,
    });

    return aiResponse;
}

metaWebhookRouter.post('/', async (req, res) => {
    try {
        // req.rawBody is captured by the global express.json({verify}) hook
        // in index.ts — Meta signs the exact raw bytes it sent.
        const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);

        if (isMetaSignatureVerificationEnabled) {
            const signature = req.get('x-hub-signature-256') || null;
            if (!verifyMetaSignature(rawBody, signature)) {
                console.warn('[Meta] Invalid webhook signature — rejecting request');
                res.status(403).json({ error: 'Invalid signature' });
                return;
            }
        } else {
            console.warn('[Meta] META_APP_SECRET not configured — webhook signature NOT verified');
        }

        const { object, entry } = req.body as { object: string; entry: MetaWebhookEntry[] };
        if (!entry?.length) {
            res.json({ status: 'no_entries' });
            return;
        }

        for (const webhookEntry of entry) {
            const pageId = webhookEntry.id;
            const messages = parseWebhookPayload(object, [webhookEntry]);
            if (!messages.length) continue;

            for (const message of messages) {
                try {
                    const business = await getBusinessByMetaPageId(pageId);
                    if (!business) {
                        console.error('[Meta] No business found, cannot process message');
                        continue;
                    }

                    const metaCreds: MetaCredentials = {
                        accessToken: business.metaAccessToken || undefined,
                        instagramAccountId: business.metaInstagramAccountId || undefined,
                    };

                    if (!metaCreds.accessToken && !isMetaConfigured) {
                        console.error(`[Meta] Business ${business.id} has no connected Meta account — skipping message.`);
                        continue;
                    }

                    if (!message.isPublic) await sendTypingIndicator(message.senderId, 'typing_on', metaCreds.accessToken);

                    const aiResponse = await processMessage(message, business);
                    if (!aiResponse) continue;

                    if (message.isPublic && message.commentId) {
                        await replyToComment(message.commentId, aiResponse, metaCreds.accessToken);
                    } else {
                        await sendDirectMessage(message.senderId, aiResponse, message.platform === 'instagram_dm' ? 'instagram_dm' : 'messenger', metaCreds);
                    }

                    if (!message.isPublic) await sendTypingIndicator(message.senderId, 'typing_off', metaCreds.accessToken);
                } catch (e) {
                    console.error(`[Meta] Error processing ${message.senderId}:`, e);
                }
            }
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Meta Webhook Error]', e);
        res.json({ status: 'error' });
    }
});
