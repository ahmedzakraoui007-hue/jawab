import type { NextRequest } from 'next/server';
import { adminAuth, adminDb, isAdminConfigured } from '@/lib/firebase-admin';

const PLATFORM_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

async function isMemberOfBusiness(uid: string, businessId: string): Promise<boolean> {
    try {
        const bizDoc = await adminDb.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) return false;
        const data = bizDoc.data();
        if (data?.ownerId === uid) return true;
        if (Array.isArray(data?.staffIds) && data.staffIds.includes(uid)) return true;
        return false;
    } catch (err) {
        console.error('[auth-guard] isMemberOfBusiness error:', err);
        return false;
    }
}

/**
 * Resolve the businessId belonging to the authenticated caller, from their
 * OWN users/{uid} doc. Always safe to trust — it is never a client-supplied
 * value. Prefer this over accepting a `businessId` from the request itself.
 */
export async function resolveOwnBusinessId(request: NextRequest): Promise<string | null> {
    const uid = request.headers.get('x-user-uid');
    if (!uid || !isAdminConfigured) return null;

    try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        return userDoc.data()?.businessId || null;
    } catch (err) {
        console.error('[auth-guard] resolveOwnBusinessId error:', err);
        return null;
    }
}

/**
 * Verify the authenticated caller (via middleware's x-user-uid header) is
 * actually a member (owner or staff) of the given businessId. Use this
 * whenever a route must accept an explicit businessId rather than always
 * resolving the caller's own.
 */
export async function requireBusinessMembership(
    request: NextRequest,
    businessId: string | null | undefined
): Promise<{ ok: true; uid: string } | { ok: false; status: number; error: string }> {
    const uid = request.headers.get('x-user-uid');
    if (!uid) return { ok: false, status: 401, error: 'Missing authenticated user' };
    if (!businessId) return { ok: false, status: 400, error: 'businessId required' };
    if (!isAdminConfigured) return { ok: false, status: 503, error: 'Database not configured' };

    const member = await isMemberOfBusiness(uid, businessId);
    if (!member) return { ok: false, status: 403, error: 'Not a member of this business' };

    return { ok: true, uid };
}

/**
 * Gate platform-admin-only routes (e.g. assigning phone numbers between
 * businesses). There is no per-user "isAdmin" role in the data model today
 * — admin status is a fixed allowlist of emails from the ADMIN_EMAILS env
 * var. Fails CLOSED: with no ADMIN_EMAILS configured, nobody can pass this
 * check, rather than nobody being checked at all.
 */
export function requirePlatformAdmin(
    request: NextRequest
): { ok: true } | { ok: false; status: number; error: string } {
    const email = request.headers.get('x-user-email')?.toLowerCase();
    if (!email) return { ok: false, status: 401, error: 'Missing authenticated user' };

    if (PLATFORM_ADMIN_EMAILS.length === 0) {
        return { ok: false, status: 503, error: 'Admin access is not configured' };
    }

    if (!PLATFORM_ADMIN_EMAILS.includes(email)) {
        return { ok: false, status: 403, error: 'Admin access required' };
    }

    return { ok: true };
}

/**
 * Verify a Firebase ID token passed as a query param, for the handful of
 * OAuth-initiation routes reached via a plain browser navigation
 * (window.location.href), which cannot attach an Authorization header the
 * way fetch-based calls can — so they can't rely on middleware's Bearer
 * check and must verify the token themselves. Also confirms the resulting
 * user is a member of the target business, since the OAuth callback that
 * follows has no way to re-check who initiated the flow.
 */
export async function verifyTokenAndBusinessMembership(
    idToken: string | null,
    businessId: string | null
): Promise<{ ok: true; uid: string } | { ok: false; status: number; error: string }> {
    if (!isAdminConfigured) return { ok: false, status: 503, error: 'Database not configured' };
    if (!idToken) return { ok: false, status: 401, error: 'Missing idToken' };
    if (!businessId) return { ok: false, status: 400, error: 'businessId required' };

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
    } catch {
        return { ok: false, status: 401, error: 'Invalid or expired token' };
    }

    const member = await isMemberOfBusiness(uid, businessId);
    if (!member) return { ok: false, status: 403, error: 'Not a member of this business' };

    return { ok: true, uid };
}
