import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { isStripeConfigured, getOrCreateStripeCustomer, createCheckoutSession } from '@/lib/stripe';
import { PLAN_TIERS, CURRENCIES, type PlanTier, type CurrencyCode } from '@/lib/pricing';
import { checkRateLimit } from '@/lib/rate-limit';
import { Timestamp } from 'firebase-admin/firestore';
import { reportError } from '@/lib/error-reporting';

const CHECKOUT_RATE_LIMIT = 10;
const CHECKOUT_RATE_WINDOW_SECONDS = 60;

/**
 * POST /api/billing/checkout
 * Start a Stripe Checkout session to subscribe (or change) a business's
 * plan. businessId is always resolved from the authenticated caller's own
 * account — never trust a client-supplied business context for anything
 * that touches billing.
 *
 * Body: { plan: 'starter' | 'professional' | 'business', currency, interval }
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

    const rateLimit = await checkRateLimit(`billing-checkout:${businessId}`, CHECKOUT_RATE_LIMIT, CHECKOUT_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Too many requests, please slow down' },
            { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || CHECKOUT_RATE_WINDOW_SECONDS) } }
        );
    }

    try {
        const body = await request.json();
        const plan = body.plan as PlanTier;
        const currency = body.currency as CurrencyCode;
        const interval = body.interval === 'annual' ? 'annual' : 'monthly';

        if (!PLAN_TIERS.includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }
        if (!CURRENCIES.some((c) => c.code === currency)) {
            return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
        }

        const businessRef = adminDb.collection('businesses').doc(businessId);
        const businessSnap = await businessRef.get();
        if (!businessSnap.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }
        const business = businessSnap.data()!;

        const customerId = await getOrCreateStripeCustomer({
            existingCustomerId: business.billing?.stripeCustomerId,
            businessId,
            email: business.email,
            name: business.name,
        });

        // Persist the customer ID immediately so a second checkout attempt
        // (or the webhook, which arrives independently) reuses it instead
        // of creating a duplicate Stripe customer.
        if (business.billing?.stripeCustomerId !== customerId) {
            await businessRef.set(
                { billing: { stripeCustomerId: customerId, updatedAt: Timestamp.now() } },
                { merge: true }
            );
        }

        const { url } = await createCheckoutSession({ businessId, customerId, plan, currency, interval });
        if (!url) {
            return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
        }

        return NextResponse.json({ url });
    } catch (error) {
        reportError('Billing Checkout', error, { businessId });
        return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 });
    }
}
