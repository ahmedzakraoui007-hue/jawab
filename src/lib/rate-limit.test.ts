import { describe, it, expect } from 'vitest';
import type { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
    return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe('getClientIp', () => {
    it('takes the first IP from a multi-hop x-forwarded-for chain', () => {
        const req = makeRequest({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' });
        expect(getClientIp(req)).toBe('203.0.113.5');
    });

    it('trims whitespace around the first IP', () => {
        const req = makeRequest({ 'x-forwarded-for': '  203.0.113.5  , 70.41.3.18' });
        expect(getClientIp(req)).toBe('203.0.113.5');
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', () => {
        const req = makeRequest({ 'x-real-ip': '198.51.100.7' });
        expect(getClientIp(req)).toBe('198.51.100.7');
    });

    it('falls back to "unknown" when neither header is present', () => {
        expect(getClientIp(makeRequest())).toBe('unknown');
    });
});
