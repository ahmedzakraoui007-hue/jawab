import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectLanguage, formatPhoneNumber, truncate, getInitials, formatCurrency, getAppUrl } from '@/lib/utils';

describe('detectLanguage', () => {
    it('detects plain English', () => {
        expect(detectLanguage('Hello, how can I help?')).toBe('en');
    });

    it('detects Arabic (Gulf dialect)', () => {
        expect(detectLanguage('مرحباً كيف أقدر أساعدك')).toBe('ar');
    });

    it('detects Urdu via Urdu-specific characters, not just the shared Arabic script', () => {
        expect(detectLanguage('آپ کیسے ہیں؟')).toBe('ur');
    });

    it('detects Hindi/Devanagari', () => {
        expect(detectLanguage('नमस्ते, मैं आपकी कैसे मदद कर सकता हूं')).toBe('hi');
    });

    it('falls back to unknown for text with no recognized script', () => {
        expect(detectLanguage('12345 !@#$%')).toBe('unknown');
    });
});

describe('formatPhoneNumber', () => {
    it('masks the middle digits of a long number, keeping first 7 and last 4', () => {
        expect(formatPhoneNumber('+14155551234')).toBe('+141555 *** 1234');
    });

    it('leaves short numbers unmasked', () => {
        expect(formatPhoneNumber('12345')).toBe('12345');
    });
});

describe('truncate', () => {
    it('leaves short text untouched', () => {
        expect(truncate('short', 10)).toBe('short');
    });

    it('truncates long text and appends an ellipsis within maxLength', () => {
        const result = truncate('this is a long sentence', 10);
        expect(result).toBe('this is...');
        expect(result.length).toBe(10);
    });
});

describe('getInitials', () => {
    it('builds initials from a two-word name', () => {
        expect(getInitials('Jane Doe')).toBe('JD');
    });

    it('caps at two characters for longer names', () => {
        expect(getInitials('John Jacob Jingleheimer Schmidt')).toBe('JJ');
    });
});

describe('formatCurrency', () => {
    it('formats a whole-number AED amount with no decimals', () => {
        expect(formatCurrency(349)).toContain('349');
        expect(formatCurrency(349)).toMatch(/AED/);
    });
});

describe('getAppUrl', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const originalVercelUrl = process.env.VERCEL_URL;

    beforeEach(() => {
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.VERCEL_URL;
    });

    afterEach(() => {
        if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
        else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
        if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
        else process.env.VERCEL_URL = originalVercelUrl;
    });

    it('prefers an explicitly configured NEXT_PUBLIC_APP_URL', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://jawab.example.com';
        process.env.VERCEL_URL = 'some-preview.vercel.app';
        expect(getAppUrl()).toBe('https://jawab.example.com');
    });

    it('falls back to VERCEL_URL (prefixed with https://) when unset', () => {
        process.env.VERCEL_URL = 'jawab-preview.vercel.app';
        expect(getAppUrl()).toBe('https://jawab-preview.vercel.app');
    });

    it('falls back to localhost when neither is set (server-side)', () => {
        expect(getAppUrl()).toBe('http://localhost:3000');
    });
});
