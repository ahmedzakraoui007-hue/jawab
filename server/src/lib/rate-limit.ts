import type { Request } from 'express';
import { prisma } from '../db';

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds?: number;
}

/**
 * Fixed-window rate limiter backed by Postgres (a table, not an in-memory
 * counter) so it's shared across every server process/replica. Fails OPEN
 * on an error — abuse mitigation, not a security boundary; an outage here
 * should never be the reason a real request gets refused.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();

    try {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.rateLimit.findUnique({ where: { key } });

            if (!existing || now - existing.windowStart.getTime() >= windowSeconds * 1000) {
                await tx.rateLimit.upsert({
                    where: { key },
                    create: { key, count: 1, windowStart: new Date(now) },
                    update: { count: 1, windowStart: new Date(now) },
                });
                return { allowed: true, remaining: limit - 1 };
            }

            if (existing.count >= limit) {
                const retryAfterSeconds = Math.ceil((existing.windowStart.getTime() + windowSeconds * 1000 - now) / 1000);
                return { allowed: false, remaining: 0, retryAfterSeconds };
            }

            await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
            return { allowed: true, remaining: limit - existing.count - 1 };
        });
    } catch (err) {
        console.error('[rate-limit] check failed, failing open:', err);
        return { allowed: true, remaining: limit };
    }
}

export function getClientIp(request: Request): string {
    const forwardedFor = request.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return request.ip || 'unknown';
}
