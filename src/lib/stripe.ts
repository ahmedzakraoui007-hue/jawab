import Stripe from 'stripe';
import { getAppUrl } from '@/lib/utils';
import { getPlanPrice, type CurrencyCode, type PlanTier } from '@/lib/pricing';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const isStripeConfigured = Boolean(STRIPE_SECRET_KEY);
export const isStripeWebhookConfigured = Boolean(STRIPE_WEBHOOK_SECRET);

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
    if (!STRIPE_SECRET_KEY) {
        throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.');
    }
    if (!stripeClient) {
        stripeClient = new Stripe(STRIPE_SECRET_KEY);
    }
    return stripeClient;
}

// Stripe expects amounts in the currency's smallest unit. Most currencies
// (AED, SAR, QAR here) use 2 decimal places, so x100 — but Stripe documents
// BHD, KWD, and OMR as three-decimal currencies (fils), needing x1000. Using
// the wrong multiplier would silently charge 1/10th (or 10x) the intended
// amount for those three GCC currencies specifically.
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'KWD', 'OMR']);

function toStripeSmallestUnit(amount: number, currency: CurrencyCode): number {
    const multiplier = THREE_DECIMAL_CURRENCIES.has(currency) ? 1000 : 100;
    return Math.round(amount * multiplier);
}

/** Inverse of toStripeSmallestUnit — for reading amounts back out of Stripe
 * subscription/invoice objects into face-value currency amounts. */
export function fromStripeSmallestUnit(amount: number, currency: string): number {
    const multiplier = THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1000 : 100;
    return amount / multiplier;
}

const PLAN_DISPLAY_NAME: Record<PlanTier, string> = {
    starter: 'Jawab Starter',
    professional: 'Jawab Professional',
    business: 'Jawab Business',
};

/**
 * Create (or reuse) a Stripe Customer for a business. We store the
 * resulting customer ID on the business doc so repeat checkouts/portal
 * sessions don't create duplicate Stripe customers.
 */
export async function getOrCreateStripeCustomer(params: {
    existingCustomerId?: string | null;
    businessId: string;
    email?: string;
    name?: string;
}): Promise<string> {
    const stripe = getStripeClient();

    if (params.existingCustomerId) {
        return params.existingCustomerId;
    }

    const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: { businessId: params.businessId },
    });

    return customer.id;
}

/**
 * Create a Stripe Checkout Session for a subscription.
 *
 * Prices are built inline via `price_data` rather than referencing
 * pre-created Stripe Price objects — there are 36 plan/currency/interval
 * combinations (3 tiers x 6 GCC currencies x 2 intervals), and price_data
 * lets this stay a single source of truth (src/lib/pricing.ts) instead of
 * needing 36 manually-created, manually-kept-in-sync Price objects in the
 * Stripe dashboard.
 */
export async function createCheckoutSession(params: {
    businessId: string;
    customerId: string;
    plan: PlanTier;
    currency: CurrencyCode;
    interval: 'monthly' | 'annual';
}): Promise<{ url: string | null }> {
    const stripe = getStripeClient();
    const appUrl = getAppUrl();

    // PLAN_PRICING's "annual" figure is the discounted MONTHLY-equivalent
    // rate shown in the UI (e.g. "719/mo billed annually"), but Stripe's
    // interval: 'year' price is charged once per year — so the actual
    // Stripe unit_amount for annual billing is that monthly figure x 12.
    const monthlyEquivalent = getPlanPrice(params.plan, params.currency, params.interval);
    if (!Number.isFinite(monthlyEquivalent)) {
        throw new Error(`Plan "${params.plan}" is not available for self-serve checkout.`);
    }
    const amount = params.interval === 'annual' ? monthlyEquivalent * 12 : monthlyEquivalent;

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: params.customerId,
        line_items: [
            {
                price_data: {
                    currency: params.currency.toLowerCase(),
                    unit_amount: toStripeSmallestUnit(amount, params.currency),
                    recurring: { interval: params.interval === 'annual' ? 'year' : 'month' },
                    product_data: { name: PLAN_DISPLAY_NAME[params.plan] },
                },
                quantity: 1,
            },
        ],
        subscription_data: {
            metadata: { businessId: params.businessId, plan: params.plan },
        },
        metadata: { businessId: params.businessId, plan: params.plan },
        success_url: `${appUrl}/dashboard/settings/billing?checkout=success`,
        cancel_url: `${appUrl}/dashboard/settings/billing?checkout=cancelled`,
    });

    return { url: session.url };
}

/**
 * Create a Stripe Billing Portal session so a business can manage or
 * cancel their own subscription without a custom-built UI for it.
 */
export async function createBillingPortalSession(params: {
    customerId: string;
}): Promise<{ url: string }> {
    const stripe = getStripeClient();
    const appUrl = getAppUrl();

    const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: `${appUrl}/dashboard/settings/billing`,
    });

    return { url: session.url };
}

/**
 * Verify and parse an incoming Stripe webhook event. Must run against the
 * raw request body — Stripe signs the exact bytes it sent, so re-serializing
 * parsed JSON would never match.
 */
export function constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
    if (!STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }
    if (!signature) {
        throw new Error('Missing Stripe-Signature header.');
    }
    const stripe = getStripeClient();
    return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

export type { Stripe };
