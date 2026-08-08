import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { isStripeConfigured, createBillingPortalSession } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';

const PORTAL_RATE_LIMIT = 10;
const PORTAL_RATE_WINDOW_SECONDS = 60;

/**
 * POST /api/billing/portal
 * Open Stripe's hosted Billing Portal so a business can manage payment
 * methods, invoices, and cancellation themselves — no custom UI needed for
 * any of that. businessId is always resolved from the authenticated
 * caller's own account.
 */
export async function POST(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    if (!isStripeConfigured) {
        return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 });
    }

    const businessId = await resolveOwnBusinessId(request);
    if (!businessId) {
        return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(`billing-portal:${businessId}`, PORTAL_RATE_LIMIT, PORTAL_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Too many requests, please slow down' },
            { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || PORTAL_RATE_WINDOW_SECONDS) } }
        );
    }

    try {
        const businessSnap = await adminDb.collection('businesses').doc(businessId).get();
        if (!businessSnap.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const customerId = businessSnap.data()?.billing?.stripeCustomerId;
        if (!customerId) {
            return NextResponse.json(
                { error: 'No billing account yet — subscribe to a plan first' },
                { status: 400 }
            );
        }

        const { url } = await createBillingPortalSession({ customerId });
        return NextResponse.json({ url });
    } catch (error) {
        console.error('[Billing Portal Error]', error);
        return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
    }
}
