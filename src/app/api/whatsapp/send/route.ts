import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatWhatsAppNumber, isTwilioConfigured } from '@/lib/twilio';

/**
 * API endpoint for sending outbound WhatsApp messages
 * Used for booking confirmations, reminders, etc.
 * 
 * POST /api/whatsapp/send
 * Body: { to: string, message: string, mediaUrl?: string }
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
        const { to, message, mediaUrl } = body;

        if (!to || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: to, message' },
                { status: 400 }
            );
        }

        // Send the message
        const result = await sendWhatsAppMessage({
            to: formatWhatsAppNumber(to),
            body: message,
            mediaUrl: mediaUrl ? [mediaUrl] : undefined,
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                messageSid: result.messageSid,
            });
        } else {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }
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
        optionalFields: ['mediaUrl'],
    });
}
