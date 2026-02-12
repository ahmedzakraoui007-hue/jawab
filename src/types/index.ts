// ============================================
// JAWAB TYPE DEFINITIONS
// ============================================

// ==================== BUSINESS ====================

export interface Business {
    id: string;
    name: string;
    nameAr?: string;
    phone: string;
    whatsappNumber: string;
    email: string;

    // Location
    address: string;
    addressAr?: string;
    googleMapsLink?: string;
    area: string;
    city: string;
    country: string;

    // Business Info
    industry: BusinessIndustry;
    description?: string;
    descriptionAr?: string;

    // Hours
    hours: BusinessHours;

    // Services
    services: Service[];

    // AI Configuration
    aiConfig: AIConfig;

    // Integrations
    integrations: Integrations;

    // Subscription
    plan: SubscriptionPlan;
    status: BusinessStatus;

    // Owner
    ownerId: string;

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export type BusinessIndustry =
    | 'salon'
    | 'spa'
    | 'restaurant'
    | 'cafe'
    | 'clinic'
    | 'dental'
    | 'gym'
    | 'yoga'
    | 'photography'
    | 'other';

export type BusinessStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface BusinessHours {
    monday: DayHours | null;
    tuesday: DayHours | null;
    wednesday: DayHours | null;
    thursday: DayHours | null;
    friday: DayHours | null;
    saturday: DayHours | null;
    sunday: DayHours | null;
}

export interface DayHours {
    open: string; // HH:mm format
    close: string; // HH:mm format
}

// ==================== SERVICES ====================

export interface Service {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    price: number;
    currency: string;
    duration: number; // in minutes
    category?: string;
    isActive: boolean;
}

// ==================== AI CONFIG ====================

export interface AIConfig {
    defaultLanguage: Language;
    tone: AITone;
    greeting: string;
    greetingAr?: string;
    escalationThreshold: number;
    customFaqs: FAQ[];
    restrictions?: string[];
    upsells?: string[];
}

export type Language = 'ar' | 'en' | 'hi' | 'ur' | 'tl' | 'ru';
export type AITone = 'friendly' | 'professional' | 'casual';

export interface FAQ {
    id: string;
    question: string;
    questionAr?: string;
    answer: string;
    answerAr?: string;
}

// ==================== INTEGRATIONS ====================

export interface Integrations {
    calendar?: CalendarIntegration;
    whatsapp?: WhatsAppIntegration;
    voice?: VoiceIntegration;
    instagram?: InstagramIntegration;
    payment?: PaymentIntegration[];
}

export interface CalendarIntegration {
    type: 'google' | 'fresha' | 'booksy' | 'custom';
    calendarId: string;
    connected: boolean;
    lastSync?: string;
}

export interface WhatsAppIntegration {
    phoneNumber: string;
    connected: boolean;
    lastActive?: string;
}

export interface VoiceIntegration {
    phoneNumber: string;
    connected: boolean;
    voiceId?: string; // ElevenLabs voice ID
}

export interface InstagramIntegration {
    username: string;
    connected: boolean;
    accessToken?: string;
}

export interface PaymentIntegration {
    type: 'cash' | 'card' | 'tabby' | 'stripe' | 'network';
    enabled: boolean;
}

// ==================== SUBSCRIPTION ====================

export type SubscriptionPlan = 'starter' | 'professional' | 'business' | 'enterprise';

export interface Subscription {
    plan: SubscriptionPlan;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    conversationsUsed: number;
    conversationsLimit: number;
    voiceMinutesUsed: number;
    voiceMinutesLimit: number;
}

// ==================== CONVERSATIONS ====================

export interface Conversation {
    id: string;
    businessId: string;

    // Customer
    customerPhone: string;
    customerName?: string;
    customerLanguage: Language;

    // Channel
    channel: Channel;

    // Status
    status: ConversationStatus;
    isEscalated: boolean;
    assignedTo?: string; // User ID if human takeover

    // Metrics
    totalMessages: number;
    bookingsMade: number;

    // Timestamps
    lastMessageAt: string;
    createdAt: string;
}

export type Channel = 'whatsapp' | 'voice' | 'instagram';
export type ConversationStatus = 'active' | 'resolved' | 'escalated' | 'archived';

// ==================== MESSAGES ====================

export interface Message {
    id: string;
    conversationId: string;

    // Content
    role: 'user' | 'assistant' | 'system';
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'audio' | 'video' | 'document';

    // AI Metadata
    intent?: string;
    confidence?: number;
    tokensUsed?: number;
    processingTimeMs?: number;

    // Status
    status: MessageStatus;
    errorMessage?: string;

    // Timestamps
    timestamp: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// ==================== BOOKINGS ====================

export interface Booking {
    id: string;
    businessId: string;
    conversationId?: string;

    // Customer
    customerPhone: string;
    customerName: string;
    customerEmail?: string;

    // Booking Details
    serviceId: string;
    serviceName: string;
    dateTime: string; // ISO 8601
    duration: number; // minutes
    price: number;
    currency: string;

    // Status
    status: BookingStatus;

    // Staff
    staffId?: string;
    staffName?: string;

    // Calendar
    calendarEventId?: string;

    // Reminders
    reminders: {
        '24h': { sent: boolean; sentAt?: string };
        '2h': { sent: boolean; sentAt?: string };
    };

    // Source
    source: Channel | 'dashboard' | 'website';
    bookedByAi: boolean;

    // Notes
    notes?: string;

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export type BookingStatus =
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'no_show'
    | 'rescheduled';

// ==================== USERS ====================

export interface User {
    id: string;
    email: string;
    phone?: string;
    displayName: string;
    photoUrl?: string;
    role: UserRole;
    businessId?: string;

    // Preferences
    language: Language;
    timezone: string;

    // Timestamps
    createdAt: string;
    lastLoginAt?: string;
}

export type UserRole = 'owner' | 'admin' | 'staff';

// ==================== ANALYTICS ====================

export interface DashboardMetrics {
    today: {
        conversations: number;
        bookings: number;
        revenue: number;
        avgResponseTime: number; // seconds
    };
    week: {
        conversations: number;
        bookings: number;
        revenue: number;
    };
    month: {
        conversations: number;
        bookings: number;
        revenue: number;
    };
    channelBreakdown: {
        whatsapp: number;
        voice: number;
        instagram: number;
    };
    languageBreakdown: Record<Language, number>;
    topIntents: Array<{ intent: string; count: number }>;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ==================== WEBHOOKS ====================

export interface WhatsAppWebhookPayload {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
    NumMedia?: string;
    MediaUrl0?: string;
    MediaContentType0?: string;
}

export interface VoiceWebhookPayload {
    CallSid: string;
    From: string;
    To: string;
    CallStatus: string;
    SpeechResult?: string;
    Confidence?: string;
}
