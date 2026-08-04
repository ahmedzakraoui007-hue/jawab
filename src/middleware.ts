import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

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
    // OAuth-initiation routes are reached via a plain browser navigation
    // (window.location.href), which cannot attach an Authorization header
    // the way fetch-based calls can. They verify a Firebase ID token passed
    // as a query param themselves (see src/lib/auth-guard.ts) instead of
    // relying on this middleware's Bearer-token check.
    '/api/integrations/calendar/auth',
    '/api/integrations/meta/auth',
    // OAuth callbacks are reached via a redirect FROM Google/Meta straight
    // to the user's browser — there is no Firebase session/token available
    // at all at this point. Their security comes from the CSRF state-cookie
    // check plus the membership check already performed at the auth step
    // above (before the state was ever generated), not from a Bearer token.
    '/api/integrations/calendar/callback',
    '/api/integrations/meta/callback',
    // Twilio's <Play> verb fetches this URL directly from Twilio's servers
    // during a live call — it can't attach an Authorization header either.
    // No customer data is exposed (just synthesized speech audio), but this
    // is a good candidate for rate limiting since each request costs real
    // ElevenLabs credits.
    '/api/tts',
];

// Routes that live outside the [locale] segment — the authenticated app
// stays English/LTR only for now, so it's excluded from locale redirects.
const NON_LOCALIZED_PREFIXES = ['/dashboard', '/onboarding', '/api'];

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

async function handleApiAuth(request: NextRequest, pathname: string) {
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

    // Attach user info to REQUEST headers so API routes can read them
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-uid', payload.sub as string);
    requestHeaders.set('x-user-email', (payload.email as string) || '');

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

function detectLocale(request: NextRequest): Locale {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
        return cookieLocale as Locale;
    }

    const acceptLanguage = request.headers.get('accept-language') || '';
    if (acceptLanguage.toLowerCase().includes('ar')) {
        return 'ar';
    }

    return defaultLocale;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // API auth logic, unchanged
    if (pathname.startsWith('/api')) {
        return handleApiAuth(request, pathname);
    }

    // Authenticated app stays outside locale routing
    if (NON_LOCALIZED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        return NextResponse.next();
    }

    // Already locale-prefixed — tag the request so the root layout can set
    // <html lang/dir> without needing the [locale] param itself.
    const matchedLocale = locales.find(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
    if (matchedLocale) {
        const response = NextResponse.next();
        response.headers.set('x-locale', matchedLocale);
        return response;
    }

    // No locale in the URL — redirect to the detected/preferred one
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
}

export const config = {
    matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
