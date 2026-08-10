import { prisma } from '../db';
import type { Channel } from '@prisma/client';

export interface ConversationHistoryMessage {
    role: 'user' | 'model';
    content: string;
}

/**
 * Find (or create) the active conversation for a WhatsApp customer phone
 * number on a given business.
 */
export async function getOrCreateWhatsAppConversation(
    businessId: string,
    customerPhone: string,
    customerName?: string
): Promise<{ id: string; messages: ConversationHistoryMessage[] }> {
    const existing = await prisma.conversation.findFirst({
        where: { businessId, customerPhone, channel: 'whatsapp', status: 'active' },
        include: { messages: { orderBy: { timestamp: 'asc' }, take: -20 } },
    });

    if (existing) {
        return { id: existing.id, messages: existing.messages.map((m) => ({ role: m.role as 'user' | 'model', content: m.content })) };
    }

    const created = await prisma.conversation.create({
        data: { businessId, customerPhone, customerName, channel: 'whatsapp', status: 'active', handledBy: 'ai' },
    });
    return { id: created.id, messages: [] };
}

/** Same idea, keyed by the Meta platform sender id instead of a phone
 * number (Meta DMs/comments have no phone number). */
export async function getOrCreateMetaConversation(
    businessId: string,
    platformId: string,
    channel: Extract<Channel, 'messenger' | 'instagram_dm'>
): Promise<{ id: string; messages: ConversationHistoryMessage[] }> {
    const existing = await prisma.conversation.findFirst({
        where: { businessId, platformId, channel, status: 'active' },
        include: { messages: { orderBy: { timestamp: 'asc' }, take: -20 } },
    });

    if (existing) {
        return { id: existing.id, messages: existing.messages.map((m) => ({ role: m.role as 'user' | 'model', content: m.content })) };
    }

    const created = await prisma.conversation.create({
        data: { businessId, platformId, channel, status: 'active', handledBy: 'ai' },
    });
    return { id: created.id, messages: [] };
}

export async function saveConversationTurn(
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    lastIntent?: string,
    metadata?: { postId?: string; commentId?: string; isPublic?: boolean }
): Promise<void> {
    await prisma.$transaction([
        prisma.message.create({ data: { conversationId, role: 'user', content: userMessage } }),
        prisma.message.create({ data: { conversationId, role: 'model', content: aiResponse } }),
        prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date(), lastIntent, ...metadata },
        }),
    ]);
}
