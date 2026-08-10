import { prisma } from '../db';
import type { PlanTier } from './pricing';
import { getConversationLimit, type LimitSource } from './plan-limits';

export interface UsageCheckResult {
    allowed: boolean;
    used: number;
    limit: number;
    limitSource: LimitSource;
}

function currentPeriodKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Atomically check-and-increment a business's conversation-turn usage for
 * the current calendar month, against its plan's quota. Checked BEFORE
 * calling Gemini, so an over-quota business doesn't cost anything on top
 * of being refused.
 */
export async function checkAndIncrementUsage(
    businessId: string,
    plan: PlanTier,
    planOverride?: unknown
): Promise<UsageCheckResult> {
    const { limit, source } = await getConversationLimit(plan, planOverride);

    if (!Number.isFinite(limit)) {
        return { allowed: true, used: 0, limit, limitSource: source };
    }

    const period = currentPeriodKey();

    try {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.usage.findUnique({ where: { businessId_period: { businessId, period } } });
            const used = existing?.conversationCount ?? 0;

            if (used >= limit) {
                return { allowed: false, used, limit, limitSource: source };
            }

            if (existing) {
                await tx.usage.update({ where: { id: existing.id }, data: { conversationCount: { increment: 1 } } });
            } else {
                await tx.usage.create({ data: { businessId, period, conversationCount: 1 } });
            }

            return { allowed: true, used: used + 1, limit, limitSource: source };
        });
    } catch (err) {
        console.error('[usage] checkAndIncrementUsage failed, failing open:', err);
        return { allowed: true, used: 0, limit, limitSource: source };
    }
}

export async function getCurrentUsage(
    businessId: string,
    plan: PlanTier,
    planOverride?: unknown
): Promise<UsageCheckResult> {
    const { limit, source } = await getConversationLimit(plan, planOverride);
    const period = currentPeriodKey();

    try {
        const existing = await prisma.usage.findUnique({ where: { businessId_period: { businessId, period } } });
        const used = existing?.conversationCount ?? 0;
        return { allowed: !Number.isFinite(limit) || used < limit, used, limit, limitSource: source };
    } catch (err) {
        console.error('[usage] getCurrentUsage failed:', err);
        return { allowed: true, used: 0, limit, limitSource: source };
    }
}
