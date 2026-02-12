import { NextRequest, NextResponse } from 'next/server';
import { createBookingEvent, cancelBookingEvent, Booking } from '@/lib/google-calendar';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * Create a new booking
 * POST /api/calendar/book
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            businessId,
            customerName,
            customerPhone,
            customerEmail,
            service,
            serviceDuration,
            startTime,
            notes,
        } = body;

        // Validate required fields
        if (!businessId || !customerName || !customerPhone || !service || !startTime) {
            return NextResponse.json(
                { error: 'Missing required fields: businessId, customerName, customerPhone, service, startTime' },
                { status: 400 }
            );
        }

        const start = new Date(startTime);
        const duration = serviceDuration || 60;
        const end = new Date(start.getTime() + duration * 60000);

        // Create booking object
        const booking: Booking = {
            customerName,
            customerPhone,
            customerEmail,
            service,
            serviceDuration: duration,
            startTime: start,
            endTime: end,
            notes,
            status: 'confirmed',
        };

        let calendarEventId: string | null = null;

        // Get business data and create calendar event if connected
        if (db) {
            try {
                const businessRef = doc(db, 'businesses', businessId);
                const businessSnap = await getDoc(businessRef);

                if (businessSnap.exists()) {
                    const business = businessSnap.data();
                    const calendar = business.googleCalendar;

                    if (calendar?.connected && calendar?.accessToken) {
                        // Create Google Calendar event
                        calendarEventId = await createBookingEvent(
                            calendar.accessToken,
                            calendar.refreshToken,
                            calendar.calendarId || 'primary',
                            booking
                        );
                        booking.calendarEventId = calendarEventId;
                    }
                }

                // Save booking to Firestore
                const bookingRef = await addDoc(collection(db, 'bookings'), {
                    ...booking,
                    businessId,
                    startTime: Timestamp.fromDate(start),
                    endTime: Timestamp.fromDate(end),
                    calendarEventId,
                    createdAt: serverTimestamp(),
                    createdVia: 'api',
                });

                booking.id = bookingRef.id;

            } catch (dbError) {
                console.error('[Booking] Firestore error:', dbError);
                // Continue without Firestore - booking still valid
            }
        }

        return NextResponse.json({
            success: true,
            booking: {
                id: booking.id || 'demo-' + Date.now(),
                customerName,
                service,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                status: 'confirmed',
                calendarEventId,
            },
        });

    } catch (error) {
        console.error('[Booking API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create booking' },
            { status: 500 }
        );
    }
}

/**
 * Cancel a booking
 * DELETE /api/calendar/book?bookingId=xxx&businessId=xxx
 */
export async function DELETE(request: NextRequest) {
    const bookingId = request.nextUrl.searchParams.get('bookingId');
    const businessId = request.nextUrl.searchParams.get('businessId');

    if (!bookingId || !businessId) {
        return NextResponse.json(
            { error: 'Missing bookingId or businessId' },
            { status: 400 }
        );
    }

    try {
        if (!db) {
            return NextResponse.json({ success: true, message: 'Booking cancelled (demo mode)' });
        }

        // Get booking details
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const bookingData = bookingSnap.data();

        // Cancel calendar event if exists
        if (bookingData.calendarEventId) {
            const businessRef = doc(db, 'businesses', businessId);
            const businessSnap = await getDoc(businessRef);

            if (businessSnap.exists()) {
                const business = businessSnap.data();
                const calendar = business.googleCalendar;

                if (calendar?.accessToken) {
                    try {
                        await cancelBookingEvent(
                            calendar.accessToken,
                            calendar.refreshToken,
                            calendar.calendarId || 'primary',
                            bookingData.calendarEventId
                        );
                    } catch (calError) {
                        console.error('[Booking] Calendar cancel error:', calError);
                    }
                }
            }
        }

        // Update booking status
        await updateDoc(bookingRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
        });

        return NextResponse.json({ success: true, message: 'Booking cancelled' });

    } catch (error) {
        console.error('[Booking Cancel] Error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel booking' },
            { status: 500 }
        );
    }
}
