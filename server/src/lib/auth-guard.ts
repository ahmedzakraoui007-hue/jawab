import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const PLATFORM_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/** Resolve the businessId belonging to the authenticated caller, from
 * their own user record — never a client-supplied value. */
export async function resolveOwnBusinessId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.businessId ?? null;
}

/**
 * Gate platform-admin-only routes. Fixed env-var allowlist, not a
 * database role. Fails CLOSED: with no ADMIN_EMAILS configured, nobody
 * passes, rather than nobody being checked.
 */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
    const user = req.authUser;
    if (!user?.email) {
        res.status(401).json({ error: 'Missing authenticated user' });
        return;
    }
    if (PLATFORM_ADMIN_EMAILS.length === 0) {
        res.status(503).json({ error: 'Admin access is not configured' });
        return;
    }
    if (!PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}
