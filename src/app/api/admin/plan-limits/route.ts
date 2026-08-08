import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { requirePlatformAdmin } from '@/lib/auth-guard';
import {
    PLATFORM_CONFIG_PATH,
    getPlatformOverrides,
    sanitizeOverrides,
    invalidatePlanLimitCache,
} from '@/lib/plan-limits';
import { PLAN_CONVERSATION_LIMITS } from '@/lib/pricing';
import { reportError } from '@/lib/error-reporting';

/**
 * GET /api/admin/plan-limits
 * Current platform-wide conversation-limit overrides, plus the code
 * defaults for comparison (so the admin UI can show "500 (default)" vs.
 * "750 (overridden)" without hardcoding the defaults twice).
 */
export async function GET(request: NextRequest) {
    const admin = requirePlatformAdmin(request);
    if (!admin.ok) {
        return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const overrides = await getPlatformOverrides();
    const defaults = Object.fromEntries(
        Object.entries(PLAN_CONVERSATION_LIMITS).map(([plan, limit]) => [plan, Number.isFinite(limit) ? limit : null])
    );

    return NextResponse.json({ overrides, defaults });
}

/**
 * POST /api/admin/plan-limits
 * Set (or clear) platform-wide conversation-limit overrides — the
 * "self-serve" lever from src/lib/plan-limits.ts's precedence design:
 * changes the cap for every business on a plan without a code change or
 * deploy. Per-plan `null` means unlimited; omitting a plan entirely clears
 * its override (falls back to the code default).
 *
 * Body: { overrides: { starter?: number | null, professional?: ..., business?: ... } }
 */
export async function POST(request: NextRequest) {
    const admin = requirePlatformAdmin(request);
    if (!admin.ok) {
        return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    try {
        const body = await request.json();
        const overrides = sanitizeOverrides(body.overrides);

        await adminDb
            .collection(PLATFORM_CONFIG_PATH.collection)
            .doc(PLATFORM_CONFIG_PATH.doc)
            .set({ planConversationLimits: overrides }, { merge: true });

        // Without this, the change wouldn't take effect for up to a minute
        // (see plan-limits.ts's CACHE_TTL_MS) — fine for a customer message,
        // not fine for "did my save work?" in the admin UI.
        invalidatePlanLimitCache();

        return NextResponse.json({ success: true, overrides });
    } catch (error) {
        reportError('Admin Plan Limits', error);
        return NextResponse.json({ error: 'Failed to save plan limits' }, { status: 500 });
    }
}
