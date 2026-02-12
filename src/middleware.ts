import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

// Google's public key endpoint for Firebase Auth tokens
const JWKS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project';

// Routes that don't require authentication (webhooks must stay public)
const PUBLIC_API_ROUTES = [
    '/api/webhooks',
    '/api/auth',
    '/api/public',
];

/**
 * Verify a Firebase Auth ID token using jose (Edge Runtime compatible).
 * Returns the decoded payload on success, or null on failure.
 */
async function verifyFirebaseToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        });

        // Firebase tokens must have a non-empty `sub` (the user's UID)
        if (!payload.sub) {
            return null;
        }

        return payload;
    } catch (error) {
        console.warn('[Middleware] Token verification failed:', (error as Error).message);
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only run on /api routes
    if (!pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Skip public routes (webhooks, etc.)
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
            { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
            { status: 401 }
        );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const payload = await verifyFirebaseToken(token);

    if (!payload) {
        return NextResponse.json(
            { error: 'Unauthorized', message: 'Invalid or expired token' },
            { status: 401 }
        );
    }

    // Attach user info to request headers so API routes can read it
    const response = NextResponse.next();
    response.headers.set('x-user-uid', payload.sub as string);
    response.headers.set('x-user-email', (payload.email as string) || '');

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
