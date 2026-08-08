import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, buildSystemPrompt, detectIntent } from '@/lib/gemini';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { BookingContext } from '@/lib/booking-actions';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveEffectiveBilling, isUsageAllowed } from '@/lib/billing';
import { checkAndIncrementUsage } from '@/lib/usage';
import { reportError } from '@/lib/error-reporting';

const AI_RATE_LIMIT = 30;
const AI_RATE_WINDOW_SECONDS = 60;

/**
 * Dashboard "test your AI" endpoint — simulates a conversation using the
 * authenticated caller's own business data. businessId is always resolved
 * server-side, never trusted from the request body, since this prompt
 * embeds the business's services/hours/FAQs and would otherwise let any
 * signed-in user extract another business's data by guessing an ID.
 */
export async function POST(request: NextRequest) {
    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const businessId = await resolveOwnBusinessId(request);
    if (!businessId) {
        return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(`ai:${businessId}`, AI_RATE_LIMIT, AI_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Too many requests, please slow down' },
            { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || AI_RATE_WINDOW_SECONDS) } }
        );
    }

    try {
        const body = await request.json();
        const { message, conversationId, channel, customerPhone } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // ── Fetch the real business from Firestore ──────────────────
        const businessSnap = await adminDb.collection('businesses').doc(businessId).get();

        if (!businessSnap.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const business = businessSnap.data()!;

        // ── Billing/usage gate ────────────────────────────────────────
        const billing = resolveEffectiveBilling(business);
        if (!isUsageAllowed(billing.status)) {
            return NextResponse.json(
                { success: false, error: { code: 'BILLING_INACTIVE', message: `Your account is currently ${billing.status}. Please check your billing settings.` } },
                { status: 402 }
            );
        }
        const usage = await checkAndIncrementUsage(businessId, billing.plan);
        if (!usage.allowed) {
            return NextResponse.json(
                { success: false, error: { code: 'USAGE_LIMIT_REACHED', message: `You've reached your plan's monthly conversation limit (${usage.limit}). Upgrade to continue.` } },
                { status: 402 }
            );
        }

        // ── Load conversation history from Firestore ────────────────
        const convId = conversationId || `conv_${Date.now()}`;
        const convRef = adminDb.collection('businesses').doc(businessId).collection('conversations').doc(convId);
        const convSnap = await convRef.get();

        let history: Array<{ role: 'user' | 'model'; content: string }> = [];

        if (convSnap.exists) {
            const convData = convSnap.data()!;
            history = (convData.messages || []).map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'model',
                content: m.content,
            }));
        }

        // ── Detect intent ───────────────────────────────────────────
        const intent = await detectIntent(message);

        // ── Build system prompt from real business data ──────────────
        const systemPrompt = buildSystemPrompt({
            name: business.name,
            location: business.location || '',
            services: business.services || [],
            hours: business.hours || {},
            address: business.address || '',
            googleMapsLink: business.googleMapsLink,
            parkingInfo: business.parkingInfo,
            customFaqs: business.customFaqs,
            tone: business.tone,
        });

        // ── Generate AI response (with real booking/calendar tools) ──
        const bookingContext: BookingContext = {
            businessId,
            customerPhone: customerPhone || 'test-customer',
            services: business.services || [],
            hours: business.hours || {},
            googleCalendar: business.googleCalendar,
        };

        const startTime = Date.now();
        const response = await generateResponse(systemPrompt, history, message, 3, bookingContext);
        const processingTime = Date.now() - startTime;

        // ── Persist conversation to Firestore ───────────────────────
        const userMsg = { role: 'user', content: message, timestamp: Timestamp.now() };
        const aiMsg = { role: 'model', content: response, timestamp: Timestamp.now() };

        if (convSnap.exists) {
            const existingMessages = convSnap.data()!.messages || [];
            let updatedMessages = [...existingMessages, userMsg, aiMsg];

            if (updatedMessages.length > 20) {
                updatedMessages = updatedMessages.slice(-20);
            }

            await convRef.update({
                messages: updatedMessages,
                lastIntent: intent.intent,
                lastMessageAt: FieldValue.serverTimestamp(),
            });
        } else {
            await convRef.set({
                businessId,
                customerPhone: customerPhone || null,
                channel: channel || 'whatsapp',
                status: 'active',
                handledBy: 'ai',
                messages: [userMsg, aiMsg],
                lastIntent: intent.intent,
                startedAt: FieldValue.serverTimestamp(),
                lastMessageAt: FieldValue.serverTimestamp(),
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                response,
                conversationId: convId,
                intent: intent.intent,
                confidence: intent.confidence,
                processingTimeMs: processingTime,
            },
        });
    } catch (error) {
        reportError('AI API', error, { businessId });
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'AI_ERROR',
                    message: 'Failed to generate response',
                },
            },
            { status: 500 }
        );
    }
}

// Test endpoint
export async function GET() {
    return NextResponse.json({
        status: 'AI API is active',
        model: 'gemini-2.0-flash',
        capabilities: ['chat', 'intent-detection', 'multilingual'],
    });
}
