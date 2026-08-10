import { prisma } from '../db';
import type { Business } from '@prisma/client';

/** Multi-tenant routing: find the business a WhatsApp number belongs to.
 * Refuses to guess — an unmatched number returns null rather than falling
 * back to any business, which would let anyone burn an arbitrary
 * business's AI/messaging budget with zero authentication. */
export async function getBusinessByWhatsAppNumber(cleanNumber: string): Promise<Business | null> {
    return prisma.business.findFirst({
        where: { whatsappNumber: { path: ['number'], equals: cleanNumber } },
    });
}

export async function getBusinessByVoiceNumber(phoneNumber: string): Promise<Business | null> {
    return prisma.business.findFirst({
        where: { phoneNumber: { path: ['number'], equals: phoneNumber } },
    });
}

export async function getBusinessByMetaPageId(pageId: string): Promise<Business | null> {
    const byPage = await prisma.business.findFirst({ where: { metaPageId: pageId } });
    if (byPage) return byPage;
    return prisma.business.findFirst({ where: { metaInstagramAccountId: pageId } });
}
