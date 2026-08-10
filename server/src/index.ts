import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { businessesRouter } from './routes/businesses';
import { ttsRouter } from './routes/tts';
import { aiRouter } from './routes/ai';
import { calendarRouter } from './routes/calendar';
import { sendRouter } from './routes/send';
import { billingRouter } from './routes/billing';
import { adminRouter } from './routes/admin';
import { integrationsRouter } from './routes/integrations';
import { whatsappWebhookRouter } from './routes/webhooks/whatsapp';
import { voiceWebhookRouter } from './routes/webhooks/voice';
import { metaWebhookRouter } from './routes/webhooks/meta';
import { stripeWebhookRouter } from './routes/webhooks/stripe';
import { errorHandler } from './middleware/error-handler';
import './types/express';

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());

// Stripe's signature check needs the exact raw request bytes — must be
// registered BEFORE the global express.json() below, or the JSON parser
// will have already consumed (and re-serialized) the body, breaking the
// signature. Every other route uses parsed JSON.
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);

// Captures the raw body alongside normal JSON parsing (used by
// webhooks/meta.ts's HMAC check) without needing route-specific ordering
// tricks the way Stripe's raw-Buffer approach does.
app.use(express.json({
    verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
    },
}));

// Twilio webhooks (WhatsApp, Voice) POST as
// application/x-www-form-urlencoded — parsed into req.body as a plain
// object, which is also the exact shape Twilio.validateRequest expects.
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/businesses', businessesRouter);
app.use('/tts', ttsRouter);
app.use('/ai', aiRouter);
app.use('/calendar', calendarRouter);
app.use('/send', sendRouter);
app.use('/billing', billingRouter);
app.use('/admin', adminRouter);
app.use('/integrations', integrationsRouter);
app.use('/webhooks/whatsapp', whatsappWebhookRouter);
app.use('/webhooks/voice', voiceWebhookRouter);
app.use('/webhooks/meta', metaWebhookRouter);

// Must be registered last so it can catch errors from every route above.
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
    console.log(`[jawab-server] listening on :${port}`);
});
