import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar';

/**
 * GET /api/integrations/calendar/auth
 * Start Google Calendar OAuth flow - redirects to Google login
 * 
 * Query params:
 * - businessId: The business to connect (required)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
        return NextResponse.json(
            { error: 'businessId is required' },
            { status: 400 }
        );
    }

    if (!isGoogleCalendarConfigured) {
        return NextResponse.json(
            { error: 'Google Calendar not configured' },
            { status: 503 }
        );
    }

    // Generate state token for CSRF protection and to pass businessId
    const state = Buffer.from(JSON.stringify({
        businessId,
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
