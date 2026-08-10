import { describe, it, expect } from 'vitest';
import { resolvePlanLimit, isValidStoredLimit, sanitizeOverrides } from './plan-limits';
import { PLAN_CONVERSATION_LIMITS } from './pricing';

describe('isValidStoredLimit', () => {
    it('accepts null (meaning unlimited)', () => {
        expect(isValidStoredLimit(null)).toBe(true);
    });

    it('accepts zero and positive finite numbers', () => {
        expect(isValidStoredLimit(0)).toBe(true);
        expect(isValidStoredLimit(5000)).toBe(true);
    });

    it('rejects negative numbers', () => {
        expect(isValidStoredLimit(-1)).toBe(false);
    });

    it('rejects NaN and Infinity — Infinity has no JSON/Postgres representation', () => {
        expect(isValidStoredLimit(NaN)).toBe(false);
        expect(isValidStoredLimit(Infinity)).toBe(false);
    });

    it('rejects non-numbers (a string typed into an admin form, undefined, objects)', () => {
        expect(isValidStoredLimit('500')).toBe(false);
        expect(isValidStoredLimit(undefined)).toBe(false);
        expect(isValidStoredLimit({})).toBe(false);
    });
});

describe('resolvePlanLimit', () => {
    it('falls back to the code default (marketing page numbers) with no overrides', () => {
        const result = resolvePlanLimit('starter');
        expect(result).toEqual({ limit: PLAN_CONVERSATION_LIMITS.starter, source: 'default' });
    });

    it('prefers a platform override over the default', () => {
        const result = resolvePlanLimit('starter', { starter: 750 });
        expect(result).toEqual({ limit: 750, source: 'platform' });
    });

    it('prefers a business override over a platform override AND the default', () => {
        const result = resolvePlanLimit('starter', { starter: 750 }, 1000);
        expect(result).toEqual({ limit: 1000, source: 'business' });
    });

    it('treats a stored null business override as explicitly unlimited', () => {
        const result = resolvePlanLimit('professional', undefined, null);
        expect(result).toEqual({ limit: Infinity, source: 'business' });
    });

    it('ignores an invalid business override and falls through to the next layer', () => {
        const result = resolvePlanLimit('starter', { starter: 750 }, 'not-a-number');
        expect(result).toEqual({ limit: 750, source: 'platform' });
    });

    it('ignores an invalid platform override and falls through to the default', () => {
        const result = resolvePlanLimit('starter', { starter: -5 } as never);
        expect(result).toEqual({ limit: PLAN_CONVERSATION_LIMITS.starter, source: 'default' });
    });

    it('only applies the platform override for the matching plan, not other plans', () => {
        const result = resolvePlanLimit('business', { starter: 750 });
        expect(result.source).toBe('default');
    });
});

describe('sanitizeOverrides', () => {
    it('keeps only known plan tiers with valid values', () => {
        const result = sanitizeOverrides({ starter: 750, professional: null, business: 999, notAPlan: 1 });
        expect(result).toEqual({ starter: 750, professional: null, business: 999 });
    });

    it('drops invalid values per-plan rather than discarding the whole doc', () => {
        const result = sanitizeOverrides({ starter: 750, professional: 'bad-value', business: -1 });
        expect(result).toEqual({ starter: 750 });
    });

    it('returns an empty object for null, non-object, or missing input', () => {
        expect(sanitizeOverrides(null)).toEqual({});
        expect(sanitizeOverrides(undefined)).toEqual({});
        expect(sanitizeOverrides('not an object')).toEqual({});
        expect(sanitizeOverrides(42)).toEqual({});
    });
});
