import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatWhatsAppNumber, isTwilioConfigured } from '@/lib/twilio';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API endpoint for sending outbound WhatsApp messages (human takeover + notifications)
 *
 * POST /api/whatsapp/send
 * Body: { to: string, message: string, mediaUrl?: string, businessId?: string, conversationId?: string }
 */
export async function POST(request: NextRequest) {
    try {
        // Check if Twilio is configured
        if (!isTwilioConfigured) {
            return NextResponse.json(
                { error: 'Twilio is not configured. Add credentials to .env.local' },
                { status: 503 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { to, message: msg, mediaUrl, businessId, conversationId } = body;

        if (!to || !msg) {
            return NextResponse.json(
                { error: 'Missing required fields: to, message' },
                { status: 400 }
            );
        }

        // Send the message via Twilio
        const result = await sendWhatsAppMessage({
            to: formatWhatsAppNumber(to),
            body: msg,
            mediaUrl: mediaUrl ? [mediaUrl] : undefined,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // If businessId + conversationId provided, save the sent message to Firestore
        if (businessId && conversationId && adminDb) {
            try {
                const convRef = adminDb
                    .collection('businesses')
                    .doc(businessId)
                    .collection('conversations')
                    .doc(conversationId);

                const convDoc = await convRef.get();
                if (convDoc.exists) {
                    const existingMessages = convDoc.data()?.messages || [];
                    const updatedMessages = [
                        ...existingMessages,
                        {
                            role: 'model',
                            content: msg,
                            timestamp: FieldValue.serverTimestamp(),
                        },
                    ].slice(-20);

                    await convRef.update({
                        messages: updatedMessages,
                        handledBy: 'human',
                        lastMessageAt: FieldValue.serverTimestamp(),
                    });
                }
            } catch (dbErr) {
                // Log but don't fail the request — message was already sent
                console.error('[WhatsApp Send] Error saving to Firestore:', dbErr);
            }
        }

        return NextResponse.json({
            success: true,
            messageSid: result.messageSid,
        });
    } catch (error) {
        console.error('[WhatsApp Send API Error]', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint to check WhatsApp sending capability
 */
export async function GET() {
    return NextResponse.json({
        configured: isTwilioConfigured,
        endpoint: '/api/whatsapp/send',
        methods: ['POST'],
        requiredFields: ['to', 'message'],
        optionalFields: ['mediaUrl', 'businessId', 'conversationId'],
    });
}
