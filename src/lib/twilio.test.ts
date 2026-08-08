import { describe, it, expect } from 'vitest';
import Twilio from 'twilio';
import type { NextRequest } from 'next/server';
import {
    formatWhatsAppNumber,
    parseWhatsAppWebhook,
    buildTwiMLResponse,
    getTwilioRequestUrl,
    verifyTwilioRequest,
} from '@/lib/twilio';

/** Minimal NextRequest stand-in — verifyTwilioRequest only ever reads
 * .headers and .nextUrl, so a full Next.js runtime request isn't needed. */
function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
    const parsed = new URL(url);
    return {
        headers: new Headers(headers),
        nextUrl: { pathname: parsed.pathname, host: parsed.host },
    } as unknown as NextRequest;
}

describe('formatWhatsAppNumber', () => {
    it('adds the whatsapp: prefix and a leading +', () => {
        expect(formatWhatsAppNumber('14155238886')).toBe('whatsapp:+14155238886');
    });

    it('is idempotent when already prefixed and plus-signed', () => {
        expect(formatWhatsAppNumber('whatsapp:+14155238886')).toBe('whatsapp:+14155238886');
    });

    it('strips an existing whatsapp: prefix before re-adding it', () => {
        expect(formatWhatsAppNumber('whatsapp:14155238886')).toBe('whatsapp:+14155238886');
    });
});

describe('parseWhatsAppWebhook', () => {
    it('extracts core fields and collects media URLs by index', () => {
        const form = new FormData();
        form.set('From', 'whatsapp:+14155551234');
        form.set('To', 'whatsapp:+14155238886');
        form.set('Body', 'Hello there');
        form.set('MessageSid', 'SM123');
        form.set('NumMedia', '2');
        form.set('MediaUrl0', 'https://example.com/a.jpg');
        form.set('MediaUrl1', 'https://example.com/b.jpg');
        form.set('ProfileName', 'Jane');

        const result = parseWhatsAppWebhook(form);

        expect(result).toMatchObject({
            from: 'whatsapp:+14155551234',
            to: 'whatsapp:+14155238886',
            body: 'Hello there',
            messageSid: 'SM123',
            numMedia: 2,
            mediaUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
            profileName: 'Jane',
        });
        expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('defaults missing fields safely instead of throwing', () => {
        const result = parseWhatsAppWebhook(new FormData());
        expect(result.from).toBe('');
        expect(result.numMedia).toBe(0);
        expect(result.mediaUrls).toEqual([]);
        expect(result.profileName).toBeUndefined();
    });
});

describe('buildTwiMLResponse', () => {
    it('escapes XML special characters in the message body', () => {
        const xml = buildTwiMLResponse('Tom & Jerry <said> "hi" \'there\'');
        expect(xml).toContain('Tom &amp; Jerry &lt;said&gt; &quot;hi&quot; &apos;there&apos;');
        expect(xml).toContain('<Response>');
        expect(xml).toContain('<Message>');
    });
});

describe('getTwilioRequestUrl', () => {
    it('reconstructs the public URL from forwarded headers', () => {
        const req = makeRequest('http://internal/api/webhooks/whatsapp', {
            'x-forwarded-proto': 'https',
            host: 'jawab-eight.vercel.app',
        });
        expect(getTwilioRequestUrl(req)).toBe('https://jawab-eight.vercel.app/api/webhooks/whatsapp');
    });

    it('defaults to https when no forwarded-proto header is present', () => {
        const req = makeRequest('http://internal/api/webhooks/voice', { host: 'example.com' });
        expect(getTwilioRequestUrl(req)).toBe('https://example.com/api/webhooks/voice');
    });
});

describe('verifyTwilioRequest', () => {
    // Set in vitest.setup.ts before any module import.
    const authToken = 'test-twilio-auth-token';

    it('accepts a request whose signature was genuinely computed with the configured auth token', () => {
        const url = 'https://jawab-eight.vercel.app/api/webhooks/whatsapp';
        const params = { From: 'whatsapp:+14155551234', Body: 'Hi' };
        const signature = Twilio.getExpectedTwilioSignature(authToken, url, params);

        const req = makeRequest(url, {
            'x-forwarded-proto': 'https',
            host: 'jawab-eight.vercel.app',
            'x-twilio-signature': signature,
        });

        expect(verifyTwilioRequest(req, params)).toBe(true);
    });

    it('rejects a request with no signature header', () => {
        const req = makeRequest('https://jawab-eight.vercel.app/api/webhooks/whatsapp', {
            'x-forwarded-proto': 'https',
            host: 'jawab-eight.vercel.app',
        });
        expect(verifyTwilioRequest(req, {})).toBe(false);
    });

    it('rejects a request with a forged/incorrect signature', () => {
        const req = makeRequest('https://jawab-eight.vercel.app/api/webhooks/whatsapp', {
            'x-forwarded-proto': 'https',
            host: 'jawab-eight.vercel.app',
            'x-twilio-signature': 'totally-not-valid',
        });
        expect(verifyTwilioRequest(req, { From: 'whatsapp:+14155551234' })).toBe(false);
    });

    it('rejects when the params were tampered with after signing', () => {
        const url = 'https://jawab-eight.vercel.app/api/webhooks/whatsapp';
        const signedParams = { From: 'whatsapp:+14155551234', Body: 'Hi' };
        const signature = Twilio.getExpectedTwilioSignature(authToken, url, signedParams);

        const req = makeRequest(url, {
            'x-forwarded-proto': 'https',
            host: 'jawab-eight.vercel.app',
            'x-twilio-signature': signature,
        });

        expect(verifyTwilioRequest(req, { From: 'whatsapp:+14155551234', Body: 'Tampered' })).toBe(false);
    });
});
