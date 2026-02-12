/**
 * ElevenLabs Text-to-Speech Integration
 * Provides high-quality, natural-sounding voices for Arabic and English
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice IDs (can be configured per business)
export const VOICE_IDS = {
    // Female voices (recommended for salon/spa)
    arabic_female: process.env.ELEVENLABS_VOICE_ID || 'ThT5KcBeYPX3keUQqHPh', // Rachel
    english_female: 'ThT5KcBeYPX3keUQqHPh', // Rachel
    // Male voices (for barbershops, garages, etc.)
    arabic_male: 'VR6AewLTigWG4xSOukaG', // Adam
    english_male: 'VR6AewLTigWG4xSOukaG', // Adam
};

export const isElevenLabsConfigured = Boolean(ELEVENLABS_API_KEY);

interface TTSOptions {
    voiceId?: string;
    language?: 'ar' | 'en' | 'hi' | 'ur';
    stability?: number; // 0-1, higher = more consistent
    similarityBoost?: number; // 0-1, higher = more similar to original voice
    style?: number; // 0-1, for expressive voices
    speed?: number; // 0.5-2, speech speed
}

/**
 * Convert text to speech using ElevenLabs
 * Returns audio as base64-encoded string
 */
export async function textToSpeech(
    text: string,
    options: TTSOptions = {}
): Promise<{ audio: Buffer; contentType: string } | null> {
    if (!ELEVENLABS_API_KEY) {
        console.warn('[ElevenLabs] API key not configured');
        return null;
    }

    const {
        voiceId = VOICE_IDS.english_female,
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.3,
        speed = 1.0,
    } = options;

    try {
        const response = await fetch(
            `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2', // Best for Arabic/English
                    voice_settings: {
                        stability,
                        similarity_boost: similarityBoost,
                        style,
                        use_speaker_boost: true,
                    },
                    // Note: speed is not directly controllable via API, using model defaults
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabs] API error:', response.status, errorText);
            return null;
        }

        const audioBuffer = await response.arrayBuffer();
        return {
            audio: Buffer.from(audioBuffer),
            contentType: 'audio/mpeg',
        };
    } catch (error) {
        console.error('[ElevenLabs] TTS error:', error);
        return null;
    }
}

/**
 * Stream text-to-speech (for real-time applications)
 * Returns a ReadableStream
 */
export async function textToSpeechStream(
    text: string,
    options: TTSOptions = {}
): Promise<ReadableStream<Uint8Array> | null> {
    if (!ELEVENLABS_API_KEY) {
        console.warn('[ElevenLabs] API key not configured');
        return null;
    }

    const {
        voiceId = VOICE_IDS.english_female,
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.3,
    } = options;

    try {
        const response = await fetch(
            `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability,
                        similarity_boost: similarityBoost,
                        style,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok || !response.body) {
            console.error('[ElevenLabs] Streaming error:', response.status);
            return null;
        }

        return response.body;
    } catch (error) {
        console.error('[ElevenLabs] Stream error:', error);
        return null;
    }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getVoices(): Promise<Array<{
    voice_id: string;
    name: string;
    category: string;
    labels: Record<string, string>;
}> | null> {
    if (!ELEVENLABS_API_KEY) {
        return null;
    }

    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
        });

        if (!response.ok) {
            console.error('[ElevenLabs] Failed to fetch voices:', response.status);
            return null;
        }

        const data = await response.json();
        return data.voices;
    } catch (error) {
        console.error('[ElevenLabs] Error fetching voices:', error);
        return null;
    }
}

/**
 * Detect language from text (simple heuristic)
 */
export function detectTextLanguage(text: string): 'ar' | 'en' {
    // Count Arabic characters
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    // If more than 30% Arabic characters, treat as Arabic
    return arabicChars / totalChars > 0.3 ? 'ar' : 'en';
}

/**
 * Get appropriate voice ID based on language and gender
 */
export function getVoiceForLanguage(
    language: 'ar' | 'en',
    gender: 'male' | 'female' = 'female'
): string {
    const key = `${language}_${gender}` as keyof typeof VOICE_IDS;
    return VOICE_IDS[key] || VOICE_IDS.english_female;
}
