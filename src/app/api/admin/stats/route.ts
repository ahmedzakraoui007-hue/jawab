import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { requirePlatformAdmin } from '@/lib/auth-guard';
import { resolveEffectiveBilling, type BillingStatus } from '@/lib/billing';
import { getCurrentUsage } from '@/lib/usage';
import type { PlanTier } from '@/lib/pricing';

// Safeguard against an unbounded scan on a very large deployment — this is
// an internal admin tool, not a paginated production listing (yet).
const MAX_BUSINESSES = 200;

interface BusinessSummary {
    id: string;
    name: string;
    plan: PlanTier;
    status: BillingStatus;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    amount: number | null;
    currency: string | null;
    usage: { used: number; limit: number | null };
    whatsappNumber: string | null;
    phoneNumber: string | null;
    createdAt: string | null;
}

/**
 * GET /api/admin/stats
 * Platform-admin-only revenue/usage overview: MRR (per currency — GCC
 * currencies aren't blended into one number via a made-up FX rate),
 * subscription counts by status, and a per-business breakdown. Backs the
 * admin dashboard page.
 */
export async function GET(request: NextRequest) {
    const admin = requirePlatformAdmin(request);
    if (!admin.ok) {
        return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    try {
        const snapshot = await adminDb.collection('businesses').limit(MAX_BUSINESSES).get();

        const businesses: BusinessSummary[] = [];
        const statusCounts: Record<BillingStatus, number> = {
            trialing: 0,
            active: 0,
            past_due: 0,
            cancelled: 0,
            expired: 0,
        };
        const mrrByCurrency: Record<string, number> = {};

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const billing = resolveEffectiveBilling(data);
            statusCounts[billing.status]++;

            const usage = await getCurrentUsage(doc.id, billing.plan);

            if (billing.status === 'active' && data.billing?.amount && data.billing?.currency) {
                // data.billing.amount is whatever Stripe actually charges per
                // invoice — the FULL YEARLY total for annual subscriptions
                // (see lib/stripe.ts's createCheckoutSession), so it has to
                // be divided by 12 to get a comparable monthly figure.
                const monthlyAmount = data.billing.interval === 'annual'
                    ? data.billing.amount / 12
                    : data.billing.amount;
                mrrByCurrency[data.billing.currency] = (mrrByCurrency[data.billing.currency] || 0) + monthlyAmount;
            }

            businesses.push({
                id: doc.id,
                name: data.name || 'Unnamed business',
                plan: billing.plan,
                status: billing.status,
                trialEndsAt: billing.trialEndsAt?.toISOString() || null,
                currentPeriodEnd: billing.currentPeriodEnd?.toISOString() || null,
                amount: data.billing?.amount ?? null,
                currency: data.billing?.currency ?? null,
                usage: { used: usage.used, limit: Number.isFinite(usage.limit) ? usage.limit : null },
                whatsappNumber: data.whatsappNumber?.number || null,
                phoneNumber: data.phoneNumber?.number || null,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            });
        }

        return NextResponse.json({
            totalBusinesses: businesses.length,
            statusCounts,
            mrrByCurrency,
            businesses: businesses.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).reverse(),
        });
    } catch (error) {
        console.error('[Admin Stats Error]', error);
        return NextResponse.json({ error: 'Failed to load admin stats' }, { status: 500 });
    }
}
