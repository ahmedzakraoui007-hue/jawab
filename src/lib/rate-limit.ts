import type { NextRequest } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds?: number;
}

/**
 * Fixed-window rate limiter backed by Firestore, since this app runs as
 * stateless serverless functions — an in-memory counter would reset on
 * every cold start and wouldn't be shared across concurrent instances.
 * Fails OPEN (allows the request) when Firestore isn't configured or the
 * check itself errors, so a rate-limiter outage never takes down the
 * actual feature — this is abuse mitigation, not a security boundary.
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    if (!isAdminConfigured) {
        return { allowed: true, remaining: limit };
    }

    const docId = key.replace(/\//g, '_').slice(0, 300);
    const ref = adminDb.collection('rateLimits').doc(docId);
    const now = Date.now();

    try {
        return await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.data();

            if (!data || now - (data.windowStart as Timestamp).toMillis() >= windowSeconds * 1000) {
                tx.set(ref, { count: 1, windowStart: Timestamp.fromMillis(now) });
                return { allowed: true, remaining: limit - 1 };
            }

            if (data.count >= limit) {
                const retryAfterSeconds = Math.ceil(
                    ((data.windowStart as Timestamp).toMillis() + windowSeconds * 1000 - now) / 1000
                );
                return { allowed: false, remaining: 0, retryAfterSeconds };
            }

            tx.update(ref, { count: data.count + 1 });
            return { allowed: true, remaining: limit - data.count - 1 };
        });
    } catch (err) {
        console.error('[rate-limit] check failed, failing open:', err);
        return { allowed: true, remaining: limit };
    }
}

/** Best-effort client IP for rate-limiting unauthenticated public routes. */
export function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}
