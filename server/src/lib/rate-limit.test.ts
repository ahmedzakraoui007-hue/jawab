import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { getClientIp } from './rate-limit';

function makeReq(headers: Record<string, string> = {}, ip?: string): Request {
    const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return { get: (name: string) => lower[name.toLowerCase()], ip } as unknown as Request;
}

describe('getClientIp', () => {
    it('takes the first IP from a multi-hop x-forwarded-for chain', () => {
        const req = makeReq({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' });
        expect(getClientIp(req)).toBe('203.0.113.5');
    });

    it('trims whitespace around the first IP', () => {
        const req = makeReq({ 'x-forwarded-for': '  203.0.113.5  , 70.41.3.18' });
        expect(getClientIp(req)).toBe('203.0.113.5');
    });

    it('falls back to req.ip when x-forwarded-for is absent', () => {
        const req = makeReq({}, '198.51.100.7');
        expect(getClientIp(req)).toBe('198.51.100.7');
    });

    it('falls back to "unknown" when neither is present', () => {
        expect(getClientIp(makeReq())).toBe('unknown');
    });
});
