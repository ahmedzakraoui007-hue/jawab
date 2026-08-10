import { Router } from 'express';
import { prisma } from '../db';
import { sendWhatsAppMessage, formatWhatsAppNumber, isTwilioConfigured } from '../lib/twilio';
import { sendDirectMessage, replyToComment, isMetaConfigured, type MetaCredentials } from '../lib/meta';
import { resolveOwnBusinessId } from '../lib/auth-guard';
import { checkRateLimit } from '../lib/rate-limit';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

export const sendRouter = Router();

const SEND_RATE_LIMIT = 30;
const SEND_RATE_WINDOW_SECONDS = 60;

/**
 * POST /send/whatsapp — human takeover. conversationId is required, and
 * the recipient phone number is read from that conversation record
 * itself, never trusted from the request body — a signed-in user can
 * only ever message customers within their own business's conversations.
 */
sendRouter.post('/whatsapp', requireAuth, asyncHandler(async (req, res) => {
    if (!isTwilioConfigured) {
        res.status(503).json({ error: 'Twilio is not configured' });
        return;
    }

    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const rateLimit = await checkRateLimit(`whatsapp-send:${businessId}`, SEND_RATE_LIMIT, SEND_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || SEND_RATE_WINDOW_SECONDS));
        res.status(429).json({ error: 'Too many requests, please slow down' });
        return;
    }

    const { conversationId, message, mediaUrl } = req.body;
    if (!message || !conversationId) {
        res.status(400).json({ error: 'Missing required fields: conversationId, message' });
        return;
    }

    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, businessId } });
    if (!conversation?.customerPhone) {
        res.status(404).json({ error: 'Conversation not found or has no customer phone number' });
        return;
    }

    const result = await sendWhatsAppMessage({
        to: formatWhatsAppNumber(conversation.customerPhone),
        body: message,
        mediaUrl: mediaUrl ? [mediaUrl] : undefined,
    });

    if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
    }

    await prisma.$transaction([
        prisma.message.create({ data: { conversationId, role: 'model', content: message } }),
        prisma.conversation.update({ where: { id: conversationId }, data: { handledBy: 'human', lastMessageAt: new Date() } }),
    ]);

    res.json({ success: true, messageSid: result.messageSid });
}));

/**
 * POST /send/meta — human takeover for Messenger/Instagram, using the
 * caller's own business's stored Meta credentials, never a global token
 * for someone else's Page.
 */
sendRouter.post('/meta', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const rateLimit = await checkRateLimit(`meta-send:${businessId}`, SEND_RATE_LIMIT, SEND_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || SEND_RATE_WINDOW_SECONDS));
        res.status(429).json({ error: 'Too many requests, please slow down' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    const metaCreds: MetaCredentials = {
        accessToken: business.metaAccessToken || undefined,
        instagramAccountId: business.metaInstagramAccountId || undefined,
    };

    if (!metaCreds.accessToken && !isMetaConfigured) {
        res.status(503).json({ error: 'Meta is not connected for this business' });
        return;
    }

    const { recipientId, message, platform, commentId } = req.body;
    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    if (commentId) {
        const result = await replyToComment(commentId, message, metaCreds.accessToken);
        if (!result.success) {
            res.status(500).json({ error: result.error });
            return;
        }
        res.json({ success: true, type: 'comment_reply', commentId: result.commentId });
        return;
    }

    if (!recipientId) {
        res.status(400).json({ error: 'recipientId is required for DMs' });
        return;
    }

    const result = await sendDirectMessage(recipientId, message, platform || 'messenger', metaCreds);
    if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
    }
    res.json({ success: true, type: 'direct_message', platform: platform || 'messenger', messageId: result.messageId });
}));
