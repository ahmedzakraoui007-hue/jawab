import { NextRequest, NextResponse } from 'next/server';
import {
    verifyWebhook,
    verifyMetaSignature,
    isMetaSignatureVerificationEnabled,
    parseWebhookPayload,
    sendDirectMessage,
    replyToComment,
    sendTypingIndicator,
    ParsedMetaMessage,
    MetaWebhookEntry,
    MetaCredentials,
} from '@/lib/meta';
import { generateResponse, buildSystemPrompt, detectIntent } from '@/lib/gemini';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { BookingContext } from '@/lib/booking-actions';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveEffectiveBilling, isUsageAllowed } from '@/lib/billing';
import { checkAndIncrementUsage } from '@/lib/usage';
import { reportError } from '@/lib/error-reporting';

// Caps how fast one business's Gemini/Graph API budget can be burned by
// flooded DMs/comments — abuse mitigation, not a limit on legitimate traffic.
const META_RATE_LIMIT = 20;
const META_RATE_WINDOW_SECONDS = 60;

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

        console.error(`[Meta] No business found for pageId/instagramAccountId ${pageId} — refusing to guess`);
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
 * Generate the AI's reply for an already-resolved business. Business
 * resolution now happens once in POST (it's needed before this point too,
 * to pick the right Meta credentials for the typing indicator), so this
 * takes the resolved business directly instead of looking it up again.
 */
async function processMessage(
    message: ParsedMetaMessage,
    business: FirebaseFirestore.DocumentData,
    businessId: string
): Promise<string | null> {
    console.log(`[Meta] ${message.platform} from ${message.senderId}: "${message.text}" (business: ${businessId})`);

    const rateLimit = await checkRateLimit(`meta-webhook:${businessId}`, META_RATE_LIMIT, META_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        console.warn(`[Meta] Rate limit hit for business ${businessId}`);
        return "We're getting a lot of messages right now — please try again in a minute! 🙏";
    }

    const billing = resolveEffectiveBilling(business);
    if (!isUsageAllowed(billing.status)) {
        console.warn(`[Meta] Business ${businessId} billing status is ${billing.status} — refusing`);
        return "We're sorry, this business's account is currently inactive. Please contact them directly.";
    }
    const usage = await checkAndIncrementUsage(businessId, billing.plan);
    if (!usage.allowed) {
        console.warn(`[Meta] Business ${businessId} hit its monthly conversation limit (${usage.limit})`);
        return "Thanks for reaching out! This business has reached its monthly message limit — please try again later.";
    }

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

    // Meta DMs have no phone number — use the platform senderId as the
    // best-available contact identifier on any booking created from here.
    const bookingContext: BookingContext = {
        businessId,
        customerPhone: message.senderId,
        services: business.services || [],
        hours: business.hours || {},
        googleCalendar: business.googleCalendar,
    };

    const aiResponse = await generateResponse(systemPrompt, historyForAI, message.text, 3, bookingContext);

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
        // Verify this request actually came from Meta before trusting anything
        // in it. Must run against the raw body — request.json() would parse
        // and re-serialize, which won't match the signed bytes.
        const rawBody = await request.text();

        if (isMetaSignatureVerificationEnabled) {
            const signature = request.headers.get('x-hub-signature-256');
            if (!verifyMetaSignature(rawBody, signature)) {
                console.warn('[Meta] Invalid webhook signature — rejecting request');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
            }
        } else {
            console.warn('[Meta] META_APP_SECRET not configured — webhook signature NOT verified');
        }

        const { object, entry } = JSON.parse(rawBody) as { object: string; entry: MetaWebhookEntry[] };
        console.log(`[Meta] Webhook: ${object} with ${entry?.length || 0} entries`);

        if (!entry?.length) return NextResponse.json({ status: 'no_entries' });

        for (const webhookEntry of entry) {
            // Extract Page ID from the webhook entry (this is the recipient's page)
            const pageId = webhookEntry.id;

            const messages = parseWebhookPayload(object, [webhookEntry]);
            if (!messages.length) continue;

            for (const message of messages) {
                try {
                    // MULTI-TENANT: resolve the business once, up front, so
                    // every Graph API call below (typing indicator, send)
                    // uses that business's own Page/IG token instead of the
                    // single global fallback credential.
                    const bizResult = await getBusinessByMetaId(pageId);
                    if (!bizResult) {
                        console.error('[Meta] No business found, cannot process message');
                        continue;
                    }
                    const { business, businessId } = bizResult;
                    const metaCreds: MetaCredentials = {
                        accessToken: business.meta?.accessToken,
                        instagramAccountId: business.meta?.instagramAccountId,
                    };

                    if (!message.isPublic) await sendTypingIndicator(message.senderId, 'typing_on', metaCreds.accessToken);

                    const aiResponse = await processMessage(message, business, businessId);

                    if (!aiResponse) continue;

                    if (message.isPublic && message.commentId) {
                        await replyToComment(message.commentId, aiResponse, metaCreds.accessToken);
                    } else {
                        await sendDirectMessage(
                            message.senderId,
                            aiResponse,
                            message.platform === 'instagram_dm' ? 'instagram_dm' : 'messenger',
                            metaCreds
                        );
                    }

                    if (!message.isPublic) await sendTypingIndicator(message.senderId, 'typing_off', metaCreds.accessToken);
                } catch (e) {
                    console.error(`[Meta] Error processing ${message.senderId}:`, e);
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (e) {
        reportError('Meta Webhook', e);
        return NextResponse.json({ status: 'error' });
    }
}
