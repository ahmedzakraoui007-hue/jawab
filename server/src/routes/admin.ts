import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { requirePlatformAdmin } from '../lib/auth-guard';
import { resolveEffectiveBilling, type BillingStatus } from '../lib/billing';
import { getCurrentUsage } from '../lib/usage';
import { getPlatformOverrides, setPlatformOverrides, sanitizeOverrides } from '../lib/plan-limits';
import { PLAN_CONVERSATION_LIMITS, PLAN_TIERS, type PlanTier } from '../lib/pricing';
import { asyncHandler } from '../middleware/error-handler';

export const adminRouter = Router();

// Every admin route requires both a valid session and the ADMIN_EMAILS
// allowlist check.
adminRouter.use(requireAuth, requirePlatformAdmin);

const MAX_BUSINESSES = 200;

const numberSchema = z.object({
    businessId: z.string().min(1),
    type: z.enum(['whatsapp', 'phone']),
    number: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Number must be in E.164 format (e.g., +14155238886)'),
    sid: z.string().optional(),
});

adminRouter.post('/numbers', asyncHandler(async (req, res) => {
    const { businessId, type, number, sid } = numberSchema.parse(req.body);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    const assignment = { number, sid: sid || null, assignedAt: new Date().toISOString(), assignedBy: req.userId };
    const field = type === 'whatsapp' ? 'whatsappNumber' : 'phoneNumber';

    await prisma.business.update({ where: { id: businessId }, data: { [field]: assignment } });

    res.json({ success: true, businessId, type, number, message: `${type === 'whatsapp' ? 'WhatsApp' : 'Phone'} number assigned successfully` });
}));

const removeNumberSchema = z.object({ businessId: z.string().min(1), type: z.enum(['whatsapp', 'phone']) });

adminRouter.delete('/numbers', asyncHandler(async (req, res) => {
    const { businessId, type } = removeNumberSchema.parse(req.body);
    const field = type === 'whatsapp' ? 'whatsappNumber' : 'phoneNumber';

    await prisma.business.update({ where: { id: businessId }, data: { [field]: null as never } });
    res.json({ success: true, message: `${type === 'whatsapp' ? 'WhatsApp' : 'Phone'} number removed` });
}));

adminRouter.get('/stats', asyncHandler(async (_req, res) => {
    const businesses = await prisma.business.findMany({ take: MAX_BUSINESSES, orderBy: { createdAt: 'desc' } });

    const statusCounts: Record<BillingStatus, number> = { trialing: 0, active: 0, past_due: 0, cancelled: 0, expired: 0 };
    const mrrByCurrency: Record<string, number> = {};
    const businessSummaries = [];

    for (const business of businesses) {
        const billing = resolveEffectiveBilling(business);
        statusCounts[billing.status]++;

        const usage = await getCurrentUsage(business.id, billing.plan, business.planOverrideConversationLimit);

        if (billing.status === 'active' && business.billingAmount && business.billingCurrency) {
            const monthlyAmount = business.billingInterval === 'annual' ? business.billingAmount / 12 : business.billingAmount;
            mrrByCurrency[business.billingCurrency] = (mrrByCurrency[business.billingCurrency] || 0) + monthlyAmount;
        }

        businessSummaries.push({
            id: business.id,
            name: business.name,
            plan: billing.plan,
            status: billing.status,
            trialEndsAt: billing.trialEndsAt?.toISOString() || null,
            currentPeriodEnd: billing.currentPeriodEnd?.toISOString() || null,
            amount: business.billingAmount,
            currency: business.billingCurrency,
            usage: { used: usage.used, limit: Number.isFinite(usage.limit) ? usage.limit : null },
            whatsappNumber: (business.whatsappNumber as { number?: string } | null)?.number || null,
            phoneNumber: (business.phoneNumber as { number?: string } | null)?.number || null,
            createdAt: business.createdAt.toISOString(),
        });
    }

    res.json({ totalBusinesses: businessSummaries.length, statusCounts, mrrByCurrency, businesses: businessSummaries });
}));

adminRouter.get('/plan-limits', asyncHandler(async (_req, res) => {
    const overrides = await getPlatformOverrides();
    const defaults = Object.fromEntries(
        PLAN_TIERS.map((plan) => [plan, Number.isFinite(PLAN_CONVERSATION_LIMITS[plan]) ? PLAN_CONVERSATION_LIMITS[plan] : null])
    );
    res.json({ overrides, defaults });
}));

adminRouter.post('/plan-limits', asyncHandler(async (req, res) => {
    const overrides = sanitizeOverrides(req.body.overrides);
    await setPlatformOverrides(overrides);
    res.json({ success: true, overrides });
}));
