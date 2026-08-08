import { describe, it, expect } from 'vitest';
import { CURRENCIES, PLAN_PRICING, DEFAULT_CURRENCY } from '@/lib/pricing';

describe('pricing data', () => {
    it('has a PLAN_PRICING entry for every listed currency', () => {
        for (const { code } of CURRENCIES) {
            expect(PLAN_PRICING[code]).toBeDefined();
        }
    });

    it('gives every currency exactly 3 plan tiers for both monthly and annual pricing', () => {
        for (const code of Object.keys(PLAN_PRICING) as Array<keyof typeof PLAN_PRICING>) {
            expect(PLAN_PRICING[code].monthly).toHaveLength(3);
            expect(PLAN_PRICING[code].annualMonthly).toHaveLength(3);
        }
    });

    it('prices annual (monthly-equivalent) billing cheaper than monthly billing, per tier', () => {
        for (const code of Object.keys(PLAN_PRICING) as Array<keyof typeof PLAN_PRICING>) {
            const { monthly, annualMonthly } = PLAN_PRICING[code];
            monthly.forEach((price, i) => {
                expect(annualMonthly[i]).toBeLessThan(price);
            });
        }
    });

    it('lists DEFAULT_CURRENCY among the available currencies', () => {
        expect(CURRENCIES.map((c) => c.code)).toContain(DEFAULT_CURRENCY);
    });
});
