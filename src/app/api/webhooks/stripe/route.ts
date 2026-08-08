import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { constructWebhookEvent, isStripeWebhookConfigured, fromStripeSmallestUnit, type Stripe } from '@/lib/stripe';
import { Timestamp } from 'firebase-admin/firestore';
import { reportError } from '@/lib/error-reporting';

/**
 * POST /api/webhooks/stripe
 * Syncs subscription state from Stripe into the business's Firestore doc.
 *
 * Listens to customer.subscription.* events rather than
 * checkout.session.completed — the subscription object itself carries the
 * businessId/plan metadata (set at checkout-creation time,
 * see lib/stripe.ts) plus the full current status/period/amount, so a
 * single family of events is a complete, self-sufficient source of truth
 * for the whole subscription lifecycle (created, upgraded, downgraded,
 * payment failed -> past_due, cancelled).
 */
export async function POST(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    if (!isStripeWebhookConfigured) {
        console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting all requests');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    // Must verify against the exact raw body Stripe signed.
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event: Stripe.Event;
    try {
        event = constructWebhookEvent(rawBody, signature);
    } catch (err) {
        console.warn('[Stripe Webhook] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await syncSubscription(event.data.object as Stripe.Subscription);
                break;
            default:
                // Not every event type needs handling — acknowledge and move on.
                break;
        }
    } catch (err) {
        // Still 200 — Stripe retries on non-2xx, and retrying a handler
        // error that will just fail again the same way isn't useful. The
        // error is reported below for investigation instead.
        reportError('Stripe Webhook', err, { eventType: event.type });
    }

    return NextResponse.json({ received: true });
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const businessId = subscription.metadata?.businessId;
    const plan = subscription.metadata?.plan;

    if (!businessId) {
        console.error('[Stripe Webhook] Subscription has no businessId in metadata:', subscription.id);
        return;
    }

    const item = subscription.items.data[0];
    const price = item?.price;

    const billing = {
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        stripeSubscriptionId: subscription.id,
        plan: plan || null,
        status: subscription.status,
        currentPeriodEnd: item ? Timestamp.fromMillis(item.current_period_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: price?.unit_amount != null && price.currency ? fromStripeSmallestUnit(price.unit_amount, price.currency) : null,
        currency: price?.currency ? price.currency.toUpperCase() : null,
        interval: price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
        updatedAt: Timestamp.now(),
    };

    await adminDb.collection('businesses').doc(businessId).set({ billing }, { merge: true });
    console.log(`[Stripe Webhook] Synced subscription ${subscription.id} (${subscription.status}) for business ${businessId}`);
}
