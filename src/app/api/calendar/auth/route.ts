import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar';

/**
 * Initiate Google Calendar OAuth2 flow
 * GET /api/calendar/auth?businessId=xxx
 * Redirects to Google consent screen
 */
export async function GET(request: NextRequest) {
    if (!isGoogleCalendarConfigured) {
        return NextResponse.json(
            { error: 'Google Calendar not configured' },
            { status: 503 }
        );
    }

    const businessId = request.nextUrl.searchParams.get('businessId');

    if (!businessId) {
        return NextResponse.json(
            { error: 'Missing businessId parameter' },
            { status: 400 }
        );
    }

    // Generate auth URL with business ID as state
    const authUrl = getAuthUrl(businessId);

    // Redirect to Google
    return NextResponse.redirect(authUrl);
}
