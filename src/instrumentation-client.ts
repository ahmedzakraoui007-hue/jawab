/**
 * Next.js's client-instrumentation convention file — loaded automatically
 * in the browser before the app starts. Same no-op-when-unset behavior:
 * without NEXT_PUBLIC_SENTRY_DSN configured, this initializes a disabled
 * Sentry client and nothing is sent anywhere.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
});
