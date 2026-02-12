import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getCalendarList, isGoogleCalendarConfigured } from '@/lib/google-calendar';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * OAuth2 callback handler
 * GET /api/calendar/callback?code=xxx&state=businessId
 * Exchanges code for tokens and saves to Firestore
 */
export async function GET(request: NextRequest) {
    if (!isGoogleCalendarConfigured) {
        return NextResponse.redirect('/dashboard?error=calendar_not_configured');
    }

    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state'); // businessId
    const error = request.nextUrl.searchParams.get('error');

    // Handle user denial
    if (error) {
        return NextResponse.redirect(`/dashboard?error=${error}`);
    }

    if (!code || !state) {
        return NextResponse.redirect('/dashboard?error=missing_params');
    }

    try {
        // Exchange code for tokens
        const tokens = await getTokensFromCode(code);

        // Get list of calendars to let user choose
        const calendars = await getCalendarList(tokens.access_token, tokens.refresh_token);
        const primaryCalendar = calendars.find(c => c.primary) || calendars[0];

        // Save tokens to Firestore (if available)
        if (db) {
            const businessRef = doc(db, 'businesses', state);
            await updateDoc(businessRef, {
                googleCalendar: {
                    connected: true,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiryDate: tokens.expiry_date,
                    calendarId: primaryCalendar?.id || 'primary',
                    calendarName: primaryCalendar?.name,
                    connectedAt: serverTimestamp(),
                },
            });
        }

        // Redirect to dashboard with success
        return NextResponse.redirect('/dashboard/settings?calendar=connected');

    } catch (error) {
        console.error('[Calendar Callback] Error:', error);
        return NextResponse.redirect('/dashboard?error=calendar_connection_failed');
    }
}
