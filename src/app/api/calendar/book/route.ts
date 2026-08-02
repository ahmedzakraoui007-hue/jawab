import { NextRequest, NextResponse } from 'next/server';
import { createBookingEvent, cancelBookingEvent, Booking } from '@/lib/google-calendar';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';

/**
 * Resolve the businessId for the authenticated user.
 * Checks: (1) explicit query param, (2) user's Firestore doc.
 */
async function resolveBusinessId(
    explicitId: string | null | undefined,
    request: NextRequest
): Promise<string | null> {
    if (explicitId) return explicitId;

    const uid = request.headers.get('x-user-uid');
    if (!uid) return null;

    try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        return userDoc.data()?.businessId || null;
    } catch {
        return null;
    }
}

/**
 * List bookings for a business
 * GET /api/calendar/book?businessId=xxx
 */
export async function GET(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const explicitId = request.nextUrl.searchParams.get('businessId');
    const businessId = await resolveBusinessId(explicitId, request);

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
            price,
            createdVia,
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
                    price: typeof price === 'number' ? price : 0,
                    startTime: Timestamp.fromDate(start),
                    endTime: Timestamp.fromDate(end),
                    calendarEventId,
                    createdAt: serverTimestamp(),
                    createdVia: createdVia || 'api',
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
