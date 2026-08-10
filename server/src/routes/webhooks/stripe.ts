import { Router } from 'express';
import { prisma } from '../../db';
import { constructWebhookEvent, isStripeWebhookConfigured, fromStripeSmallestUnit, type Stripe } from '../../lib/stripe';

export const stripeWebhookRouter = Router();

/**
 * POST /webhooks/stripe
 * Mounted in index.ts with its own express.raw({type:'application/json'})
 * middleware, registered BEFORE the global express.json() — Stripe's
 * signature check needs the exact raw bytes, and once the global JSON
 * parser has consumed the body there's no getting them back.
 *
 * Listens to customer.subscription.* events, same rationale as the
 * Next.js app's (now-removed) equivalent: the subscription object itself
 * carries businessId/plan metadata, so this one event family is a
 * complete, self-sufficient source of truth for the whole lifecycle.
 */
stripeWebhookRouter.post('/', async (req, res) => {
    if (!isStripeWebhookConfigured) {
        console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting all requests');
        res.status(503).json({ error: 'Webhook not configured' });
        return;
    }

    const signature = req.get('stripe-signature') || null;
    let event: Stripe.Event;

    try {
        // req.body is a raw Buffer here (express.raw()), not parsed JSON.
        event = constructWebhookEvent(req.body as Buffer, signature);
    } catch (err) {
        console.warn('[Stripe Webhook] Signature verification failed:', err);
        res.status(400).json({ error: 'Invalid signature' });
        return;
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await syncSubscription(event.data.object as Stripe.Subscription);
                break;
            default:
                break;
        }
    } catch (err) {
        console.error('[Stripe Webhook] Error handling event:', event.type, err);
    }

    res.json({ received: true });
});

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const businessId = subscription.metadata?.businessId;
    const plan = subscription.metadata?.plan;

    if (!businessId) {
        console.error('[Stripe Webhook] Subscription has no businessId in metadata:', subscription.id);
        return;
    }

    const item = subscription.items.data[0];
    const price = item?.price;

    await prisma.business.update({
        where: { id: businessId },
        data: {
            stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
            stripeSubscriptionId: subscription.id,
            billingPlan: plan || null,
            billingStatus: subscription.status,
            billingCurrentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
            billingCancelAtPeriodEnd: subscription.cancel_at_period_end,
            billingAmount: price?.unit_amount != null && price.currency ? fromStripeSmallestUnit(price.unit_amount, price.currency) : null,
            billingCurrency: price?.currency ? price.currency.toUpperCase() : null,
            billingInterval: price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
        },
    });

    console.log(`[Stripe Webhook] Synced subscription ${subscription.id} (${subscription.status}) for business ${businessId}`);
}
