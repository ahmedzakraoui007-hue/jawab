const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export const VOICE_IDS = {
    arabic_female: process.env.ELEVENLABS_VOICE_ID || 'ThT5KcBeYPX3keUQqHPh',
    english_female: 'ThT5KcBeYPX3keUQqHPh',
    arabic_male: 'VR6AewLTigWG4xSOukaG',
    english_male: 'VR6AewLTigWG4xSOukaG',
};

export const isElevenLabsConfigured = Boolean(ELEVENLABS_API_KEY);

export async function textToSpeech(
    text: string,
    options: { voiceId?: string; stability?: number; similarityBoost?: number; style?: number } = {}
): Promise<{ audio: Buffer; contentType: string } | null> {
    if (!ELEVENLABS_API_KEY) return null;

    const { voiceId = VOICE_IDS.english_female, stability = 0.5, similarityBoost = 0.75, style = 0.3 } = options;

    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability, similarity_boost: similarityBoost, style, use_speaker_boost: true },
            }),
        });

        if (!response.ok) {
            console.error('[ElevenLabs] API error:', response.status, await response.text());
            return null;
        }

        const audioBuffer = await response.arrayBuffer();
        return { audio: Buffer.from(audioBuffer), contentType: 'audio/mpeg' };
    } catch (error) {
        console.error('[ElevenLabs] TTS error:', error);
        return null;
    }
}

export function detectTextLanguage(text: string): 'ar' | 'en' {
    const arabicChars = (text.match(/[؀-ۿ]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return arabicChars / totalChars > 0.3 ? 'ar' : 'en';
}

export function getVoiceForLanguage(language: 'ar' | 'en', gender: 'male' | 'female' = 'female'): string {
    const key = `${language}_${gender}` as keyof typeof VOICE_IDS;
    return VOICE_IDS[key] || VOICE_IDS.english_female;
}
