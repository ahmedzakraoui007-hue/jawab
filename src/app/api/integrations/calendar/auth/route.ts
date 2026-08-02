import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar';
import { verifyTokenAndBusinessMembership } from '@/lib/auth-guard';

/**
 * GET /api/integrations/calendar/auth
 * Start Google Calendar OAuth flow - redirects to Google login
 *
 * Query params:
 * - businessId: The business to connect (required)
 * - idToken: The caller's Firebase ID token (required) — this route is
 *   reached via window.location.href, which can't attach an Authorization
 *   header, so the token travels as a query param instead and is verified
 *   here directly. Without this check, anyone could connect an arbitrary
 *   business's calendar to their own Google account.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const idToken = searchParams.get('idToken');

    const auth = await verifyTokenAndBusinessMembership(idToken, businessId);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isGoogleCalendarConfigured) {
        return NextResponse.json(
            { error: 'Google Calendar not configured' },
            { status: 503 }
        );
    }

    // Generate state token for CSRF protection and to pass businessId + the
    // verified uid (so the callback can record who actually connected this)
    const state = Buffer.from(JSON.stringify({
        businessId,
        uid: auth.uid,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
    })).toString('base64');

    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
    });

    // Get OAuth URL with state
    const authUrl = getAuthUrl(state);

    return NextResponse.redirect(authUrl);
}
