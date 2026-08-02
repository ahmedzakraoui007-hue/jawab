import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatWhatsAppNumber, isTwilioConfigured } from '@/lib/twilio';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API endpoint for sending outbound WhatsApp messages (human takeover)
 *
 * POST /api/whatsapp/send
 * Body: { conversationId: string, message: string, mediaUrl?: string }
 *
 * businessId is always resolved from the authenticated caller's own
 * account. conversationId must belong to that business, and the
 * recipient number is taken from the conversation record itself — never
 * from the request — so a signed-in user can only ever message customers
 * within their own business's conversations, not an arbitrary number via
 * the shared Twilio account.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isTwilioConfigured) {
            return NextResponse.json(
                { error: 'Twilio is not configured. Add credentials to .env.local' },
                { status: 503 }
            );
        }

        if (!isAdminConfigured) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const businessId = await resolveOwnBusinessId(request);
        if (!businessId) {
            return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
        }

        const body = await request.json();
        const { message: msg, mediaUrl, conversationId } = body;

        if (!msg || !conversationId) {
            return NextResponse.json(
                { error: 'Missing required fields: conversationId, message' },
                { status: 400 }
            );
        }

        const convRef = adminDb
            .collection('businesses')
            .doc(businessId)
            .collection('conversations')
            .doc(conversationId);

        const convDoc = await convRef.get();
        if (!convDoc.exists) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const convData = convDoc.data()!;
        const to = convData.customerPhone;
        if (!to) {
            return NextResponse.json({ error: 'Conversation has no customer phone number' }, { status: 400 });
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

        try {
            const existingMessages = convData.messages || [];
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
        } catch (dbErr) {
            // Log but don't fail the request — message was already sent
            console.error('[WhatsApp Send] Error saving to Firestore:', dbErr);
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
        requiredFields: ['conversationId', 'message'],
        optionalFields: ['mediaUrl'],
    });
}
