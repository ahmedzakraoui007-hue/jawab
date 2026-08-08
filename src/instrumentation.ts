/**
 * Next.js's instrumentation hook — runs once when the server starts, for
 * both the Node.js runtime (API routes, webhooks) and the Edge runtime
 * (middleware.ts). See instrumentation-client.ts for the browser side.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('../sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config');
    }
}
