import Twilio from 'twilio';
import type { Request } from 'express';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+14155238886

export const isTwilioConfigured = Boolean(accountSid && authToken);

let twilioClient: Twilio.Twilio | null = null;

export function getTwilioClient(): Twilio.Twilio {
    if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
    }
    if (!twilioClient) {
        twilioClient = Twilio(accountSid, authToken);
    }
    return twilioClient;
}

export function getWhatsAppNumber(): string {
    if (!whatsappNumber) {
        throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
    }
    return whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${whatsappNumber}`;
}

export interface WhatsAppMessage {
    to: string;
    body: string;
    mediaUrl?: string[];
}

export interface WhatsAppMessageResult {
    success: boolean;
    messageSid?: string;
    error?: string;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppMessageResult> {
    try {
        const client = getTwilioClient();
        const fromNumber = getWhatsAppNumber();
        const toNumber = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`;

        const result = await client.messages.create({
            from: fromNumber,
            to: toNumber,
            body: message.body,
            ...(message.mediaUrl && { mediaUrl: message.mediaUrl }),
        });

        console.log(`[WhatsApp] Message sent: ${result.sid}`);
        return { success: true, messageSid: result.sid };
    } catch (error) {
        console.error('[WhatsApp] Send error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
}

/**
 * Reconstruct the exact public URL Twilio called, from behind a reverse
 * proxy (Railway/etc.). Twilio's signature is computed over this URL, so
 * it must match exactly what Twilio dialed (scheme + host + path, no
 * query string). Express's req.path already excludes the query string.
 */
export function getTwilioRequestUrl(request: Request): string {
    const proto = request.get('x-forwarded-proto') || request.protocol || 'https';
    const host = request.get('x-forwarded-host') || request.get('host');
    return `${proto}://${host}${request.path}`;
}

/**
 * Verify that an incoming webhook request genuinely came from Twilio.
 * `params` must be the parsed application/x-www-form-urlencoded body
 * (req.body, via express.urlencoded()) — Twilio signs the exact form
 * fields it sent.
 */
export function verifyTwilioRequest(request: Request, params: Record<string, string>): boolean {
    if (!authToken) return false;

    const signature = request.get('x-twilio-signature');
    if (!signature) return false;

    const url = getTwilioRequestUrl(request);
    return Twilio.validateRequest(authToken, signature, url, params);
}

/** Format phone number for WhatsApp */
export function formatWhatsAppNumber(phone: string): string {
    let cleaned = phone.replace('whatsapp:', '').trim();
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    return `whatsapp:${cleaned}`;
}

export interface IncomingWhatsAppMessage {
    from: string;
    to: string;
    body: string;
    messageSid: string;
    numMedia: number;
    mediaUrls: string[];
    profileName?: string;
    timestamp: Date;
}

/** Parses the already-decoded urlencoded body (req.body from
 * express.urlencoded()) — the Next.js version of this read a Web
 * FormData object directly; Express instead hands us a plain object. */
export function parseWhatsAppWebhook(body: Record<string, string>): IncomingWhatsAppMessage {
    const numMedia = parseInt(body.NumMedia || '0', 10);
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
        const mediaUrl = body[`MediaUrl${i}`];
        if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    return {
        from: body.From || '',
        to: body.To || '',
        body: body.Body || '',
        messageSid: body.MessageSid || '',
        numMedia,
        mediaUrls,
        profileName: body.ProfileName || undefined,
        timestamp: new Date(),
    };
}

export function buildTwiMLResponse(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
