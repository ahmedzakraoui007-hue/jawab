import { describe, it, expect } from 'vitest';
import type { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth-guard';

// vitest.setup.ts sets ADMIN_EMAILS = 'admin@example.com, Owner@Example.com'
// before this module (and auth-guard.ts, which reads it at import time) load.

function makeRequest(headers: Record<string, string> = {}): NextRequest {
    return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe('requirePlatformAdmin', () => {
    it('allows an email on the allowlist', () => {
        const result = requirePlatformAdmin(makeRequest({ 'x-user-email': 'admin@example.com' }));
        expect(result).toEqual({ ok: true });
    });

    it('is case-insensitive on both the header value and the allowlist entry', () => {
        const result = requirePlatformAdmin(makeRequest({ 'x-user-email': 'OWNER@example.com' }));
        expect(result).toEqual({ ok: true });
    });

    it('rejects an email not on the allowlist with 403', () => {
        const result = requirePlatformAdmin(makeRequest({ 'x-user-email': 'random@example.com' }));
        expect(result).toEqual({ ok: false, status: 403, error: 'Admin access required' });
    });

    it('rejects with 401 when there is no authenticated user at all', () => {
        const result = requirePlatformAdmin(makeRequest());
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(401);
    });
});
