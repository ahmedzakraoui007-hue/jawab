import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requirePlatformAdmin } from './auth-guard';

// Set in vitest.setup.ts before any module import:
// ADMIN_EMAILS = 'admin@example.com, Owner@Example.com'

function makeReq(email?: string): Request {
    return { authUser: email ? { id: 'u1', email } : undefined } as unknown as Request;
}

function makeRes(): Response {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe('requirePlatformAdmin', () => {
    it('calls next() for an email on the allowlist', () => {
        const req = makeReq('admin@example.com');
        const res = makeRes();
        const next = vi.fn() as NextFunction;

        requirePlatformAdmin(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('is case-insensitive on both the header value and the allowlist entry', () => {
        const req = makeReq('OWNER@example.com');
        const res = makeRes();
        const next = vi.fn() as NextFunction;

        requirePlatformAdmin(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });

    it('rejects an email not on the allowlist with 403', () => {
        const req = makeReq('random@example.com');
        const res = makeRes();
        const next = vi.fn() as NextFunction;

        requirePlatformAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    });

    it('rejects with 401 when there is no authenticated user at all', () => {
        const req = makeReq(undefined);
        const res = makeRes();
        const next = vi.fn() as NextFunction;

        requirePlatformAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
