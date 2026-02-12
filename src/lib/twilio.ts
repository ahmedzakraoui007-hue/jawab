import Twilio from 'twilio';

// Twilio credentials from environment
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+14155238886

// Check if Twilio is configured
export const isTwilioConfigured = Boolean(accountSid && authToken);

// Create Twilio client (lazy initialization)
let twilioClient: Twilio.Twilio | null = null;

export function getTwilioClient(): Twilio.Twilio {
    if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.local');
    }

    if (!twilioClient) {
        twilioClient = Twilio(accountSid, authToken);
    }

    return twilioClient;
}

// Get WhatsApp sender number
export function getWhatsAppNumber(): string {
    if (!whatsappNumber) {
        throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
    }
    return whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${whatsappNumber}`;
}

// Message types
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

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppMessageResult> {
    try {
        const client = getTwilioClient();
        const fromNumber = getWhatsAppNumber();

        // Format recipient number
        const toNumber = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`;

        const result = await client.messages.create({
            from: fromNumber,
            to: toNumber,
            body: message.body,
            ...(message.mediaUrl && { mediaUrl: message.mediaUrl }),
        });

        console.log(`[WhatsApp] Message sent: ${result.sid}`);

        return {
            success: true,
            messageSid: result.sid,
        };
    } catch (error) {
        console.error('[WhatsApp] Send error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send message',
        };
    }
}

/**
 * Send a template WhatsApp message (for outbound/marketing)
 */
export async function sendWhatsAppTemplate(
    to: string,
    templateSid: string,
    variables?: Record<string, string>
): Promise<WhatsAppMessageResult> {
    try {
        const client = getTwilioClient();
        const fromNumber = getWhatsAppNumber();
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const result = await client.messages.create({
            from: fromNumber,
            to: toNumber,
            contentSid: templateSid,
            contentVariables: variables ? JSON.stringify(variables) : undefined,
        });

        return {
            success: true,
            messageSid: result.sid,
        };
    } catch (error) {
        console.error('[WhatsApp Template] Send error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send template',
        };
    }
}

/**
 * Validate Twilio webhook signature (security)
 */
export function validateTwilioSignature(
    signature: string,
    url: string,
    params: Record<string, string>
): boolean {
    if (!authToken) return false;

    return Twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Format phone number for WhatsApp
 */
export function formatWhatsAppNumber(phone: string): string {
    // Remove any existing 'whatsapp:' prefix
    let cleaned = phone.replace('whatsapp:', '').trim();

    // Ensure starts with +
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }

    return `whatsapp:${cleaned}`;
}

/**
 * Parse incoming WhatsApp webhook data
 */
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

export function parseWhatsAppWebhook(formData: FormData): IncomingWhatsAppMessage {
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);
    const mediaUrls: string[] = [];

    for (let i = 0; i < numMedia; i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string;
        if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    return {
        from: formData.get('From') as string || '',
        to: formData.get('To') as string || '',
        body: formData.get('Body') as string || '',
        messageSid: formData.get('MessageSid') as string || '',
        numMedia,
        mediaUrls,
        profileName: formData.get('ProfileName') as string || undefined,
        timestamp: new Date(),
    };
}

/**
 * Build TwiML response for Twilio
 */
export function buildTwiMLResponse(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

/**
 * Build TwiML response with media
 */
export function buildTwiMLWithMedia(message: string, mediaUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>${escapeXml(message)}</Body>
    <Media>${escapeXml(mediaUrl)}</Media>
  </Message>
</Response>`;
}

// Helper to escape XML special characters
function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
