// Augments Express's Request with the raw body buffer captured by
// express.json({ verify }) in index.ts — used by webhooks/meta.ts and
// webhooks/stripe.ts for HMAC signature verification, which must run
// against the exact bytes sent, not a re-serialized JSON.parse/stringify
// round trip.
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            rawBody?: Buffer;
        }
    }
}

export {};
