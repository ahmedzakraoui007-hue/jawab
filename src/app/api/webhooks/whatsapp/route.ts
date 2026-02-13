import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, buildSystemPrompt, detectIntent } from '@/lib/gemini';
import { parseWhatsAppWebhook, buildTwiMLResponse, isTwilioConfigured } from '@/lib/twilio';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * TWILIO WEBHOOK SETUP:
 *
 * 1. Go to https://console.twilio.com/
 * 2. Navigate to: Messaging → Try it out → Send a WhatsApp message
 * 3. In the Sandbox Configuration, set:
 *    - "WHEN A MESSAGE COMES IN" webhook URL to:
 *      https://jawab-eight.vercel.app/api/webhooks/whatsapp
 *    - Method: POST
 * 4. Send "join <sandbox-keyword>" from your WhatsApp to the Twilio sandbox number
 * 5. Now messages sent to the sandbox number will hit this webhook
 */

// Types
interface ConversationMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: FirebaseFirestore.Timestamp;
}

/**
 * MULTI-TENANT: Get business data by WhatsApp number
 */
async function getBusinessByPhone(whatsappNumber: string): Promise<{ business: FirebaseFirestore.DocumentData; businessId: string } | null> {
    // Clean up the number (remove whatsapp: prefix)
    const cleanNumber = whatsappNumber.replace('whatsapp:', '');

    try {
        const businessesRef = adminDb.collection('businesses');

        // Try new nested structure: whatsappNumber.number
        let snapshot = await businessesRef.where('whatsappNumber.number', '==', cleanNumber).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[WhatsApp] Found business by whatsappNumber.number: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Try with whatsapp: prefix
        snapshot = await businessesRef.where('whatsappNumber.number', '==', `whatsapp:${cleanNumber}`).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[WhatsApp] Found business by whatsappNumber.number (with prefix): ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Legacy: Try flat whatsappNumber field
        snapshot = await businessesRef.where('whatsappNumber', '==', cleanNumber).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[WhatsApp] Found business by legacy whatsappNumber: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Fallback to first business
        console.log(`[WhatsApp] No business found for ${cleanNumber}, using first available`);
        const allBusinesses = await businessesRef.limit(1).get();
        if (!allBusinesses.empty) {
            const doc = allBusinesses.docs[0];
            return { business: doc.data(), businessId: doc.id };
        }

        console.error(`[WhatsApp] No businesses found in Firestore at all`);
        return null;
    } catch (error) {
        console.error('[WhatsApp] Error fetching business:', error);
        return null;
    }
}


/**
 * Get or create conversation history from Firestore
 */
async function getConversationHistory(
    phoneNumber: string,
    businessId: string,
    profileName?: string
): Promise<{ id: string; messages: ConversationMessage[] }> {
    try {
        // Find existing active conversation in the business subcollection
        const convsRef = adminDb.collection('businesses').doc(businessId).collection('conversations');
        const snapshot = await convsRef
            .where('customerPhone', '==', phoneNumber)
            .where('channel', '==', 'whatsapp')
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const convDoc = snapshot.docs[0];
            return {
                id: convDoc.id,
                messages: convDoc.data().messages || [],
            };
        }

        // Create new conversation
        const newConvRef = await convsRef.add({
            businessId,
            customerPhone: phoneNumber,
            customerName: profileName || phoneNumber,
            channel: 'whatsapp',
            status: 'active',
            handledBy: 'ai',
            messages: [],
            startedAt: FieldValue.serverTimestamp(),
            lastMessageAt: FieldValue.serverTimestamp(),
        });

        return { id: newConvRef.id, messages: [] };
    } catch (error) {
        console.error('[WhatsApp] Error with conversation history:', error);
        return { id: `fallback_${Date.now()}`, messages: [] };
    }
}

/**
 * Save conversation messages to Firestore
 */
async function saveMessage(
    businessId: string,
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    intent: { intent: string; confidence: number }
): Promise<void> {
    try {
        const convRef = adminDb
            .collection('businesses').doc(businessId)
            .collection('conversations').doc(conversationId);

        const convDoc = await convRef.get();
        const existingMessages = convDoc.exists ? (convDoc.data()?.messages || []) : [];

        const now = FieldValue.serverTimestamp();
        const newMessages = [
            ...existingMessages,
            { role: 'user', content: userMessage, timestamp: now },
            { role: 'model', content: aiResponse, timestamp: now },
        ].slice(-20); // Keep last 20

        await convRef.update({
            messages: newMessages,
            lastMessageAt: FieldValue.serverTimestamp(),
            lastIntent: intent.intent,
        });
    } catch (error) {
        console.error('[WhatsApp] Error saving message:', error);
    }
}

/**
 * Main WhatsApp webhook handler
 */
export async function POST(request: NextRequest) {
    try {
        // Parse incoming message
        const formData = await request.formData();
        const incoming = parseWhatsAppWebhook(formData);

        console.log(`[WhatsApp] From: ${incoming.from}, Message: "${incoming.body}", Profile: ${incoming.profileName}`);

        if (!incoming.from || !incoming.body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check Firebase Admin is configured
        if (!isAdminConfigured) {
            console.error('[WhatsApp] Firebase Admin SDK not configured — set FIREBASE_ADMIN_* env vars');
            const twiml = buildTwiMLResponse("I'm sorry, we're not set up yet. Please try again later.");
            return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
        }

        // Get the business data (MULTI-TENANT)
        const toNumber = incoming.to.replace('whatsapp:', '');
        const result = await getBusinessByPhone(toNumber);

        if (!result) {
            console.error('[WhatsApp] No business found, cannot process message');
            const twiml = buildTwiMLResponse("I'm sorry, we're not set up yet. Please try again later.");
            return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
        }

        const { business, businessId } = result;
        console.log(`[WhatsApp] Business: ${business.name} (${businessId})`);

        // Detect intent first
        const intent = await detectIntent(incoming.body);
        console.log(`[WhatsApp] Intent: ${intent.intent} (${Math.round(intent.confidence * 100)}%)`);

        // Get conversation history
        const conversation = await getConversationHistory(incoming.from, businessId, incoming.profileName);

        // Build system prompt with business data
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

        // Convert stored messages to format expected by Gemini
        const historyForAI = conversation.messages.map((m: ConversationMessage) => ({
            role: m.role,
            content: m.content,
        }));

        // Generate AI response
        const aiResponse = await generateResponse(systemPrompt, historyForAI, incoming.body);

        // Save to conversation history
        await saveMessage(businessId, conversation.id, incoming.body, aiResponse, intent);

        // Return TwiML response
        const twiml = buildTwiMLResponse(aiResponse);

        return new NextResponse(twiml, {
            headers: { 'Content-Type': 'text/xml' },
        });

    } catch (error) {
        console.error('[WhatsApp Webhook Error]', error);

        const errorTwiml = buildTwiMLResponse(
            "I'm sorry, I'm having a moment. Please try again! 🙏"
        );

        return new NextResponse(errorTwiml, {
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET() {
    return NextResponse.json({
        status: 'WhatsApp webhook is active',
        configured: isTwilioConfigured,
        firebaseAdmin: isAdminConfigured,
        timestamp: new Date().toISOString(),
    });
}
