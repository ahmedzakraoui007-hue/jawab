import { auth } from '@/lib/firebase';

/**
 * Wrapper around fetch() that automatically attaches the Firebase Auth
 * ID token as a Bearer token in the Authorization header.
 *
 * Usage:
 *   const res = await authFetch('/api/business/services?businessId=xxx');
 *   const res = await authFetch('/api/business/faqs', { method: 'POST', body: ... });
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const headers = new Headers(options.headers);

    // Get fresh ID token from the currently signed-in user
    if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
}
