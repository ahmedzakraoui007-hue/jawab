import { Router } from 'express';
import { prisma } from '../db';
import { getAvailableSlots, createBookingEvent, cancelBookingEvent, formatSlotTime, formatSlotTimeArabic } from '../lib/google-calendar';
import { resolveOwnBusinessId } from '../lib/auth-guard';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { getHours } from '../lib/business-adapters';

export const calendarRouter = Router();

/**
 * GET /calendar/slots?date=2024-01-15&duration=60&lang=en
 * businessId is resolved from the authenticated caller's own account.
 */
calendarRouter.get('/slots', requireAuth, asyncHandler(async (req, res) => {
    const dateStr = req.query.date as string | undefined;
    const duration = parseInt((req.query.duration as string) || '60', 10);
    const lang = (req.query.lang as string) || 'en';

    if (!dateStr) {
        res.status(400).json({ error: 'Missing required parameter: date' });
        return;
    }

    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    if (!business.calendarConnected || !business.calendarAccessToken) {
        res.json({ date: dateStr, calendarConnected: false, slots: [], message: 'Google Calendar is not connected for this business yet.' });
        return;
    }

    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = getHours(business)[dayName];

    if (!hours) {
        res.json({ date: dateStr, closed: true, slots: [] });
        return;
    }

    const slots = await getAvailableSlots(
        business.calendarAccessToken,
        business.calendarRefreshToken || undefined,
        business.calendarId || 'primary',
        date,
        duration,
        hours
    );

    const format = lang === 'ar' ? formatSlotTimeArabic : formatSlotTime;
    res.json({
        date: dateStr,
        calendarConnected: true,
        slots: slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            available: s.available,
            display: format(s.start),
        })),
    });
}));

/**
 * GET /calendar/book — list this business's bookings
 */
calendarRouter.get('/book', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const bookings = await prisma.booking.findMany({ where: { businessId }, orderBy: { startTime: 'desc' } });
    res.json({ bookings });
}));

/**
 * POST /calendar/book — create a booking from the dashboard (manual, not
 * AI-driven — see lib/booking-actions.ts for the AI's own booking tool).
 */
calendarRouter.post('/book', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    const { customerName, customerPhone, customerEmail, service, serviceDuration, price, startTime, notes } = req.body;
    if (!customerName || !customerPhone || !service || !startTime) {
        res.status(400).json({ error: 'customerName, customerPhone, service, and startTime are required' });
        return;
    }

    const duration = Number(serviceDuration) || 60;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    let calendarEventId: string | null = null;
    if (business.calendarConnected && business.calendarAccessToken) {
        calendarEventId = await createBookingEvent(
            business.calendarAccessToken,
            business.calendarRefreshToken || undefined,
            business.calendarId || 'primary',
            { customerName, customerPhone, customerEmail, service, serviceDuration: duration, startTime: start, endTime: end, status: 'confirmed' }
        );
    }

    const booking = await prisma.booking.create({
        data: {
            businessId,
            customerName,
            customerPhone,
            customerEmail,
            service,
            serviceDuration: duration,
            price: Number(price) || 0,
            startTime: start,
            endTime: end,
            status: 'confirmed',
            calendarEventId,
            createdVia: 'dashboard',
            notes,
        },
    });

    res.status(201).json({ booking });
}));

/**
 * DELETE /calendar/book?id=... — cancel a booking. Only allowed if the
 * booking actually belongs to the caller's own business.
 */
calendarRouter.delete('/book', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await resolveOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const id = req.query.id as string | undefined;
    if (!id) {
        res.status(400).json({ error: 'Missing required parameter: id' });
        return;
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.businessId !== businessId) {
        res.status(403).json({ error: 'This booking does not belong to your business' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (booking.calendarEventId && business?.calendarConnected && business.calendarAccessToken) {
        try {
            await cancelBookingEvent(business.calendarAccessToken, business.calendarRefreshToken || undefined, business.calendarId || 'primary', booking.calendarEventId);
        } catch (err) {
            console.error('[Calendar] Failed to cancel calendar event, cancelling booking anyway:', err);
        }
    }

    await prisma.booking.update({ where: { id }, data: { status: 'cancelled' } });
    res.json({ success: true });
}));
