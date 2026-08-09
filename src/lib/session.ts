/**
 * In-memory access-token store, shared between auth-context.tsx (which
 * writes it on login/refresh/logout) and any fetch helper that needs to
 * attach it (auth-fetch.ts, backend-fetch.ts) without those plain
 * functions needing to be React components that can read context.
 *
 * Deliberately NOT persisted to localStorage/sessionStorage — an access
 * token there is readable by any injected script (XSS blast radius). The
 * refresh token (httpOnly cookie, never touched by JS) is what actually
 * survives a page reload; losing the in-memory access token on reload is
 * expected and handled by auth-context.tsx's startup refresh call.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null): void {
    accessToken = token;
}
