import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, buildSystemPrompt } from '@/lib/gemini';
import { textToSpeech, detectTextLanguage, getVoiceForLanguage, isElevenLabsConfigured } from '@/lib/elevenlabs';
import { getAppUrl } from '@/lib/utils';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * MULTI-TENANT: Get business by voice phone number
 */
async function getBusinessByPhoneNumber(phoneNumber: string): Promise<{ business: FirebaseFirestore.DocumentData; businessId: string } | null> {
    try {
        const businessesRef = adminDb.collection('businesses');

        // Try new nested structure: phoneNumber.number
        let snapshot = await businessesRef.where('phoneNumber.number', '==', phoneNumber).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[Voice] Found business by phoneNumber.number: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Legacy: Try flat phoneNumber field
        snapshot = await businessesRef.where('phoneNumber', '==', phoneNumber).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            console.log(`[Voice] Found business by legacy phoneNumber: ${doc.id}`);
            return { business: doc.data(), businessId: doc.id };
        }

        // Fallback to first business
        console.log(`[Voice] No business found for ${phoneNumber}, using first available`);
        const allBusinesses = await businessesRef.limit(1).get();
        if (!allBusinesses.empty) {
            const doc = allBusinesses.docs[0];
            return { business: doc.data(), businessId: doc.id };
        }

        console.error(`[Voice] No businesses found in Firestore at all`);
        return null;
    } catch (error) {
        console.error('[Voice] Error fetching business:', error);
        return null;
    }
}

// In-memory conversation store for voice calls (needed for ongoing call state)
const voiceConversations: Record<string, {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
    firestoreConvId?: string;
    businessId?: string;
    startTime: Date;
}> = {};

// Base URL for audio files (ngrok or production URL)
const BASE_URL = getAppUrl();

/**
 * Main voice webhook handler
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const callSid = formData.get('CallSid') as string;
        const from = formData.get('From') as string;
        const callStatus = formData.get('CallStatus') as string;
        const speechResult = formData.get('SpeechResult') as string | null;
        const digits = formData.get('Digits') as string | null;
        const to = formData.get('To') as string || '';

        console.log(`[Voice] CallSid: ${callSid}, From: ${from}, Status: ${callStatus}`);

        // Handle new incoming call - initial greeting
        if (!speechResult && !digits) {
            // Look up the business by the called number
            const result = await getBusinessByPhoneNumber(to);

            if (!result) {
                console.error('[Voice] No business found, cannot process call');
                return new NextResponse(
                    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured. Goodbye.</Say><Hangup/></Response>`,
                    { headers: { 'Content-Type': 'text/xml' } }
                );
            }

            const { business, businessId } = result;

            // Initialize conversation
            voiceConversations[callSid] = {
                messages: [],
                businessId,
                startTime: new Date(),
            };

            // Save to Firestore
            try {
                const convsRef = adminDb.collection('businesses').doc(businessId).collection('conversations');
                const convRef = await convsRef.add({
                    businessId,
                    customerPhone: from,
                    channel: 'voice',
                    status: 'active',
                    handledBy: 'ai',
                    callSid,
                    messages: [],
                    startedAt: FieldValue.serverTimestamp(),
                    lastMessageAt: FieldValue.serverTimestamp(),
                });
                voiceConversations[callSid].firestoreConvId = convRef.id;
            } catch (err) {
                console.error('[Voice] Firestore save error:', err);
            }

            // Greeting message
            const greeting = `مرحباً! أهلاً بك في ${business.name}. كيف أقدر أساعدك اليوم؟`;

            return new NextResponse(
                generateTwiML(greeting, true, 'ar'),
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        // Process speech input
        const userInput = speechResult || (digits ? `Pressed ${digits}` : '');
        console.log(`[Voice] User said: "${userInput}"`);

        // Initialize if call state was lost (Vercel cold start)
        if (!voiceConversations[callSid]) {
            // Try to recover business from the first available
            const result = await getBusinessByPhoneNumber(to);
            voiceConversations[callSid] = {
                messages: [],
                businessId: result?.businessId,
                startTime: new Date(),
            };
        }

        // Get business for system prompt
        const businessId = voiceConversations[callSid].businessId;
        let businessData: FirebaseFirestore.DocumentData | null = null;

        if (businessId) {
            const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
            if (businessDoc.exists) {
                businessData = businessDoc.data()!;
            }
        }

        if (!businessData) {
            // Last resort fallback — get first business
            const first = await adminDb.collection('businesses').limit(1).get();
            if (!first.empty) {
                businessData = first.docs[0].data();
                voiceConversations[callSid].businessId = first.docs[0].id;
            }
        }

        if (!businessData) {
            return new NextResponse(
                `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Goodbye.</Say><Hangup/></Response>`,
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        // Generate AI response
        const systemPrompt = buildSystemPrompt({
            name: businessData.name,
            location: businessData.location || '',
            services: businessData.services || [],
            hours: businessData.hours || {},
            address: businessData.address || '',
            googleMapsLink: businessData.googleMapsLink,
            parkingInfo: businessData.parkingInfo,
            customFaqs: businessData.customFaqs,
            tone: businessData.tone,
        }) + `

## Voice Call Special Instructions
- Keep responses SHORT (max 2-3 sentences for voice)
- Speak naturally, as if on a phone call
- Don't use markdown, bullet points, or formatting
- Use verbal cues like "um", "so" sparingly for naturalness
- If customer wants to book, collect: service, date/time preference, name
- End with a clear question or confirmation`;

        const aiResponse = await generateResponse(
            systemPrompt,
            voiceConversations[callSid].messages,
            userInput
        );

        // Clean response for speech (remove markdown, emojis, etc.)
        const cleanedResponse = cleanForSpeech(aiResponse);

        // Update conversation history
        voiceConversations[callSid].messages.push(
            { role: 'user', content: userInput },
            { role: 'model', content: cleanedResponse }
        );

        // Save to Firestore
        const convId = voiceConversations[callSid].firestoreConvId;
        const bId = voiceConversations[callSid].businessId;
        if (convId && bId) {
            try {
                const convRef = adminDb
                    .collection('businesses').doc(bId)
                    .collection('conversations').doc(convId);
                await convRef.update({
                    messages: voiceConversations[callSid].messages.map(m => ({
                        ...m,
                        timestamp: FieldValue.serverTimestamp(),
                    })),
                    lastMessageAt: FieldValue.serverTimestamp(),
                });
            } catch (err) {
                console.error('[Voice] Firestore update error:', err);
            }
        }

        // Detect if call should end
        const shouldEndCall = shouldEndConversation(cleanedResponse, userInput);

        // Detect language for TTS
        const language = detectTextLanguage(cleanedResponse);

        return new NextResponse(
            generateTwiML(cleanedResponse, !shouldEndCall, language),
            { headers: { 'Content-Type': 'text/xml' } }
        );

    } catch (error) {
        console.error('[Voice Webhook Error]', error);

        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zeina" language="ar-XA">عذراً، حصل خطأ. خليني أحولك لأحد من الفريق.</Say>
  <Hangup/>
</Response>`;

        return new NextResponse(errorTwiml, {
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}

/**
 * Generate TwiML response with optional ElevenLabs audio
 */
function generateTwiML(text: string, continueGather: boolean, language: 'ar' | 'en' = 'en'): string {
    const escapedText = escapeXml(text);

    // Select voice based on language
    // Polly voices: Zeina (Arabic), Joanna (English)
    const pollyVoice = language === 'ar' ? 'Polly.Zeina' : 'Polly.Joanna';
    const pollyLang = language === 'ar' ? 'ar-XA' : 'en-US';

    if (continueGather) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/voice" method="POST" language="${language === 'ar' ? 'ar-SA' : 'en-US'}">
    <Say voice="${pollyVoice}" language="${pollyLang}">${escapedText}</Say>
  </Gather>
  <Say voice="${pollyVoice}" language="${pollyLang}">${language === 'ar' ? 'لم أسمع شيء. مع السلامة!' : 'I didn\'t hear anything. Goodbye!'}</Say>
  <Hangup/>
</Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${pollyVoice}" language="${pollyLang}">${escapedText}</Say>
  <Hangup/>
</Response>`;
}

/**
 * Clean text for speech synthesis
 */
function cleanForSpeech(text: string): string {
    return text
        // Remove emojis
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        // Remove markdown
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/[-*]\s/g, '')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Determine if conversation should end
 */
function shouldEndConversation(response: string, userInput: string): boolean {
    const endPhrases = [
        'goodbye', 'bye', 'مع السلامة', 'شكراً', 'thank you',
        'have a nice day', 'see you', 'thanks for calling',
    ];

    const lowerResponse = response.toLowerCase();
    const lowerInput = userInput.toLowerCase();

    // Check if response or input contains end phrases
    for (const phrase of endPhrases) {
        if (lowerResponse.includes(phrase) || lowerInput.includes(phrase)) {
            return true;
        }
    }

    return false;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * GET endpoint for webhook verification
 */
export async function GET() {
    return NextResponse.json({
        status: 'Voice webhook is active',
        elevenlabs: isElevenLabsConfigured ? 'configured' : 'not configured',
        timestamp: new Date().toISOString(),
    });
}
