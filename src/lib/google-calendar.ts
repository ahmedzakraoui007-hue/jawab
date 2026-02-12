/**
 * Google Calendar Integration for Jawab Booking System
 * 
 * This module handles:
 * - OAuth2 authentication with Google
 * - Calendar availability checking
 * - Appointment creation and management
 * - Recurring availability slots
 */

import { google, calendar_v3 } from 'googleapis';
import { getAppUrl } from '@/lib/utils';

// Environment variables
const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI = getAppUrl() + '/api/integrations/calendar/callback';

// Check if Google Calendar is configured
export const isGoogleCalendarConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

// OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Scopes required for calendar access
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthUrl(state?: string): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Always show consent to get refresh token
        state,
    });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
}> {
    const { tokens } = await oauth2Client.getToken(code);
    return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
    };
}

/**
 * Create an authenticated Calendar client
 */
export function getCalendarClient(accessToken: string, refreshToken?: string): calendar_v3.Calendar {
    const authClient = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    authClient.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    return google.calendar({ version: 'v3', auth: authClient });
}

/**
 * Time slot structure
 */
export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
}

/**
 * Booking structure
 */
export interface Booking {
    id?: string;
    calendarEventId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    service: string;
    serviceDuration: number; // minutes
    startTime: Date;
    endTime: Date;
    notes?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

/**
 * Get busy times from Google Calendar
 */
export async function getBusyTimes(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    startDate: Date,
    endDate: Date
): Promise<Array<{ start: Date; end: Date }>> {
    const calendar = getCalendarClient(accessToken, refreshToken);

    try {
        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                items: [{ id: calendarId }],
            },
        });

        const busy = response.data.calendars?.[calendarId]?.busy || [];

        return busy.map(slot => ({
            start: new Date(slot.start!),
            end: new Date(slot.end!),
        }));
    } catch (error) {
        console.error('[Calendar] Error getting busy times:', error);
        throw error;
    }
}

/**
 * Get available time slots for a given date
 */
export async function getAvailableSlots(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    date: Date,
    serviceDuration: number, // minutes
    businessHours: { open: string; close: string } // e.g., { open: '09:00', close: '18:00' }
): Promise<TimeSlot[]> {
    // Set up date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get busy times
    const busyTimes = await getBusyTimes(
        accessToken,
        refreshToken,
        calendarId,
        startOfDay,
        endOfDay
    );

    // Parse business hours
    const [openHour, openMin] = businessHours.open.split(':').map(Number);
    const [closeHour, closeMin] = businessHours.close.split(':').map(Number);

    // Generate all possible slots
    const slots: TimeSlot[] = [];
    const slotDuration = serviceDuration;

    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMin, 0, 0);

    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMin, 0, 0);

    while (currentTime.getTime() + slotDuration * 60000 <= closeTime.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);

        // Check if slot conflicts with any busy time
        const isAvailable = !busyTimes.some(busy =>
            (slotStart < busy.end && slotEnd > busy.start)
        );

        slots.push({
            start: slotStart,
            end: slotEnd,
            available: isAvailable,
        });

        // Move to next slot
        currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    return slots;
}

/**
 * Create a calendar event for a booking
 */
export async function createBookingEvent(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    booking: Booking,
    timezone: string = 'Asia/Dubai'
): Promise<string> {
    const calendar = getCalendarClient(accessToken, refreshToken);

    try {
        const event = await calendar.events.insert({
            calendarId,
            requestBody: {
                summary: `📅 ${booking.service} - ${booking.customerName}`,
                description: `
Customer: ${booking.customerName}
Phone: ${booking.customerPhone}
${booking.customerEmail ? `Email: ${booking.customerEmail}` : ''}
Service: ${booking.service}
Duration: ${booking.serviceDuration} minutes
${booking.notes ? `Notes: ${booking.notes}` : ''}

Booked via Jawab AI
        `.trim(),
                start: {
                    dateTime: booking.startTime.toISOString(),
                    timeZone: timezone,
                },
                end: {
                    dateTime: booking.endTime.toISOString(),
                    timeZone: timezone,
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 }, // 1 hour before
                        { method: 'popup', minutes: 15 }, // 15 min before
                    ],
                },
                colorId: '9', // Blue
            },
        });

        return event.data.id!;
    } catch (error) {
        console.error('[Calendar] Error creating event:', error);
        throw error;
    }
}

/**
 * Cancel/delete a calendar event
 */
export async function cancelBookingEvent(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    eventId: string
): Promise<void> {
    const calendar = getCalendarClient(accessToken, refreshToken);

    try {
        await calendar.events.delete({
            calendarId,
            eventId,
        });
    } catch (error) {
        console.error('[Calendar] Error cancelling event:', error);
        throw error;
    }
}

/**
 * Update a calendar event
 */
export async function updateBookingEvent(
    accessToken: string,
    refreshToken: string | undefined,
    calendarId: string,
    eventId: string,
    updates: Partial<Pick<Booking, 'startTime' | 'endTime' | 'notes'>>,
    timezone: string = 'Asia/Dubai'
): Promise<void> {
    const calendar = getCalendarClient(accessToken, refreshToken);

    try {
        const updateData: calendar_v3.Schema$Event = {};

        if (updates.startTime) {
            updateData.start = {
                dateTime: updates.startTime.toISOString(),
                timeZone: timezone,
            };
        }

        if (updates.endTime) {
            updateData.end = {
                dateTime: updates.endTime.toISOString(),
                timeZone: timezone,
            };
        }

        await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: updateData,
        });
    } catch (error) {
        console.error('[Calendar] Error updating event:', error);
        throw error;
    }
}

/**
 * Get list of user's calendars
 */
export async function getCalendarList(
    accessToken: string,
    refreshToken?: string
): Promise<Array<{ id: string; name: string; primary: boolean }>> {
    const calendar = getCalendarClient(accessToken, refreshToken);

    try {
        const response = await calendar.calendarList.list();

        return (response.data.items || []).map(cal => ({
            id: cal.id!,
            name: cal.summary || 'Unnamed Calendar',
            primary: cal.primary || false,
        }));
    } catch (error) {
        console.error('[Calendar] Error listing calendars:', error);
        throw error;
    }
}

/**
 * Format date for display
 */
export function formatSlotTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Format date for Arabic display
 */
export function formatSlotTimeArabic(date: Date): string {
    return date.toLocaleTimeString('ar-AE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
