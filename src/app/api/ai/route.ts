import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, buildSystemPrompt, detectIntent } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversationId, businessId, channel, customerPhone } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (!businessId) {
            return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
        }

        if (!db) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        // ── Fetch the real business from Firestore ──────────────────
        const businessRef = doc(db, 'businesses', businessId);
        const businessSnap = await getDoc(businessRef);

        if (!businessSnap.exists()) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const business = businessSnap.data();

        // ── Load conversation history from Firestore ────────────────
        const convId = conversationId || `conv_${Date.now()}`;
        const convRef = doc(db, 'businesses', businessId, 'conversations', convId);
        const convSnap = await getDoc(convRef);

        let history: Array<{ role: 'user' | 'model'; content: string }> = [];

        if (convSnap.exists()) {
            const convData = convSnap.data();
            // Extract role + content only (strip timestamp for Gemini)
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

        // ── Generate AI response ────────────────────────────────────
        const startTime = Date.now();
        const response = await generateResponse(systemPrompt, history, message);
        const processingTime = Date.now() - startTime;

        // ── Persist conversation to Firestore ───────────────────────
        const now = Timestamp.now();

        const userMsg = { role: 'user', content: message, timestamp: now };
        const aiMsg = { role: 'model', content: response, timestamp: now };

        if (convSnap.exists()) {
            // Append to existing conversation
            const existingMessages = convSnap.data().messages || [];
            let updatedMessages = [...existingMessages, userMsg, aiMsg];

            // Keep history manageable — trim to last 20 messages
            if (updatedMessages.length > 20) {
                updatedMessages = updatedMessages.slice(-20);
            }

            await updateDoc(convRef, {
                messages: updatedMessages,
                lastIntent: intent.intent,
                lastMessageAt: now,
            });
        } else {
            // Create new conversation document
            await setDoc(convRef, {
                businessId,
                customerPhone: customerPhone || null,
                channel: channel || 'whatsapp',
                status: 'active',
                handledBy: 'ai',
                messages: [userMsg, aiMsg],
                lastIntent: intent.intent,
                startedAt: now,
                lastMessageAt: now,
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
        console.error('[AI API Error]', error);
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
        model: 'gemini-1.5-pro',
        capabilities: ['chat', 'intent-detection', 'multilingual'],
    });
}
