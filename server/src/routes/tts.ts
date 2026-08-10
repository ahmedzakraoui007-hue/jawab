import { Router } from 'express';
import { textToSpeech, detectTextLanguage, getVoiceForLanguage, isElevenLabsConfigured } from '../lib/elevenlabs';
import { checkRateLimit, getClientIp } from '../lib/rate-limit';
import { asyncHandler } from '../middleware/error-handler';

export const ttsRouter = Router();

// Public, unauthenticated — Twilio's <Play> verb fetches this mid-call
// and can't attach an Authorization header. Every request costs real
// ElevenLabs credits, hence its own limit.
const TTS_RATE_LIMIT = 30;
const TTS_RATE_WINDOW_SECONDS = 60;

ttsRouter.get('/', asyncHandler(async (req, res) => {
    const text = req.query.text as string | undefined;
    const lang = req.query.lang as 'ar' | 'en' | undefined;
    const gender = (req.query.gender as 'male' | 'female') || 'female';

    if (!text) {
        res.status(400).json({ error: 'Missing text parameter' });
        return;
    }

    const rateLimit = await checkRateLimit(`tts:${getClientIp(req)}`, TTS_RATE_LIMIT, TTS_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || TTS_RATE_WINDOW_SECONDS));
        res.status(429).json({ error: 'Too many requests, please slow down' });
        return;
    }

    if (!isElevenLabsConfigured) {
        res.status(503).json({ error: 'ElevenLabs API not configured' });
        return;
    }

    const detectedLang = lang || detectTextLanguage(text);
    const voiceId = getVoiceForLanguage(detectedLang, gender);
    const result = await textToSpeech(text, { voiceId });

    if (!result) {
        res.status(500).json({ error: 'Failed to generate audio' });
        return;
    }

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(result.audio);
}));
