export interface CurrencyInfo {
    code: string;
    flag: string;
    country: string;
}

export const CURRENCIES: CurrencyInfo[] = [
    { code: 'AED', flag: '🇦🇪', country: 'UAE' },
    { code: 'SAR', flag: '🇸🇦', country: 'Saudi Arabia' },
    { code: 'QAR', flag: '🇶🇦', country: 'Qatar' },
    { code: 'KWD', flag: '🇰🇼', country: 'Kuwait' },
    { code: 'BHD', flag: '🇧🇭', country: 'Bahrain' },
    { code: 'OMR', flag: '🇴🇲', country: 'Oman' },
];

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export const DEFAULT_CURRENCY: CurrencyCode = 'AED';

/**
 * Per-plan pricing by GCC currency. AED/SAR/QAR share the same face
 * value (their pegged USD rates put them within ~5% of each other —
 * standard practice for GCC SaaS pricing). KWD/BHD/OMR are much
 * higher-value currencies, so their amounts are converted from the
 * AED price at approximate pegged exchange rates and rounded to a
 * clean number, not just carried over.
 */
export const PLAN_PRICING: Record<CurrencyCode, { monthly: number[]; annualMonthly: number[] }> = {
    AED: { monthly: [349, 899, 1499], annualMonthly: [279, 719, 1199] },
    SAR: { monthly: [349, 899, 1499], annualMonthly: [279, 719, 1199] },
    QAR: { monthly: [349, 899, 1499], annualMonthly: [279, 719, 1199] },
    KWD: { monthly: [29, 75, 125], annualMonthly: [23, 60, 100] },
    BHD: { monthly: [35, 92, 153], annualMonthly: [28, 74, 122] },
    OMR: { monthly: [36, 94, 157], annualMonthly: [29, 75, 126] },
};

export const CURRENCY_STORAGE_KEY = 'jawab_currency';

/**
 * The three paid plan tiers, in the same order as PLAN_PRICING's arrays
 * (index 0 = Starter, 1 = Professional, 2 = Business).
 */
export const PLAN_TIERS = ['starter', 'professional', 'business'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/**
 * Monthly conversation quota per plan — the exact numbers promised on the
 * marketing pricing page (src/i18n/dictionaries/{en,ar}.ts). Keep these in
 * sync with that copy; usage enforcement (src/lib/usage.ts) reads this
 * directly so the two can never silently drift apart again.
 */
export const PLAN_CONVERSATION_LIMITS: Record<PlanTier, number> = {
    starter: 500,
    professional: 2000,
    business: Infinity,
};

export function getPlanTierIndex(plan: PlanTier): number {
    return PLAN_TIERS.indexOf(plan);
}

/** Monthly-equivalent price for a plan/currency/interval, in the currency's smallest unit is NOT applied here — this returns the face-value amount (e.g. 349 for 349 AED). */
export function getPlanPrice(
    plan: PlanTier,
    currency: CurrencyCode,
    interval: 'monthly' | 'annual'
): number {
    const idx = getPlanTierIndex(plan);
    const table = PLAN_PRICING[currency];
    return interval === 'annual' ? table.annualMonthly[idx] : table.monthly[idx];
}
