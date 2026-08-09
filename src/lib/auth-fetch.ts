import { getAccessToken } from '@/lib/session';
import { refreshAccessToken } from '@/lib/backend-fetch';

/**
 * Wrapper around fetch() that automatically attaches the current access
 * token as a Bearer token — used for the Next.js app's own /api routes
 * (src/middleware.ts verifies this same token). Retries once after a
 * silent refresh on a 401, same policy as backend-fetch.ts's calls to the
 * standalone server.
 *
 * Usage:
 *   const res = await authFetch('/api/business/services?businessId=xxx');
 *   const res = await authFetch('/api/business/faqs', { method: 'POST', body: ... });
 */
export async function authFetch(
    url: string,
    options: RequestInit = {},
    isRetry = false
): Promise<Response> {
    const headers = new Headers(options.headers);

    const token = getAccessToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && !isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            return authFetch(url, options, true);
        }
    }

    return res;
}
