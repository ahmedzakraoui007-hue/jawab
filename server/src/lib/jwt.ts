import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `${name} must be set — see .env.example. Refusing to start with a missing/` +
            'default signing secret rather than silently issuing forgeable tokens.'
        );
    }
    return value;
}

const ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');
const REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface TokenPayload {
    sub: string;
}

interface AccessTokenPayload extends TokenPayload {
    email: string;
}

/**
 * Access tokens carry email as well as the user id — the Next.js app's
 * middleware.ts injects both x-user-uid and x-user-email headers for
 * downstream API routes (requirePlatformAdmin checks the email against an
 * allowlist), the same shape it already expected from a Firebase ID
 * token's claims. Refresh tokens don't need this — they're never used to
 * authorize a request directly, only to mint a new access token.
 */
export function signAccessToken(userId: string, email: string): string {
    return jwt.sign({ sub: userId, email }, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function signRefreshToken(userId: string): string {
    return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        if (typeof payload === 'object' && typeof payload.sub === 'string' && typeof payload.email === 'string') {
            return { sub: payload.sub, email: payload.email };
        }
        return null;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
    try {
        const payload = jwt.verify(token, REFRESH_SECRET);
        if (typeof payload === 'object' && typeof payload.sub === 'string') {
            return { sub: payload.sub };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Refresh tokens are stored hashed, never in plaintext — if the database
 * ever leaked, raw refresh tokens would be full-length-session credentials
 * for every user. A fast SHA-256 (not bcrypt) is appropriate here: unlike
 * a user-chosen password, a JWT already has enormous entropy, so slow
 * hashing buys nothing against brute force and would just slow down every
 * request that needs to look a token up.
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
