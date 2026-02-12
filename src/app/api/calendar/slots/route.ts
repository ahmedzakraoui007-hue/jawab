import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, formatSlotTime, formatSlotTimeArabic } from '@/lib/google-calendar';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Get available booking slots
 * GET /api/calendar/slots?businessId=xxx&date=2024-01-15&duration=60
 */
export async function GET(request: NextRequest) {
    const businessId = request.nextUrl.searchParams.get('businessId');
    const dateStr = request.nextUrl.searchParams.get('date'); // YYYY-MM-DD
    const duration = parseInt(request.nextUrl.searchParams.get('duration') || '60', 10);
    const lang = request.nextUrl.searchParams.get('lang') || 'en';

    if (!businessId || !dateStr) {
        return NextResponse.json(
            { error: 'Missing required parameters: businessId, date' },
            { status: 400 }
        );
    }

    try {
        // Get business data from Firestore
        if (!db) {
            // Return demo data if Firestore not available
            return NextResponse.json({
                date: dateStr,
                slots: generateDemoSlots(new Date(dateStr), duration, lang),
            });
        }

        const businessRef = doc(db, 'businesses', businessId);
        const businessSnap = await getDoc(businessRef);

        if (!businessSnap.exists()) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const business = businessSnap.data();
        const calendar = business.googleCalendar;

        if (!calendar?.connected || !calendar?.accessToken) {
            // Return demo slots if calendar not connected
            return NextResponse.json({
                date: dateStr,
                calendarConnected: false,
                slots: generateDemoSlots(new Date(dateStr), duration, lang),
            });
        }

        // Get day of week for business hours
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

        // Get real availability from Google Calendar
        const slots = await getAvailableSlots(
            calendar.accessToken,
            calendar.refreshToken,
            calendar.calendarId || 'primary',
            date,
            duration,
            hours
        );

        // Format slots for response
        const formattedSlots = slots
            .filter(slot => slot.available)
            .map(slot => ({
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
        return NextResponse.json(
            { error: 'Failed to fetch availability' },
            { status: 500 }
        );
    }
}

/**
 * Generate demo slots for testing
 */
function generateDemoSlots(date: Date, duration: number, lang: string) {
    const slots = [];
    const now = new Date();

    // Generate slots from 10:00 to 20:00
    for (let hour = 10; hour < 20; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);

        // Skip past times for today
        if (slotStart < now) continue;

        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Randomly mark some as unavailable for demo
        if (Math.random() > 0.3) {
            slots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                displayTime: lang === 'ar' ? formatSlotTimeArabic(slotStart) : formatSlotTime(slotStart),
            });
        }

        // Also add half-hour slot
        const halfSlotStart = new Date(date);
        halfSlotStart.setHours(hour, 30, 0, 0);

        if (halfSlotStart > now && Math.random() > 0.3) {
            const halfSlotEnd = new Date(halfSlotStart.getTime() + duration * 60000);
            slots.push({
                start: halfSlotStart.toISOString(),
                end: halfSlotEnd.toISOString(),
                displayTime: lang === 'ar' ? formatSlotTimeArabic(halfSlotStart) : formatSlotTime(halfSlotStart),
            });
        }
    }

    return slots;
}
