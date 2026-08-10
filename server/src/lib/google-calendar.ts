import { google, calendar_v3 } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
const REDIRECT_URI = `${BACKEND_URL}/integrations/calendar/callback`;

export const isGoogleCalendarConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuthClient() {
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(state: string): string {
    const client = getOAuthClient();
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // forces a refresh_token on every connect, not just the first
        scope: SCOPES,
        state,
    });
}

export async function getTokensFromCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    email?: string;
}> {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
        throw new Error('Google did not return an access token');
    }

    client.setCredentials(tokens);
    let email: string | undefined;
    try {
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const { data } = await oauth2.userinfo.get();
        email = data.email || undefined;
    } catch (err) {
        console.warn('[Google Calendar] Could not fetch account email:', err);
    }

    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        email,
    };
}

function getClient(accessToken: string, refreshToken?: string): calendar_v3.Calendar {
    const auth = getOAuthClient();
    auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth });
}

export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
}

export interface Booking {
    id?: string;
    calendarEventId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    service: string;
    serviceDuration: number;
    startTime: Date;
    endTime: Date;
    notes?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

/**
 * Available slots for a given date, computed by diffing business hours
 * against the calendar's existing events (via freebusy).
 */
export async function getAvailableSlots(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    date: Date,
    serviceDuration: number,
    businessHours: { open: string; close: string }
): Promise<TimeSlot[]> {
    const calendar = getClient(accessToken, refreshToken);

    const [openHour, openMin] = businessHours.open.split(':').map(Number);
    const [closeHour, closeMin] = businessHours.close.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(openHour, openMin, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(closeHour, closeMin, 0, 0);

    const freebusy = await calendar.freebusy.query({
        requestBody: {
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            items: [{ id: calendarId }],
        },
    });

    const busy = (freebusy.data.calendars?.[calendarId]?.busy || []).map((b) => ({
        start: new Date(b.start!),
        end: new Date(b.end!),
    }));

    const slots: TimeSlot[] = [];
    const slotMs = serviceDuration * 60 * 1000;
    for (let t = dayStart.getTime(); t + slotMs <= dayEnd.getTime(); t += slotMs) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t + slotMs);
        const overlapsBusy = busy.some((b) => slotStart < b.end && slotEnd > b.start);
        slots.push({ start: slotStart, end: slotEnd, available: !overlapsBusy });
    }

    return slots;
}

export async function createBookingEvent(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    booking: Booking,
    timezone = 'Asia/Dubai'
): Promise<string> {
    const calendar = getClient(accessToken, refreshToken);

    const description = [
        `Customer: ${booking.customerName}`,
        `Phone: ${booking.customerPhone}`,
        booking.customerEmail ? `Email: ${booking.customerEmail}` : null,
        `Service: ${booking.service}`,
        booking.notes ? `Notes: ${booking.notes}` : null,
    ].filter(Boolean).join('\n');

    const event = await calendar.events.insert({
        calendarId,
        requestBody: {
            summary: `${booking.service} — ${booking.customerName}`,
            description,
            start: { dateTime: booking.startTime.toISOString(), timeZone: timezone },
            end: { dateTime: booking.endTime.toISOString(), timeZone: timezone },
        },
    });

    if (!event.data.id) {
        throw new Error('Google Calendar did not return an event id');
    }
    return event.data.id;
}

export async function cancelBookingEvent(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    eventId: string
): Promise<void> {
    const calendar = getClient(accessToken, refreshToken);
    await calendar.events.delete({ calendarId, eventId });
}

export function formatSlotTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatSlotTimeArabic(date: Date): string {
    return date.toLocaleTimeString('ar-AE', { hour: 'numeric', minute: '2-digit', hour12: true });
}
