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
