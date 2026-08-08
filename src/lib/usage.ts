import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { PLAN_CONVERSATION_LIMITS, type PlanTier } from '@/lib/pricing';

export interface UsageCheckResult {
    allowed: boolean;
    used: number;
    limit: number;
}

function currentPeriodKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Atomically check-and-increment a business's conversation-turn usage for
 * the current calendar month, against its plan's quota. Called once per
 * inbound customer message that would trigger an AI response, from all
 * four channels (WhatsApp, Voice, Meta, dashboard test) — checked BEFORE
 * calling Gemini, so a business that's over quota doesn't just get told
 * "no" after we've already paid for the model call.
 *
 * "Conversation" here means one customer message-turn, matching the
 * marketing page's "N Conversations/mo" framing loosely (a full back-and-forth
 * booking conversation is several turns, each counted) — see
 * src/lib/pricing.ts's PLAN_CONVERSATION_LIMITS doc comment.
 */
export async function checkAndIncrementUsage(
    businessId: string,
    plan: PlanTier
): Promise<UsageCheckResult> {
    const limit = PLAN_CONVERSATION_LIMITS[plan];

    // Unlimited plan — skip the transaction/read entirely.
    if (!Number.isFinite(limit)) {
        return { allowed: true, used: 0, limit };
    }

    const period = currentPeriodKey();
    const ref = adminDb
        .collection('businesses')
        .doc(businessId)
        .collection('usage')
        .doc(period);

    try {
        return await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const used = snap.exists ? (snap.data()?.conversationCount as number) || 0 : 0;

            if (used >= limit) {
                return { allowed: false, used, limit };
            }

            if (snap.exists) {
                tx.update(ref, { conversationCount: FieldValue.increment(1), updatedAt: Timestamp.now() });
            } else {
                tx.set(ref, { period, conversationCount: 1, updatedAt: Timestamp.now() });
            }

            return { allowed: true, used: used + 1, limit };
        });
    } catch (err) {
        console.error('[usage] checkAndIncrementUsage failed, failing open:', err);
        // Same philosophy as rate-limit.ts: a usage-tracking outage should
        // never be the reason a real customer gets refused service.
        return { allowed: true, used: 0, limit };
    }
}

/** Read-only usage lookup for the dashboard/admin views — does not increment. */
export async function getCurrentUsage(businessId: string, plan: PlanTier): Promise<UsageCheckResult> {
    const limit = PLAN_CONVERSATION_LIMITS[plan];
    const period = currentPeriodKey();

    try {
        const snap = await adminDb
            .collection('businesses')
            .doc(businessId)
            .collection('usage')
            .doc(period)
            .get();

        const used = snap.exists ? (snap.data()?.conversationCount as number) || 0 : 0;
        return { allowed: !Number.isFinite(limit) || used < limit, used, limit };
    } catch (err) {
        console.error('[usage] getCurrentUsage failed:', err);
        return { allowed: true, used: 0, limit };
    }
}
