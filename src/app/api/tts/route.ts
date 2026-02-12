import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, detectTextLanguage, getVoiceForLanguage, isElevenLabsConfigured } from '@/lib/elevenlabs';

/**
 * API endpoint to generate TTS audio
 * GET /api/tts?text=Hello&lang=en&gender=female
 * Returns audio/mpeg stream
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') as 'ar' | 'en' | null;
    const gender = (searchParams.get('gender') || 'female') as 'male' | 'female';

    if (!text) {
        return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    if (!isElevenLabsConfigured) {
        return NextResponse.json(
            { error: 'ElevenLabs API not configured' },
            { status: 503 }
        );
    }

    // Detect language if not provided
    const detectedLang = lang || detectTextLanguage(text);
    const voiceId = getVoiceForLanguage(detectedLang, gender);

    const result = await textToSpeech(text, { voiceId });

    if (!result) {
        return NextResponse.json(
            { error: 'Failed to generate audio' },
            { status: 500 }
        );
    }

    return new NextResponse(new Uint8Array(result.audio), {
        headers: {
            'Content-Type': result.contentType,
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
    });
}

/**
 * POST endpoint for generating TTS with more options
 * POST /api/tts
 * Body: { text: string, voiceId?: string, stability?: number, ... }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceId, stability, similarityBoost, style } = body;

        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        if (!isElevenLabsConfigured) {
            return NextResponse.json(
                { error: 'ElevenLabs API not configured' },
                { status: 503 }
            );
        }

        const result = await textToSpeech(text, {
            voiceId,
            stability,
            similarityBoost,
            style,
        });

        if (!result) {
            return NextResponse.json(
                { error: 'Failed to generate audio' },
                { status: 500 }
            );
        }

        // Return as base64 for easier handling in some clients
        return NextResponse.json({
            audio: result.audio.toString('base64'),
            contentType: result.contentType,
        });
    } catch (error) {
        console.error('[TTS API Error]', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
