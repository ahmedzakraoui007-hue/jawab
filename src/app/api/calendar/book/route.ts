import { NextRequest, NextResponse } from 'next/server';
import { createBookingEvent, cancelBookingEvent, Booking } from '@/lib/google-calendar';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * List bookings for a business
 * GET /api/calendar/book
 */
export async function GET(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const businessId = await resolveOwnBusinessId(request);

    if (!businessId) {
        return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    try {
        const snap = await adminDb.collection('bookings').where('businessId', '==', businessId).get();

        const bookings = snap.docs
            .map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    customerName: data.customerName ?? '',
                    customerPhone: data.customerPhone ?? '',
                    customerEmail: data.customerEmail ?? null,
                    service: data.service ?? '',
                    price: typeof data.price === 'number' ? data.price : 0,
                    duration: data.serviceDuration ?? 60,
                    startTime: data.startTime?.toDate?.()?.toISOString() ?? null,
                    endTime: data.endTime?.toDate?.()?.toISOString() ?? null,
                    status: (data.status ?? 'confirmed') as Booking['status'],
                    source: data.createdVia ?? 'dashboard',
                };
            })
            .filter((b) => b.status !== 'cancelled' && b.startTime)
            .sort((a, b) => (a.startTime as string).localeCompare(b.startTime as string));

        return NextResponse.json({ bookings, businessId });
    } catch (error) {
        console.error('[Bookings API] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}

/**
 * Create a new booking
 * POST /api/calendar/book
 *
 * businessId is always resolved from the authenticated caller's own
 * account, never trusted from the request body — a signed-in user can
 * only ever create bookings for their own business.
 */
export async function POST(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const businessId = await resolveOwnBusinessId(request);
    if (!businessId) {
        return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const {
            customerName,
            customerPhone,
            customerEmail,
            service,
            serviceDuration,
            startTime,
            notes,
            price,
            createdVia,
        } = body;

        if (!customerName || !customerPhone || !service || !startTime) {
            return NextResponse.json(
                { error: 'Missing required fields: customerName, customerPhone, service, startTime' },
                { status: 400 }
            );
        }

        const start = new Date(startTime);
        const duration = serviceDuration || 60;
        const end = new Date(start.getTime() + duration * 60000);

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

        try {
            const businessSnap = await adminDb.collection('businesses').doc(businessId).get();

            if (businessSnap.exists) {
                const business = businessSnap.data()!;
                const calendar = business.googleCalendar;

                if (calendar?.connected && calendar?.accessToken) {
                    calendarEventId = await createBookingEvent(
                        calendar.accessToken,
                        calendar.refreshToken,
                        calendar.calendarId || 'primary',
                        booking
                    );
                    booking.calendarEventId = calendarEventId;
                }
            }

            const bookingRef = await adminDb.collection('bookings').add({
                ...booking,
                businessId,
                price: typeof price === 'number' ? price : 0,
                startTime: Timestamp.fromDate(start),
                endTime: Timestamp.fromDate(end),
                calendarEventId,
                createdAt: FieldValue.serverTimestamp(),
                createdVia: createdVia || 'api',
            });

            booking.id = bookingRef.id;
        } catch (dbError) {
            console.error('[Booking] Firestore error:', dbError);
            return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            booking: {
                id: booking.id,
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
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}

/**
 * Cancel a booking
 * DELETE /api/calendar/book?bookingId=xxx
 *
 * The booking's own businessId field must match the authenticated
 * caller's business — prevents cancelling another business's booking by
 * guessing a bookingId.
 */
export async function DELETE(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const bookingId = request.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
        return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const businessId = await resolveOwnBusinessId(request);
    if (!businessId) {
        return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
    }

    try {
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const bookingData = bookingSnap.data()!;

        if (bookingData.businessId !== businessId) {
            return NextResponse.json({ error: 'Not authorized to cancel this booking' }, { status: 403 });
        }

        // Cancel calendar event if one exists
        if (bookingData.calendarEventId) {
            const businessSnap = await adminDb.collection('businesses').doc(businessId).get();

            if (businessSnap.exists) {
                const calendar = businessSnap.data()?.googleCalendar;

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

        await bookingRef.update({
            status: 'cancelled',
            cancelledAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, message: 'Booking cancelled' });
    } catch (error) {
        console.error('[Booking Cancel] Error:', error);
        return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }
}
