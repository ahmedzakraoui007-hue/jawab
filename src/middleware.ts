import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

// Routes that live outside the [locale] segment — the authenticated app
// stays English/LTR only for now, so it's excluded from locale redirects.
const NON_LOCALIZED_PREFIXES = ['/dashboard', '/onboarding', '/auth'];

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

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

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
