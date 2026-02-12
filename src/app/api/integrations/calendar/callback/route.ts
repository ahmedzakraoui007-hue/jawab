import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { getAppUrl } from '@/lib/utils';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getTokensFromCode, getCalendarList } from '@/lib/google-calendar';

/**
 * GET /api/integrations/calendar/callback
 * Handle OAuth callback from Google
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=calendar_access_denied`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=calendar_missing_params`
        );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;

    if (!storedState || storedState !== state) {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=calendar_invalid_state`
        );
    }

    // Parse state to get businessId
    let businessId: string;
    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        businessId = stateData.businessId;
    } catch {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=calendar_invalid_state`
        );
    }

    try {
        // Exchange code for tokens
        const tokens = await getTokensFromCode(code);

        if (!tokens.access_token) {
            console.error('[Calendar OAuth] No access token received');
            return NextResponse.redirect(
                `${getAppUrl()}/dashboard/settings/integrations?error=calendar_token_failed`
            );
        }

        // Get user's calendars to find primary and email
        const calendars = await getCalendarList(tokens.access_token, tokens.refresh_token);
        const primaryCalendar = calendars.find(c => c.primary) || calendars[0];

        if (!primaryCalendar) {
            return NextResponse.redirect(
                `${getAppUrl()}/dashboard/settings/integrations?error=calendar_no_calendars`
            );
        }

        // Save to Firestore
        if (db) {
            const businessRef = doc(db, 'businesses', businessId);
            await updateDoc(businessRef, {
                googleCalendar: {
                    accessToken: tokens.access_token, // TODO: Encrypt in production
                    refreshToken: tokens.refresh_token || null,
                    calendarId: primaryCalendar.id,
                    calendarName: primaryCalendar.name,
                    email: primaryCalendar.id, // For Google, primary calendar ID is the email
                    expiresAt: tokens.expiry_date
                        ? Timestamp.fromMillis(tokens.expiry_date)
                        : null,
                    connectedAt: Timestamp.now(),
                    connectedBy: 'oauth', // TODO: Get actual user ID from session
                },
                updatedAt: Timestamp.now(),
            });

            console.log(`[Calendar OAuth] Connected calendar ${primaryCalendar.id} to business ${businessId}`);
        }

        // Clear state cookie
        cookieStore.delete('google_oauth_state');

        // Redirect to success page
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?success=calendar_connected&calendar=${encodeURIComponent(primaryCalendar.name)}`
        );

    } catch (error) {
        console.error('[Calendar OAuth] Error:', error);
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=calendar_oauth_failed`
        );
    }
}
