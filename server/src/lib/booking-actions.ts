import { prisma } from '../db';
import { getAvailableSlots, createBookingEvent, formatSlotTime } from './google-calendar';

export interface BookingContext {
    businessId: string;
    customerPhone: string;
    services: Array<{ name: string; price?: number; duration?: number }>;
    hours: Record<string, { open: string; close: string } | null>;
    googleCalendar?: {
        connected?: boolean;
        accessToken?: string;
        refreshToken?: string;
        calendarId?: string;
    };
}

export async function checkAvailabilityTool(
    args: { date?: string; duration?: number },
    ctx: BookingContext
): Promise<Record<string, unknown>> {
    if (!args.date) {
        return { error: 'A date is required, in YYYY-MM-DD format.' };
    }

    const date = new Date(`${args.date}T00:00:00`);
    if (isNaN(date.getTime())) {
        return { error: 'Invalid date format — expected YYYY-MM-DD.' };
    }

    if (!ctx.googleCalendar?.connected || !ctx.googleCalendar?.accessToken) {
        return {
            calendarConnected: false,
            message:
                "This business hasn't connected its calendar yet. Don't confirm a specific time — offer to have a team member confirm availability instead.",
        };
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = ctx.hours?.[dayName];
    if (!hours) {
        return { calendarConnected: true, closed: true, message: 'The business is closed that day.' };
    }

    try {
        const duration = args.duration && args.duration > 0 ? args.duration : 60;
        const slots = await getAvailableSlots(
            ctx.googleCalendar.accessToken,
            ctx.googleCalendar.refreshToken,
            ctx.googleCalendar.calendarId || 'primary',
            date,
            duration,
            hours
        );

        const available = slots
            .filter((s) => s.available)
            .slice(0, 8)
            .map((s) => ({ time: s.start.toTimeString().slice(0, 5), display: formatSlotTime(s.start) }));

        if (available.length === 0) {
            return { calendarConnected: true, slots: [], message: 'No open slots that day — suggest another date.' };
        }

        return { calendarConnected: true, date: args.date, slots: available };
    } catch (err) {
        console.error('[BookingTool] checkAvailability error:', err);
        return { error: 'Could not check the calendar right now — offer to have a team member confirm instead.' };
    }
}

export async function createBookingTool(
    args: { customerName?: string; service?: string; date?: string; time?: string; duration?: number },
    ctx: BookingContext
): Promise<Record<string, unknown>> {
    if (!args.customerName || !args.service || !args.date || !args.time) {
        return { error: 'Missing one of customerName, service, date, or time — ask the customer for whichever is missing.' };
    }

    const matchedService = ctx.services.find((s) => s.name.toLowerCase() === args.service!.toLowerCase());
    const duration = args.duration && args.duration > 0 ? args.duration : matchedService?.duration || 60;
    const price = matchedService?.price;

    const start = new Date(`${args.date}T${args.time}:00`);
    if (isNaN(start.getTime())) {
        return { error: 'Invalid date/time — date must be YYYY-MM-DD and time must be HH:MM (24-hour).' };
    }
    const end = new Date(start.getTime() + duration * 60000);

    let calendarEventId: string | null = null;

    try {
        if (ctx.googleCalendar?.connected && ctx.googleCalendar?.accessToken) {
            calendarEventId = await createBookingEvent(
                ctx.googleCalendar.accessToken,
                ctx.googleCalendar.refreshToken,
                ctx.googleCalendar.calendarId || 'primary',
                {
                    customerName: args.customerName,
                    customerPhone: ctx.customerPhone,
                    service: args.service,
                    serviceDuration: duration,
                    startTime: start,
                    endTime: end,
                    status: 'confirmed',
                }
            );
        }

        const booking = await prisma.booking.create({
            data: {
                businessId: ctx.businessId,
                customerName: args.customerName,
                customerPhone: ctx.customerPhone,
                service: args.service,
                serviceDuration: duration,
                price: typeof price === 'number' ? price : 0,
                startTime: start,
                endTime: end,
                status: 'confirmed',
                calendarEventId,
                createdVia: 'ai',
            },
        });

        return {
            success: true,
            bookingId: booking.id,
            confirmedTime: formatSlotTime(start),
            calendarSynced: Boolean(calendarEventId),
        };
    } catch (err) {
        console.error('[BookingTool] createBooking error:', err);
        return {
            error: 'Could not create the booking due to a technical issue — apologize and offer to have a team member confirm manually.',
        };
    }
}

export async function executeBookingFunction(
    name: string,
    args: Record<string, unknown>,
    ctx: BookingContext
): Promise<Record<string, unknown>> {
    if (name === 'check_availability') return checkAvailabilityTool(args, ctx);
    if (name === 'create_booking') return createBookingTool(args, ctx);
    return { error: `Unknown function: ${name}` };
}
