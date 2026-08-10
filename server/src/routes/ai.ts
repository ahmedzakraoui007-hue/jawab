import { Router } from 'express';
import { prisma } from '../db';
import { generateResponse, buildSystemPrompt, detectIntent } from '../lib/gemini';
import { buildSystemPromptInput, buildBookingContext } from '../lib/business-adapters';
import { resolveOwnBusinessId } from '../lib/auth-guard';
import { resolveEffectiveBilling, isUsageAllowed } from '../lib/billing';
import { checkAndIncrementUsage } from '../lib/usage';
import { checkRateLimit } from '../lib/rate-limit';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import type { PlanTier } from '../lib/pricing';

export const aiRouter = Router();

const AI_RATE_LIMIT = 30;
const AI_RATE_WINDOW_SECONDS = 60;

/**
 * Dashboard "test your AI" endpoint. businessId is always resolved
 * server-side from the authenticated caller's own account.
 */
aiRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const rateLimit = await checkRateLimit(`ai:${businessId}`, AI_RATE_LIMIT, AI_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || AI_RATE_WINDOW_SECONDS));
        res.status(429).json({ error: 'Too many requests, please slow down' });
        return;
    }

    const { message, conversationId, customerPhone } = req.body;
    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    const billing = resolveEffectiveBilling(business);
    if (!isUsageAllowed(billing.status)) {
        res.status(402).json({
            success: false,
            error: { code: 'BILLING_INACTIVE', message: `Your account is currently ${billing.status}. Please check your billing settings.` },
        });
        return;
    }
    const usage = await checkAndIncrementUsage(businessId, billing.plan as PlanTier, business.planOverrideConversationLimit);
    if (!usage.allowed) {
        res.status(402).json({
            success: false,
            error: { code: 'USAGE_LIMIT_REACHED', message: `You've reached your plan's monthly conversation limit (${usage.limit}). Upgrade to continue.` },
        });
        return;
    }

    // A dedicated test conversation, separate from real customer
    // conversations (keyed by a synthetic phone, not tied to any channel).
    let conversation = conversationId
        ? await prisma.conversation.findFirst({
            where: { id: conversationId, businessId },
            include: { messages: { orderBy: { timestamp: 'asc' } } },
        })
        : null;

    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                businessId,
                customerPhone: customerPhone || 'test-customer',
                channel: 'whatsapp',
                status: 'active',
                handledBy: 'ai',
            },
            include: { messages: true },
        });
    }

    const intent = await detectIntent(message);
    const systemPrompt = buildSystemPrompt(buildSystemPromptInput(business));
    const bookingContext = buildBookingContext(business, customerPhone || 'test-customer');
    const history = conversation.messages.map((m) => ({ role: m.role as 'user' | 'model', content: m.content }));

    const startTime = Date.now();
    const response = await generateResponse(systemPrompt, history, message, 3, bookingContext);
    const processingTime = Date.now() - startTime;

    await prisma.$transaction([
        prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: message } }),
        prisma.message.create({ data: { conversationId: conversation.id, role: 'model', content: response } }),
        prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), lastIntent: intent.intent } }),
    ]);

    res.json({
        success: true,
        data: {
            response,
            conversationId: conversation.id,
            intent: intent.intent,
            confidence: intent.confidence,
            processingTimeMs: processingTime,
        },
    });
}));

aiRouter.get('/', (_req, res) => {
    res.json({ status: 'AI API is active', model: 'gemini-2.0-flash', capabilities: ['chat', 'intent-detection', 'multilingual'] });
});
