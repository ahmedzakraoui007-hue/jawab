import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { resolveEffectiveBilling } from '@/lib/billing';
import { getCurrentUsage } from '@/lib/usage';

/**
 * GET /api/billing/status
 * Everything the dashboard needs to render plan/usage/trial state, in one
 * call — used by both the billing settings page and the upgrade banner.
 */
export async function GET(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const businessId = await resolveOwnBusinessId(request);
    if (!businessId) {
        return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
    }

    try {
        const businessSnap = await adminDb.collection('businesses').doc(businessId).get();
        if (!businessSnap.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const business = businessSnap.data()!;
        const billing = resolveEffectiveBilling(business);
        const usage = await getCurrentUsage(businessId, billing.plan, business);

        return NextResponse.json({
            plan: billing.plan,
            status: billing.status,
            trialEndsAt: billing.trialEndsAt?.toISOString() || null,
            currentPeriodEnd: billing.currentPeriodEnd?.toISOString() || null,
            cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
            hasStripeCustomer: !!billing.stripeCustomerId,
            usage: {
                used: usage.used,
                limit: Number.isFinite(usage.limit) ? usage.limit : null,
            },
        });
    } catch (error) {
        console.error('[Billing Status Error]', error);
        return NextResponse.json({ error: 'Failed to load billing status' }, { status: 500 });
    }
}
