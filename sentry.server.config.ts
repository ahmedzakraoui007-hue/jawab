import * as Sentry from '@sentry/nextjs';

// Sentry.init with an undefined DSN is an intentional no-op — this file is
// safe to load unconditionally regardless of whether SENTRY_DSN is set.
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Full request/response bodies can contain customer conversation
    // content — keep off unless actively debugging with a real DSN.
    sendDefaultPii: false,
});
