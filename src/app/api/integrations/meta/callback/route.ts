import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getAppUrl } from '@/lib/utils';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = `${getAppUrl()}/api/integrations/meta/callback`;
const GRAPH_API = 'https://graph.facebook.com/v18.0';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

interface PageData {
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
        id: string;
        username?: string;
    };
}

/**
 * GET /api/integrations/meta/callback
 * Handle OAuth callback from Facebook
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=access_denied`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=missing_params`
        );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get('meta_oauth_state')?.value;

    if (!storedState || storedState !== state) {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=invalid_state`
        );
    }

    // Parse state to get businessId
    let businessId: string;
    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        businessId = stateData.businessId;
    } catch {
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=invalid_state`
        );
    }

    try {
        // Exchange code for access token
        const tokenUrl = new URL(`${GRAPH_API}/oauth/access_token`);
        tokenUrl.searchParams.set('client_id', META_APP_ID!);
        tokenUrl.searchParams.set('client_secret', META_APP_SECRET!);
        tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        tokenUrl.searchParams.set('code', code);

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData: TokenResponse = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('[Meta OAuth] Token exchange failed:', tokenData);
            return NextResponse.redirect(
                `${getAppUrl()}/dashboard/settings/integrations?error=token_exchange_failed`
            );
        }

        // Get long-lived token (60 days)
        const longLivedUrl = new URL(`${GRAPH_API}/oauth/access_token`);
        longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
        longLivedUrl.searchParams.set('client_id', META_APP_ID!);
        longLivedUrl.searchParams.set('client_secret', META_APP_SECRET!);
        longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

        const longLivedResponse = await fetch(longLivedUrl.toString());
        const longLivedData: TokenResponse = await longLivedResponse.json();

        const userAccessToken = longLivedData.access_token || tokenData.access_token;
        const expiresIn = longLivedData.expires_in || 5184000; // Default 60 days

        // Get user's pages
        const pagesResponse = await fetch(
            `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
        );
        const pagesData = await pagesResponse.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            return NextResponse.redirect(
                `${getAppUrl()}/dashboard/settings/integrations?error=no_pages`
            );
        }

        // Use the first page (TODO: let user select in UI)
        const page: PageData = pagesData.data[0];

        // Get Instagram username if connected
        let instagramUsername: string | undefined;
        if (page.instagram_business_account?.id) {
            try {
                const igResponse = await fetch(
                    `${GRAPH_API}/${page.instagram_business_account.id}?fields=username&access_token=${page.access_token}`
                );
                const igData = await igResponse.json();
                instagramUsername = igData.username;
            } catch (e) {
                console.log('[Meta OAuth] Could not fetch Instagram username:', e);
            }
        }

        // Save to Firestore
        if (db) {
            const businessRef = doc(db, 'businesses', businessId);
            await updateDoc(businessRef, {
                meta: {
                    accessToken: page.access_token, // TODO: Encrypt in production
                    pageId: page.id,
                    pageName: page.name,
                    instagramAccountId: page.instagram_business_account?.id || null,
                    instagramUsername: instagramUsername || null,
                    tokenExpiresAt: Timestamp.fromDate(
                        new Date(Date.now() + expiresIn * 1000)
                    ),
                    connectedAt: Timestamp.now(),
                    connectedBy: 'oauth', // TODO: Get actual user ID from session
                },
                updatedAt: Timestamp.now(),
            });
        }

        // Clear state cookie
        cookieStore.delete('meta_oauth_state');

        // Redirect to success page
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?success=meta_connected&page=${encodeURIComponent(page.name)}`
        );

    } catch (error) {
        console.error('[Meta OAuth] Error:', error);
        return NextResponse.redirect(
            `${getAppUrl()}/dashboard/settings/integrations?error=oauth_failed`
        );
    }
}
