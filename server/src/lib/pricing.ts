export interface CurrencyInfo {
    code: string;
    country: string;
}

export const CURRENCIES: CurrencyInfo[] = [
    { code: 'AED', country: 'UAE' },
    { code: 'SAR', country: 'Saudi Arabia' },
    { code: 'QAR', country: 'Qatar' },
    { code: 'KWD', country: 'Kuwait' },
    { code: 'BHD', country: 'Bahrain' },
    { code: 'OMR', country: 'Oman' },
];

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];
export const DEFAULT_CURRENCY: CurrencyCode = 'AED';

export const PLAN_TIERS = ['starter', 'professional', 'business'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/** Mirrors the Next.js app's src/lib/pricing.ts exactly — keep the two in
 * sync manually until Phase C, when the Next.js app stops needing its own
 * copy and can fetch pricing from this backend instead. */
export const PLAN_PRICING: Record<CurrencyCode, { monthly: number[]; annualMonthly: number[] }> = {
    AED: { monthly: [349, 899, 1499], annualMonthly: [279, 719, 1199] },
    SAR: { monthly: [349, 899, 1499], annualMonthly: [279, 719, 1199] },
    QAR: { monthly: [349, 899, 1499], annualMonthly: [279, 719, 1199] },
    KWD: { monthly: [29, 75, 125], annualMonthly: [23, 60, 100] },
    BHD: { monthly: [35, 92, 153], annualMonthly: [28, 74, 122] },
    OMR: { monthly: [36, 94, 157], annualMonthly: [29, 75, 126] },
};

export const PLAN_CONVERSATION_LIMITS: Record<PlanTier, number> = {
    starter: 500,
    professional: 2000,
    business: Infinity,
};

export function getPlanTierIndex(plan: PlanTier): number {
    return PLAN_TIERS.indexOf(plan);
}

export function getPlanPrice(plan: PlanTier, currency: CurrencyCode, interval: 'monthly' | 'annual'): number {
    const idx = getPlanTierIndex(plan);
    const table = PLAN_PRICING[currency];
    return interval === 'annual' ? table.annualMonthly[idx] : table.monthly[idx];
}
