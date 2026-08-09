import { getAccessToken, setAccessToken } from '@/lib/session';

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * Fetch wrapper for the standalone Express backend (server/) — attaches
 * the in-memory access token, and on a 401 tries exactly one silent
 * refresh-and-retry before giving up. `credentials: 'include'` is what
 * lets the httpOnly refresh cookie actually reach /auth/refresh; it's
 * harmless to send on every request since the browser only attaches
 * cookies scoped to the backend's own origin/path anyway.
 */
export async function backendFetch(path: string, options: RequestInit = {}, isRetry = false): Promise<Response> {
    const headers = new Headers(options.headers);
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers, credentials: 'include' });

    if (res.status === 401 && !isRetry && path !== '/auth/refresh') {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
            return backendFetch(path, options, true);
        }
    }

    return res;
}

/**
 * Calls /auth/refresh directly (not through backendFetch, to avoid a
 * retry loop against itself) and updates the shared session store.
 * Returns the new access token on success, or null if there's no valid
 * refresh cookie (e.g. never logged in, or the session truly expired) —
 * that's an expected outcome on first page load for a signed-out visitor,
 * not an error worth logging.
 */
export async function refreshAccessToken(): Promise<string | null> {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!res.ok) {
            setAccessToken(null);
            return null;
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken as string;
    } catch {
        setAccessToken(null);
        return null;
    }
}
