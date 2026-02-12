/**
 * Multi-Tenant Business Types
 * Firestore schema for per-business integrations
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// Meta Integration (Facebook/Instagram)
// ============================================
export interface MetaIntegration {
    accessToken: string;           // Page access token (encrypted)
    pageId: string;                // Facebook Page ID
    pageName: string;              // Display name
    instagramAccountId?: string;   // Instagram Business Account ID
    instagramUsername?: string;    // @username
    tokenExpiresAt: Timestamp;     // Token expiration
    connectedAt: Timestamp;
    connectedBy: string;           // User ID who connected
}

// ============================================
// Google Calendar Integration
// ============================================
export interface GoogleCalendarIntegration {
    accessToken: string;           // OAuth access token (encrypted)
    refreshToken: string;          // OAuth refresh token (encrypted)
    calendarId: string;            // Calendar to use for bookings
    email: string;                 // Google account email
    connectedAt: Timestamp;
    connectedBy: string;
}

// ============================================
// Twilio Phone Numbers (Platform-Managed)
// ============================================
export interface PhoneNumberAssignment {
    number: string;                // E.164 format: "+14155238886"
    sid?: string;                  // Twilio Phone Number SID
    assignedAt: Timestamp;
    assignedBy: string;            // Admin user ID
}

// ============================================
// Business Document
// ============================================
export interface Business {
    // Basic Info
    id: string;
    ownerId: string;               // User ID of business owner
    staffIds?: string[];           // User IDs of staff members (for access control)
    name: string;
    nameAr?: string;               // Arabic name
    industry: string;
    location: string;
    address: string;
    timezone?: string;             // e.g., "Asia/Dubai"

    // Services
    services: Service[];

    // Operating Hours
    hours: Record<string, DayHours | null>;

    // Custom FAQs
    customFaqs?: FAQ[];

    // AI Settings
    tone: 'friendly' | 'professional' | 'casual';
    defaultLanguage?: 'ar' | 'en' | 'auto';

    // ============================================
    // MULTI-TENANT INTEGRATIONS
    // ============================================

    // Platform-Managed: Twilio Phone Numbers
    whatsappNumber?: PhoneNumberAssignment;
    phoneNumber?: PhoneNumberAssignment;

    // Multi-Tenant OAuth: Meta (Facebook/Instagram)
    meta?: MetaIntegration;

    // Multi-Tenant OAuth: Google Calendar
    googleCalendar?: GoogleCalendarIntegration;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// Supporting Types
// ============================================
export interface Service {
    id?: string;
    name: string;
    nameAr?: string;
    description?: string;
    price: number;
    currency?: string;             // Default: AED
    duration: number;              // Minutes
    category?: string;
}

export interface DayHours {
    open: string;                  // "09:00"
    close: string;                 // "18:00"
}

export interface FAQ {
    question: string;
    questionAr?: string;
    answer: string;
    answerAr?: string;
}

// ============================================
// Conversation Types (Updated)
// ============================================
export type ConversationChannel =
    | 'whatsapp'
    | 'voice'
    | 'messenger'
    | 'instagram_dm'
    | 'instagram_comment'
    | 'facebook_comment';

export interface Conversation {
    id: string;
    businessId: string;            // Reference to Business

    // Customer Info
    customerPhone?: string;        // For WhatsApp/Voice
    platformId?: string;           // For Meta platforms
    customerName?: string;

    // Channel
    channel: ConversationChannel;
    isPublic?: boolean;            // True for comments
    postId?: string;               // For comment threads
    commentId?: string;

    // Status
    status: 'active' | 'resolved' | 'escalated';
    handledBy: 'ai' | 'human';

    // Messages
    messages: ConversationMessage[];
    lastIntent?: string;

    // Timestamps
    startedAt: Timestamp;
    lastMessageAt: Timestamp;
    resolvedAt?: Timestamp;
}

export interface ConversationMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: Timestamp;
    channel?: ConversationChannel;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get business by WhatsApp number
 */
export function getBusinessByWhatsAppNumber(
    businesses: Business[],
    whatsappNumber: string
): Business | undefined {
    return businesses.find(b =>
        b.whatsappNumber?.number === whatsappNumber ||
        b.whatsappNumber?.number === whatsappNumber.replace('whatsapp:', '')
    );
}

/**
 * Get business by phone number
 */
export function getBusinessByPhoneNumber(
    businesses: Business[],
    phoneNumber: string
): Business | undefined {
    return businesses.find(b => b.phoneNumber?.number === phoneNumber);
}

/**
 * Get business by Meta Page ID
 */
export function getBusinessByPageId(
    businesses: Business[],
    pageId: string
): Business | undefined {
    return businesses.find(b => b.meta?.pageId === pageId);
}

/**
 * Get business by Instagram Account ID
 */
export function getBusinessByInstagramId(
    businesses: Business[],
    instagramAccountId: string
): Business | undefined {
    return businesses.find(b => b.meta?.instagramAccountId === instagramAccountId);
}
