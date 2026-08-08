import type { PlanTier } from '@/lib/pricing';

export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface EffectiveBilling {
    plan: PlanTier;
    status: BillingStatus;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    cancelAtPeriodEnd: boolean;
}

const TRIAL_DAYS = 14;

interface FirestoreTimestampLike {
    toDate: () => Date;
}

interface BusinessBillingInput {
    createdAt?: FirestoreTimestampLike | Date | string | null;
    billing?: {
        plan?: string;
        status?: string;
        currentPeriodEnd?: FirestoreTimestampLike | null;
        stripeCustomerId?: string | null;
        stripeSubscriptionId?: string | null;
        cancelAtPeriodEnd?: boolean;
    } | null;
}

function toDate(value: FirestoreTimestampLike | Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    if (typeof (value as FirestoreTimestampLike).toDate === 'function') {
        return (value as FirestoreTimestampLike).toDate();
    }
    return null;
}

function normalizeStripeStatus(status?: string): BillingStatus {
    switch (status) {
        case 'active':
        case 'trialing':
            return status;
        case 'past_due':
        case 'unpaid':
            // Grace period: Stripe retries failed payments on its own
            // schedule. Don't cut a business off on the first failure —
            // only once the subscription is truly cancelled/expired.
            return 'past_due';
        case 'canceled':
        case 'incomplete_expired':
            return 'cancelled';
        default:
            return 'expired';
    }
}

/**
 * Resolve a business's real subscription state, OR — for a business that's
 * never actually subscribed (no business.billing.stripeSubscriptionId at
 * all) — an implicit 14-day trial computed from createdAt. This means a
 * business never needs an explicit "trial" write at signup: the absence of
 * a real subscription up to`TRIAL_DAYS` after creation simply reads as
 * trialing, and reads as expired after.
 */
export function resolveEffectiveBilling(business: BusinessBillingInput): EffectiveBilling {
    const billing = business.billing;

    if (billing?.stripeSubscriptionId) {
        return {
            plan: (billing.plan as PlanTier) || 'starter',
            status: normalizeStripeStatus(billing.status),
            trialEndsAt: null,
            currentPeriodEnd: toDate(billing.currentPeriodEnd),
            stripeCustomerId: billing.stripeCustomerId || null,
            stripeSubscriptionId: billing.stripeSubscriptionId,
            cancelAtPeriodEnd: !!billing.cancelAtPeriodEnd,
        };
    }

    const createdAtDate = toDate(business.createdAt) || new Date();
    const trialEndsAt = new Date(createdAtDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    return {
        plan: 'starter',
        status: new Date() < trialEndsAt ? 'trialing' : 'expired',
        trialEndsAt,
        currentPeriodEnd: null,
        stripeCustomerId: billing?.stripeCustomerId || null,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
    };
}

/** Whether a business in this status should still get AI responses/bookings. */
export function isUsageAllowed(status: BillingStatus): boolean {
    return status === 'trialing' || status === 'active' || status === 'past_due';
}
