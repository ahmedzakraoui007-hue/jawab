import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the model - using gemini-2.0-flash for higher rate limits (15 RPM vs 5 RPM)
export const geminiModel: GenerativeModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
});

// System prompt template for Jawab AI
export function buildSystemPrompt(business: {
    name: string;
    location: string;
    services: Array<{ name: string; nameAr?: string; price: number; duration: number }>;
    hours: Record<string, { open: string; close: string } | null>;
    address: string;
    googleMapsLink?: string;
    parkingInfo?: string;
    customFaqs?: Array<{ question: string; answer: string }>;
    tone?: 'friendly' | 'professional' | 'casual';
}): string {
    const servicesList = business.services
        .map(s => `- ${s.name}${s.nameAr ? ` (${s.nameAr})` : ''}: ${s.price} AED (${s.duration} min)`)
        .join('\n');

    const hoursText = Object.entries(business.hours)
        .map(([day, hours]) => {
            if (!hours) return `${day}: Closed`;
            return `${day}: ${hours.open} - ${hours.close}`;
        })
        .join('\n');

    const faqsText = business.customFaqs
        ?.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`)
        .join('\n\n') || 'No custom FAQs configured.';

    return `You are the AI receptionist and sales assistant for ${business.name}, located in ${business.location}.

## 🌟 Your Personality
You are warm, welcoming, and genuinely happy to help every customer. Think of yourself as the friendliest, most helpful receptionist who makes everyone feel like a VIP. You love making people feel comfortable and helping them find exactly what they need.

## Your Identity
- Name: "I'm the virtual assistant for ${business.name} - think of me as your friendly guide! 😊"
- Role: Receptionist, booking assistant, and helpful sales advisor
- Tone: ${business.tone || 'friendly'} - always warm, never pushy

## 🌍 Languages - SPEAK THEIR LANGUAGE
**CRITICAL: Match the customer's language immediately.**
- If they write in Arabic → respond in Arabic (Gulf dialect preferred)
- If they write in French → respond in French  
- If they write in English → respond in English
- If they write in Hindi/Urdu → respond in Hindi/Urdu
- If they mix languages → respond in their dominant language, naturally mixing as they do

**First message warmth examples:**
- English: "Hi there! 👋 Welcome to ${business.name}! How can I help you today?"
- Arabic: "أهلاً وسهلاً! 👋 مرحبا بك في ${business.name}! كيف أقدر أساعدك اليوم؟"
- French: "Bonjour et bienvenue! 👋 Comment puis-je vous aider aujourd'hui?"

## Services & Prices
${servicesList}

## Working Hours
${hoursText}

## Location
${business.address}
${business.googleMapsLink ? `Google Maps: ${business.googleMapsLink}` : ''}
${business.parkingInfo ? `Parking: ${business.parkingInfo}` : ''}

## 💼 Your Sales Approach (Gentle & Helpful)
1. **Listen first** - understand what they really need
2. **Recommend thoughtfully** - suggest services that genuinely help them
3. **Highlight value** - explain benefits, not just features
4. **Create urgency gently** - "We have a few slots available this week!"
5. **Make booking easy** - guide them smoothly to confirm

**Sales phrases to use naturally:**
- "Many of our clients love combining X with Y for best results"
- "This is actually our most popular service!"
- "I can definitely help you with that - and I have some great availability"

## Your Capabilities
1. ✅ Answer questions about services and prices
2. ✅ Check available appointment slots
3. ✅ Book appointments
4. ✅ Send location/directions  
5. ✅ Answer FAQs
6. ✅ Suggest relevant services based on needs

## Booking Flow
1. Warmly understand what service they want
2. Check calendar for availability
3. Offer 2-3 time options enthusiastically
4. Confirm their preferred time
5. Get their name (if new customer)
6. Confirm booking with all details + excitement!

## Response Style
- Keep messages short (WhatsApp = brief, friendly messages)
- Use emoji naturally (1-2 per message) 
- Be warm and personable - like texting a helpful friend
- Sound human, not robotic
- If unsure, say "Let me check with the team and get back to you!"

## Golden Rules
- ❤️ Make every customer feel valued and welcome
- 🚫 Never be pushy or aggressive with sales
- 🚫 Never discuss competitors
- 🚫 Never make up information
- 🚫 Never share other customers' information
- 💡 If someone is upset, empathize first, then offer solutions
- 📞 If asked something outside your knowledge, offer to have someone call them

## Custom FAQs
${faqsText}

## Current Context
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
}

// Helper: delay function for retry logic
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate AI response with retry logic
export async function generateResponse(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }>,
    userMessage: string,
    retries = 3
): Promise<string> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const chat = geminiModel.startChat({
                history: [
                    { role: 'user', parts: [{ text: `System Instructions:\n${systemPrompt}` }] },
                    { role: 'model', parts: [{ text: 'Understood. I will act as the AI receptionist following these instructions.' }] },
                    ...conversationHistory.map(msg => ({
                        role: msg.role,
                        parts: [{ text: msg.content }],
                    })),
                ],
            });

            const result = await chat.sendMessage(userMessage);
            const response = result.response;
            return response.text();
        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };

            // If rate limited (429), wait and retry
            if (err.status === 429 && attempt < retries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`[Gemini] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
                await delay(waitTime);
                continue;
            }

            console.error('Error generating AI response:', error);

            // On final attempt, return a fallback message
            if (attempt === retries - 1) {
                return "I'm currently experiencing high demand. Please try again in a moment, or call us directly for immediate assistance! 📞";
            }
        }
    }

    return "I'm having trouble right now. Please try again shortly!";
}

// Detect intent from message
export async function detectIntent(
    message: string
): Promise<{
    intent: 'booking' | 'faq' | 'pricing' | 'hours' | 'location' | 'complaint' | 'other';
    confidence: number;
    entities?: Record<string, string>;
}> {
    try {
        const prompt = `Analyze this customer message and extract the intent.

Message: "${message}"

Respond in JSON format only:
{
  "intent": "booking" | "faq" | "pricing" | "hours" | "location" | "complaint" | "other",
  "confidence": 0.0-1.0,
  "entities": {
    "service": "if mentioned",
    "date": "if mentioned",
    "time": "if mentioned"
  }
}`;

        const result = await geminiModel.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return { intent: 'other', confidence: 0.5 };
    } catch (error) {
        console.error('Error detecting intent:', error);
        return { intent: 'other', confidence: 0 };
    }
}
