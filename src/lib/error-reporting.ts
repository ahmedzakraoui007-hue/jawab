import * as Sentry from '@sentry/nextjs';

/**
 * Report an error to both the console (always, so Vercel function logs
 * keep working exactly as before) and Sentry (only if configured — a
 * no-op DSN means captureException just does nothing). Use this in the
 * highest-value catch blocks: anything that touches money, AI responses,
 * or a customer-facing webhook. Not a mechanical replacement for every
 * console.error in the app — most dashboard CRUD failures are already
 * visible to the user directly and don't need alerting.
 */
export function reportError(context: string, error: unknown, extra?: Record<string, unknown>): void {
    console.error(`[${context}]`, error);
    Sentry.captureException(error, { tags: { context }, extra });
}
