import { describe, it, expect } from 'vitest';
import Twilio from 'twilio';
import type { Request } from 'express';
import {
    formatWhatsAppNumber,
    parseWhatsAppWebhook,
    buildTwiMLResponse,
    getTwilioRequestUrl,
    verifyTwilioRequest,
} from './twilio';

/** Minimal Express Request stand-in — the functions under test only ever
 * read .get(header) and .path/.protocol, so a full Express app isn't
 * needed to exercise them. */
function makeRequest(url: string, headers: Record<string, string> = {}): Request {
    const parsed = new URL(url);
    const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return {
        get: (name: string) => lowerHeaders[name.toLowerCase()],
        path: parsed.pathname,
        protocol: parsed.protocol.replace(':', ''),
    } as unknown as Request;
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
        const body = {
            From: 'whatsapp:+14155551234',
            To: 'whatsapp:+14155238886',
            Body: 'Hello there',
            MessageSid: 'SM123',
            NumMedia: '2',
            MediaUrl0: 'https://example.com/a.jpg',
            MediaUrl1: 'https://example.com/b.jpg',
            ProfileName: 'Jane',
        };

        const result = parseWhatsAppWebhook(body);

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
        const result = parseWhatsAppWebhook({});
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
        const req = makeRequest('http://internal/webhooks/whatsapp', {
            'x-forwarded-proto': 'https',
            host: 'jawab-api.up.railway.app',
        });
        expect(getTwilioRequestUrl(req)).toBe('https://jawab-api.up.railway.app/webhooks/whatsapp');
    });

    it('defaults to the request protocol when no forwarded-proto header is present', () => {
        const req = makeRequest('http://internal/webhooks/voice', { host: 'example.com' });
        expect(getTwilioRequestUrl(req)).toBe('http://example.com/webhooks/voice');
    });
});

describe('verifyTwilioRequest', () => {
    // Set in vitest.setup.ts before any module import.
    const authToken = 'test-twilio-auth-token';

    it('accepts a request whose signature was genuinely computed with the configured auth token', () => {
        const url = 'https://jawab-api.up.railway.app/webhooks/whatsapp';
        const params = { From: 'whatsapp:+14155551234', Body: 'Hi' };
        const signature = Twilio.getExpectedTwilioSignature(authToken, url, params);

        const req = makeRequest(url, {
            'x-forwarded-proto': 'https',
            host: 'jawab-api.up.railway.app',
            'x-twilio-signature': signature,
        });

        expect(verifyTwilioRequest(req, params)).toBe(true);
    });

    it('rejects a request with no signature header', () => {
        const req = makeRequest('https://jawab-api.up.railway.app/webhooks/whatsapp', {
            'x-forwarded-proto': 'https',
            host: 'jawab-api.up.railway.app',
        });
        expect(verifyTwilioRequest(req, {})).toBe(false);
    });

    it('rejects a request with a forged/incorrect signature', () => {
        const req = makeRequest('https://jawab-api.up.railway.app/webhooks/whatsapp', {
            'x-forwarded-proto': 'https',
            host: 'jawab-api.up.railway.app',
            'x-twilio-signature': 'totally-not-valid',
        });
        expect(verifyTwilioRequest(req, { From: 'whatsapp:+14155551234' })).toBe(false);
    });

    it('rejects when the params were tampered with after signing', () => {
        const url = 'https://jawab-api.up.railway.app/webhooks/whatsapp';
        const signedParams = { From: 'whatsapp:+14155551234', Body: 'Hi' };
        const signature = Twilio.getExpectedTwilioSignature(authToken, url, signedParams);

        const req = makeRequest(url, {
            'x-forwarded-proto': 'https',
            host: 'jawab-api.up.railway.app',
            'x-twilio-signature': signature,
        });

        expect(verifyTwilioRequest(req, { From: 'whatsapp:+14155551234', Body: 'Tampered' })).toBe(false);
    });
});
