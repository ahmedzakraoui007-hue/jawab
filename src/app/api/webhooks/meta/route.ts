import { NextRequest, NextResponse } from 'next/server';
import {
    verifyWebhook,
    parseWebhookPayload,
    sendDirectMessage,
    replyToComment,
    sendTypingIndicator,
    ParsedMetaMessage,
    MetaWebhookEntry,
} from '@/lib/meta';
import { generateResponse, buildSystemPrompt, detectIntent } from '@/lib/gemini';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * MULTI-TENANT: Get business by Meta Page ID or Instagram Account ID
 */
async function getBusinessByMetaId(pageId: string): Promise<{ business: FirebaseFirestore.DocumentData; businessId: string } | null> {
    try {
        const businessesRef = adminDb.collection('businesses');

        // Try to find by Page ID
        let snapshot = await businessesRef.where('meta.pageId', '==', pageId).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[Meta] Found business by pageId: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Try to find by Instagram Account ID
        snapshot = await businessesRef.where('meta.instagramAccountId', '==', pageId).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[Meta] Found business by instagramAccountId: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Fallback to first business
        console.log(`[Meta] No business found for pageId ${pageId}, using first available`);
        const allBusinesses = await businessesRef.limit(1).get();
        if (!allBusinesses.empty) {
            const doc = allBusinesses.docs[0];
            return { business: doc.data(), businessId: doc.id };
        }

        console.error(`[Meta] No businesses found in Firestore at all`);
        return null;
    } catch (error) {
        console.error('[Meta] Error fetching business:', error);
        return null;
    }
}

async function getConversationHistory(
    senderId: string,
    channel: string,
    businessId: string
): Promise<{ id: string; messages: Array<{ role: string; content: string }> }> {
    try {
        const convsRef = adminDb.collection('businesses').doc(businessId).collection('conversations');
        const snapshot = await convsRef
            .where('platformId', '==', senderId)
            .where('channel', '==', channel)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const convDoc = snapshot.docs[0];
            return { id: convDoc.id, messages: convDoc.data().messages || [] };
        }

        // Create new conversation
        const newConvRef = await convsRef.add({
            businessId,
            platformId: senderId,
            channel,
            status: 'active',
            handledBy: 'ai',
            messages: [],
            startedAt: FieldValue.serverTimestamp(),
            lastMessageAt: FieldValue.serverTimestamp(),
        });
        return { id: newConvRef.id, messages: [] };
    } catch (e) {
        console.error('[Meta] Conversation error:', e);
        return { id: `fallback_${Date.now()}`, messages: [] };
    }
}

async function saveMessage(
    businessId: string,
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    intent: { intent: string; confidence: number },
    metadata?: { postId?: string; commentId?: string; isPublic?: boolean }
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
        ].slice(-20);

        await convRef.update({
            messages: newMessages,
            lastMessageAt: FieldValue.serverTimestamp(),
            lastIntent: intent.intent,
            ...metadata,
        });
    } catch (e) {
        console.error('[Meta] Save message error:', e);
    }
}

/**
 * Process message with MULTI-TENANT business lookup
 */
async function processMessage(message: ParsedMetaMessage, pageId: string): Promise<string | null> {
    console.log(`[Meta] ${message.platform} from ${message.senderId}: "${message.text}" (page: ${pageId})`);

    // MULTI-TENANT: Get business by Page ID
    const result = await getBusinessByMetaId(pageId);
    if (!result) {
        console.error('[Meta] No business found, cannot process message');
        return null;
    }

    const { business, businessId } = result;
    const intent = await detectIntent(message.text);
    console.log(`[Meta] Business: ${business.name}, Intent: ${intent.intent}`);

    const conversation = await getConversationHistory(message.senderId, message.platform, businessId);

    let systemPrompt = buildSystemPrompt({
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

    if (message.isPublic) {
        systemPrompt += `\n\nIMPORTANT: PUBLIC comment. Keep response concise (1-2 sentences), friendly, use emojis. Add CTA like "DM us for details!"`;
    } else {
        systemPrompt += `\n\nThis is a private ${message.platform === 'instagram_dm' ? 'Instagram' : 'Messenger'} DM. Be detailed and personal.`;
    }

    const historyForAI = conversation.messages.map(m => ({ role: m.role as 'user' | 'model', content: m.content }));
    const aiResponse = await generateResponse(systemPrompt, historyForAI, message.text);

    await saveMessage(businessId, conversation.id, message.text, aiResponse, intent, {
        postId: message.postId,
        commentId: message.commentId,
        isPublic: message.isPublic,
    });

    return aiResponse;
}

// GET - Webhook verification
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const result = verifyWebhook(
        searchParams.get('hub.mode'),
        searchParams.get('hub.verify_token'),
        searchParams.get('hub.challenge')
    );
    if (result.success) return new NextResponse(result.challenge, { status: 200 });
    return NextResponse.json({ error: result.error }, { status: 403 });
}

// POST - Handle incoming webhooks with MULTI-TENANT routing
export async function POST(request: NextRequest) {
    try {
        const { object, entry } = await request.json() as { object: string; entry: MetaWebhookEntry[] };
        console.log(`[Meta] Webhook: ${object} with ${entry?.length || 0} entries`);

        if (!entry?.length) return NextResponse.json({ status: 'no_entries' });

        for (const webhookEntry of entry) {
            // Extract Page ID from the webhook entry (this is the recipient's page)
            const pageId = webhookEntry.id;

            const messages = parseWebhookPayload(object, [webhookEntry]);
            if (!messages.length) continue;

            for (const message of messages) {
                try {
                    if (!message.isPublic) await sendTypingIndicator(message.senderId, 'typing_on');

                    // Pass pageId for multi-tenant routing
                    const aiResponse = await processMessage(message, pageId);

                    if (!aiResponse) continue; // Skip if no business found

                    if (message.isPublic && message.commentId) {
                        await replyToComment(message.commentId, aiResponse);
                    } else {
                        await sendDirectMessage(
                            message.senderId,
                            aiResponse,
                            message.platform === 'instagram_dm' ? 'instagram_dm' : 'messenger'
                        );
                    }

                    if (!message.isPublic) await sendTypingIndicator(message.senderId, 'typing_off');
                } catch (e) {
                    console.error(`[Meta] Error processing ${message.senderId}:`, e);
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (e) {
        console.error('[Meta Webhook Error]', e);
        return NextResponse.json({ status: 'error' });
    }
}
