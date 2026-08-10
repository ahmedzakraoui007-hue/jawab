import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { resolveOwnBusinessId } from '../lib/auth-guard';
import { isStripeConfigured, getOrCreateStripeCustomer, createCheckoutSession, createBillingPortalSession } from '../lib/stripe';
import { resolveEffectiveBilling } from '../lib/billing';
import { getCurrentUsage } from '../lib/usage';
import { PLAN_TIERS, CURRENCIES, getPlanPrice, type PlanTier, type CurrencyCode } from '../lib/pricing';
import { checkRateLimit } from '../lib/rate-limit';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

export const billingRouter = Router();

const CHECKOUT_RATE_LIMIT = 10;
const PORTAL_RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;

const checkoutSchema = z.object({
    plan: z.enum(PLAN_TIERS),
    currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]),
    interval: z.enum(['monthly', 'annual']).default('monthly'),
});

billingRouter.post('/checkout', requireAuth, asyncHandler(async (req, res) => {
    if (!isStripeConfigured) {
        res.status(503).json({ error: 'Billing is not configured yet' });
        return;
    }

    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const rateLimit = await checkRateLimit(`billing-checkout:${businessId}`, CHECKOUT_RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || RATE_WINDOW_SECONDS));
        res.status(429).json({ error: 'Too many requests, please slow down' });
        return;
    }

    const { plan, currency, interval } = checkoutSchema.parse(req.body);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    const customerId = await getOrCreateStripeCustomer({
        existingCustomerId: business.stripeCustomerId,
        businessId,
        name: business.name,
    });

    if (business.stripeCustomerId !== customerId) {
        await prisma.business.update({ where: { id: businessId }, data: { stripeCustomerId: customerId } });
    }

    const monthlyEquivalentAmount = getPlanPrice(plan as PlanTier, currency as CurrencyCode, interval);
    const { url } = await createCheckoutSession({
        businessId,
        customerId,
        plan: plan as PlanTier,
        currency: currency as CurrencyCode,
        interval,
        monthlyEquivalentAmount,
    });

    if (!url) {
        res.status(500).json({ error: 'Failed to create checkout session' });
        return;
    }
    res.json({ url });
}));

billingRouter.post('/portal', requireAuth, asyncHandler(async (req, res) => {
    if (!isStripeConfigured) {
        res.status(503).json({ error: 'Billing is not configured yet' });
        return;
    }

    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const rateLimit = await checkRateLimit(`billing-portal:${businessId}`, PORTAL_RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || RATE_WINDOW_SECONDS));
        res.status(429).json({ error: 'Too many requests, please slow down' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business?.stripeCustomerId) {
        res.status(400).json({ error: 'No billing account yet — subscribe to a plan first' });
        return;
    }

    const { url } = await createBillingPortalSession({ customerId: business.stripeCustomerId });
    res.json({ url });
}));

billingRouter.get('/status', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    const billing = resolveEffectiveBilling(business);
    const usage = await getCurrentUsage(businessId, billing.plan, business.planOverrideConversationLimit);

    res.json({
        plan: billing.plan,
        status: billing.status,
        trialEndsAt: billing.trialEndsAt?.toISOString() || null,
        currentPeriodEnd: billing.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
        hasStripeCustomer: !!billing.stripeCustomerId,
        usage: { used: usage.used, limit: Number.isFinite(usage.limit) ? usage.limit : null },
    });
}));
