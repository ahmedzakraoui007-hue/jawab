import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            userId?: string;
            authUser?: { id: string; email: string | null };
        }
    }
}

/**
 * Verifies the Bearer access token and attaches req.userId/req.authUser.
 * Mirrors the Next.js app's existing middleware.ts pattern (which
 * injected x-user-uid/x-user-email headers after verifying a Firebase ID
 * token) — same shape, different token source.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = verifyAccessToken(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    req.userId = payload.sub;
    req.authUser = { id: payload.sub, email: payload.email };
    next();
}
