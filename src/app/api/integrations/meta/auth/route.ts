import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAppUrl } from '@/lib/utils';

const META_APP_ID = process.env.META_APP_ID;
const REDIRECT_URI = `${getAppUrl()}/api/integrations/meta/callback`;

// Scopes needed for full functionality
const SCOPES = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_messaging',
    'instagram_basic',
    'instagram_manage_messages',
    'instagram_manage_comments',
].join(',');

/**
 * GET /api/integrations/meta/auth
 * Start Meta OAuth flow - redirects to Facebook login
 * 
 * Query params:
 * - businessId: The business to connect
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
        return NextResponse.json(
            { error: 'businessId is required' },
            { status: 400 }
        );
    }

    if (!META_APP_ID) {
        return NextResponse.json(
            { error: 'Meta App not configured' },
            { status: 503 }
        );
    }

    // Generate state token for CSRF protection
    const state = Buffer.from(JSON.stringify({
        businessId,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
    })).toString('base64');

    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set('meta_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
    });

    // Build Facebook OAuth URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.redirect(authUrl.toString());
}
