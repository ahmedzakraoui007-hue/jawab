import * as Sentry from '@sentry/nextjs';

// Used by middleware.ts (Edge runtime). Same no-op-when-unset behavior as
// sentry.server.config.ts.
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
});
