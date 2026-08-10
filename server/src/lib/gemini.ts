import { GoogleGenerativeAI, GenerativeModel, SchemaType, Tool, FunctionResponsePart } from '@google/generative-ai';
import { executeBookingFunction, type BookingContext } from './booking-actions';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const geminiModel: GenerativeModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const bookingTools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'check_availability',
                description:
                    "Check the business's real calendar for open appointment slots on a given date. Always call this before promising a specific time.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        date: { type: SchemaType.STRING, description: 'Date to check, in YYYY-MM-DD format.' },
                        duration: { type: SchemaType.NUMBER, description: 'Requested service duration in minutes, if known.' },
                    },
                    required: ['date'],
                },
            },
            {
                name: 'create_booking',
                description:
                    'Create a real, confirmed appointment booking. Only call this after the customer has agreed to a specific date and time that check_availability showed as open.',
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        customerName: { type: SchemaType.STRING, description: "The customer's name." },
                        service: { type: SchemaType.STRING, description: 'The exact service name being booked.' },
                        date: { type: SchemaType.STRING, description: 'Booking date, in YYYY-MM-DD format.' },
                        time: { type: SchemaType.STRING, description: 'Booking time, in 24-hour HH:MM format.' },
                        duration: { type: SchemaType.NUMBER, description: 'Service duration in minutes, if known.' },
                    },
                    required: ['customerName', 'service', 'date', 'time'],
                },
            },
        ],
    },
];

const geminiModelWithTools: GenerativeModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: bookingTools,
});

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
        .map((s) => `- ${s.name}${s.nameAr ? ` (${s.nameAr})` : ''}: ${s.price} AED (${s.duration} min)`)
        .join('\n');

    const hoursText = Object.entries(business.hours)
        .map(([day, hours]) => (!hours ? `${day}: Closed` : `${day}: ${hours.open} - ${hours.close}`))
        .join('\n');

    const faqsText = business.customFaqs?.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') || 'No custom FAQs configured.';

    return `You are the AI receptionist and sales assistant for ${business.name}, located in ${business.location}.

## Your Personality
Warm, welcoming, genuinely happy to help every customer — the friendliest, most helpful receptionist.

## Languages
Match the customer's language immediately: Arabic (Gulf dialect preferred), French, English, Hindi/Urdu, or a natural mix if they mix.

## Services & Prices
${servicesList}

## Working Hours
${hoursText}

## Location
${business.address}
${business.googleMapsLink ? `Google Maps: ${business.googleMapsLink}` : ''}
${business.parkingInfo ? `Parking: ${business.parkingInfo}` : ''}

## Your Capabilities
1. Answer questions about services and prices
2. Check available appointment slots
3. Book appointments
4. Send location/directions
5. Answer FAQs

## Golden Rules
- Make every customer feel valued and welcome
- Never be pushy, never discuss competitors, never make up information
- Never share other customers' information
- If someone is upset, empathize first, then offer solutions

## Custom FAQs
${faqsText}

## Current Context
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateResponse(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }>,
    userMessage: string,
    retries = 3,
    bookingContext?: BookingContext
): Promise<string> {
    const model = bookingContext ? geminiModelWithTools : geminiModel;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: `System Instructions:\n${systemPrompt}` }] },
                    { role: 'model', parts: [{ text: 'Understood. I will act as the AI receptionist following these instructions.' }] },
                    ...conversationHistory.map((msg) => ({ role: msg.role, parts: [{ text: msg.content }] })),
                ],
            });

            let result = await chat.sendMessage(userMessage);
            let response = result.response;

            if (bookingContext) {
                for (let round = 0; round < 3; round++) {
                    const calls = response.functionCalls();
                    if (!calls || calls.length === 0) break;

                    const responseParts: FunctionResponsePart[] = await Promise.all(
                        calls.map(async (call) => ({
                            functionResponse: {
                                name: call.name,
                                response: await executeBookingFunction(call.name, call.args as Record<string, unknown>, bookingContext),
                            },
                        }))
                    );

                    result = await chat.sendMessage(responseParts);
                    response = result.response;
                }
            }

            return response.text();
        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };
            if (err.status === 429 && attempt < retries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`[Gemini] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
                await delay(waitTime);
                continue;
            }

            console.error('Error generating AI response:', error);
            if (attempt === retries - 1) {
                return "I'm currently experiencing high demand. Please try again in a moment, or call us directly for immediate assistance!";
            }
        }
    }

    return "I'm having trouble right now. Please try again shortly!";
}

export async function detectIntent(message: string): Promise<{
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
  "entities": { "service": "if mentioned", "date": "if mentioned", "time": "if mentioned" }
}`;

        const result = await geminiModel.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { intent: 'other', confidence: 0.5 };
    } catch (error) {
        console.error('Error detecting intent:', error);
        return { intent: 'other', confidence: 0 };
    }
}
