import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',')[0].trim();

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

type PlanTier = 'starter' | 'professional' | 'business';
type CurrencyCode = 'AED' | 'SAR' | 'QAR' | 'KWD' | 'BHD' | 'OMR';

const PLAN_DISPLAY_NAME: Record<PlanTier, string> = {
    starter: 'Jawab Starter',
    professional: 'Jawab Professional',
    business: 'Jawab Business',
};

// Stripe expects amounts in the currency's smallest unit. AED/SAR/QAR are
// 2-decimal (x100); Stripe documents BHD/KWD/OMR as three-decimal
// currencies (fils), needing x1000.
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'KWD', 'OMR']);

function toStripeSmallestUnit(amount: number, currency: CurrencyCode): number {
    const multiplier = THREE_DECIMAL_CURRENCIES.has(currency) ? 1000 : 100;
    return Math.round(amount * multiplier);
}

export function fromStripeSmallestUnit(amount: number, currency: string): number {
    const multiplier = THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1000 : 100;
    return amount / multiplier;
}

export async function getOrCreateStripeCustomer(params: {
    existingCustomerId?: string | null;
    businessId: string;
    email?: string;
    name?: string;
}): Promise<string> {
    const stripe = getStripeClient();
    if (params.existingCustomerId) return params.existingCustomerId;

    const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: { businessId: params.businessId },
    });
    return customer.id;
}

/**
 * Prices are built inline via price_data rather than pre-created Stripe
 * Price objects — see the identical rationale in the Next.js app's
 * (now-removed) src/lib/stripe.ts. `monthlyEquivalentAmount` is the
 * already-resolved face-value price for this plan/currency/interval —
 * the caller (routes/billing.ts) looks it up, this module only knows
 * about Stripe's API shape, not this app's pricing table.
 */
export async function createCheckoutSession(params: {
    businessId: string;
    customerId: string;
    plan: PlanTier;
    currency: CurrencyCode;
    interval: 'monthly' | 'annual';
    monthlyEquivalentAmount: number;
}): Promise<{ url: string | null }> {
    const stripe = getStripeClient();

    const amount = params.interval === 'annual' ? params.monthlyEquivalentAmount * 12 : params.monthlyEquivalentAmount;

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
        success_url: `${FRONTEND_ORIGIN}/dashboard/settings/billing?checkout=success`,
        cancel_url: `${FRONTEND_ORIGIN}/dashboard/settings/billing?checkout=cancelled`,
    });

    return { url: session.url };
}

export async function createBillingPortalSession(params: { customerId: string }): Promise<{ url: string }> {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: `${FRONTEND_ORIGIN}/dashboard/settings/billing`,
    });
    return { url: session.url };
}

export function constructWebhookEvent(rawBody: string | Buffer, signature: string | null): Stripe.Event {
    if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    if (!signature) throw new Error('Missing Stripe-Signature header.');
    const stripe = getStripeClient();
    return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

export type { Stripe };
export type { PlanTier, CurrencyCode };
