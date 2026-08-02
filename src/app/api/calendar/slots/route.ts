import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, formatSlotTime, formatSlotTimeArabic } from '@/lib/google-calendar';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';

/**
 * Get available booking slots
 * GET /api/calendar/slots?date=2024-01-15&duration=60&lang=en
 *
 * businessId is resolved from the authenticated caller's own account —
 * a signed-in user can only ever check their own business's availability.
 */
export async function GET(request: NextRequest) {
    const dateStr = request.nextUrl.searchParams.get('date'); // YYYY-MM-DD
    const duration = parseInt(request.nextUrl.searchParams.get('duration') || '60', 10);
    const lang = request.nextUrl.searchParams.get('lang') || 'en';

    if (!dateStr) {
        return NextResponse.json({ error: 'Missing required parameter: date' }, { status: 400 });
    }

    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const businessId = await resolveOwnBusinessId(request);
    if (!businessId) {
        return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
    }

    try {
        const businessSnap = await adminDb.collection('businesses').doc(businessId).get();

        if (!businessSnap.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const business = businessSnap.data()!;
        const calendar = business.googleCalendar;

        if (!calendar?.connected || !calendar?.accessToken) {
            // Honest response: no fake/random availability. A real customer
            // should never be shown open slots that don't actually exist.
            return NextResponse.json({
                date: dateStr,
                calendarConnected: false,
                slots: [],
                message: 'Google Calendar is not connected for this business yet.',
            });
        }

        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const hours = business.hours?.[dayName];

        if (!hours) {
            return NextResponse.json({
                date: dateStr,
                closed: true,
                slots: [],
            });
        }

        const slots = await getAvailableSlots(
            calendar.accessToken,
            calendar.refreshToken,
            calendar.calendarId || 'primary',
            date,
            duration,
            hours
        );

        const formattedSlots = slots
            .filter((slot) => slot.available)
            .map((slot) => ({
                start: slot.start.toISOString(),
                end: slot.end.toISOString(),
                displayTime: lang === 'ar' ? formatSlotTimeArabic(slot.start) : formatSlotTime(slot.start),
            }));

        return NextResponse.json({
            date: dateStr,
            calendarConnected: true,
            slots: formattedSlots,
        });
    } catch (error) {
        console.error('[Slots API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}
