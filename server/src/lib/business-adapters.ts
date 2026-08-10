import type { Business } from '@prisma/client';
import type { BookingContext } from './booking-actions';

interface ServiceEntry {
    name: string;
    nameAr?: string;
    price: number;
    duration: number;
}

interface FaqEntry {
    question: string;
    answer: string;
}

type HoursMap = Record<string, { open: string; close: string } | null>;

/** Prisma's JSON columns come back as `Prisma.JsonValue` (effectively
 * `unknown`) — these columns are always written by this app's own code in
 * a known shape, so a cast here is the same trust boundary as Firestore's
 * untyped documents had, not a new risk. */
export function getServices(business: Business): ServiceEntry[] {
    return (business.services as unknown as ServiceEntry[]) || [];
}

export function getHours(business: Business): HoursMap {
    return (business.hours as unknown as HoursMap) || {};
}

export function getCustomFaqs(business: Business): FaqEntry[] {
    return (business.customFaqs as unknown as FaqEntry[]) || [];
}

export function buildSystemPromptInput(business: Business) {
    return {
        name: business.name,
        location: [business.area, business.city].filter(Boolean).join(', '),
        services: getServices(business),
        hours: getHours(business),
        address: business.address || '',
        googleMapsLink: business.googleMapsLink || undefined,
        customFaqs: getCustomFaqs(business),
        tone: (business.tone as 'friendly' | 'professional' | 'casual') || 'friendly',
    };
}

export function buildBookingContext(business: Business, customerPhone: string): BookingContext {
    return {
        businessId: business.id,
        customerPhone,
        services: getServices(business),
        hours: getHours(business),
        googleCalendar: {
            connected: business.calendarConnected,
            accessToken: business.calendarAccessToken || undefined,
            refreshToken: business.calendarRefreshToken || undefined,
            calendarId: business.calendarId || undefined,
        },
    };
}
