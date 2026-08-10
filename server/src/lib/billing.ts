import type { PlanTier } from './pricing';

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

/** The subset of a Prisma Business row this needs — kept narrow so callers
 * (route handlers) don't have to pass the full row shape around. */
interface BusinessBillingInput {
    createdAt: Date;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    billingPlan: string | null;
    billingStatus: string | null;
    billingCurrentPeriodEnd: Date | null;
    billingCancelAtPeriodEnd: boolean;
}

function normalizeStripeStatus(status: string | null): BillingStatus {
    switch (status) {
        case 'active':
        case 'trialing':
            return status;
        case 'past_due':
        case 'unpaid':
            return 'past_due';
        case 'canceled':
        case 'incomplete_expired':
            return 'cancelled';
        default:
            return 'expired';
    }
}

/**
 * Resolve a business's real subscription state, OR — for a business with
 * no real Stripe subscription yet — an implicit 14-day trial computed
 * from createdAt. See the identical logic (and rationale) in the Next.js
 * app's now-removed src/lib/billing.ts.
 */
export function resolveEffectiveBilling(business: BusinessBillingInput): EffectiveBilling {
    if (business.stripeSubscriptionId) {
        return {
            plan: (business.billingPlan as PlanTier) || 'starter',
            status: normalizeStripeStatus(business.billingStatus),
            trialEndsAt: null,
            currentPeriodEnd: business.billingCurrentPeriodEnd,
            stripeCustomerId: business.stripeCustomerId,
            stripeSubscriptionId: business.stripeSubscriptionId,
            cancelAtPeriodEnd: business.billingCancelAtPeriodEnd,
        };
    }

    const trialEndsAt = new Date(business.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    return {
        plan: 'starter',
        status: new Date() < trialEndsAt ? 'trialing' : 'expired',
        trialEndsAt,
        currentPeriodEnd: null,
        stripeCustomerId: business.stripeCustomerId,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
    };
}

export function isUsageAllowed(status: BillingStatus): boolean {
    return status === 'trialing' || status === 'active' || status === 'past_due';
}
