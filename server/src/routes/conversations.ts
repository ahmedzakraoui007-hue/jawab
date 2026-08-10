import { Router } from 'express';
import { prisma } from '../db';
import { resolveOwnBusinessId } from '../lib/auth-guard';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

export const conversationsRouter = Router();

/**
 * GET /conversations?status=active
 * List the caller's own business's conversations, most recent first.
 */
conversationsRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const status = req.query.status as string | undefined;
    const limitParam = parseInt((req.query.limit as string) || '100', 10);

    const conversations = await prisma.conversation.findMany({
        where: { businessId, ...(status ? { status: status as never } : {}) },
        orderBy: { lastMessageAt: 'desc' },
        take: Math.min(limitParam, 100),
        // Last message only — a full history per row would be wasteful for
        // a list view; use GET /conversations/:id for the full thread.
        include: { messages: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });

    res.json({
        conversations: conversations.map((c) => ({
            ...c,
            lastMessage: c.messages[0]?.content || null,
            messages: undefined,
        })),
    });
}));

/**
 * GET /conversations/:id — full conversation including its messages.
 * Only returns it if the conversation actually belongs to the caller's
 * own business.
 */
conversationsRouter.get('/:id', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, businessId },
        include: { messages: { orderBy: { timestamp: 'asc' } } },
    });

    if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    res.json({ conversation });
}));
