import { Router } from 'express';
import { prisma } from '../db';
import { verifyAccessToken } from '../lib/jwt';
import { getAuthUrl as getCalendarAuthUrl, getTokensFromCode as getCalendarTokens, isGoogleCalendarConfigured } from '../lib/google-calendar';
import { asyncHandler } from '../middleware/error-handler';

export const integrationsRouter = Router();

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',')[0].trim();
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API = 'https://graph.facebook.com/v18.0';
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;

const STATE_COOKIE_OPTS = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 600_000 };

async function verifyMembership(idToken: string | null, businessId: string | null): Promise<{ ok: true; uid: string } | { ok: false; status: number; error: string }> {
    if (!idToken) return { ok: false, status: 401, error: 'Missing idToken' };
    if (!businessId) return { ok: false, status: 400, error: 'businessId required' };

    const payload = verifyAccessToken(idToken);
    if (!payload) return { ok: false, status: 401, error: 'Invalid or expired token' };

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return { ok: false, status: 404, error: 'Business not found' };

    const isMember = business.ownerId === payload.sub || business.staffIds.includes(payload.sub);
    if (!isMember) return { ok: false, status: 403, error: 'Not a member of this business' };

    return { ok: true, uid: payload.sub };
}

/**
 * GET /integrations/calendar/auth?businessId=...&idToken=...
 * Reached via window.location.href, which can't attach an Authorization
 * header — the token travels as a query param instead and is verified
 * here directly, same pattern the Next.js app used against Firebase ID
 * tokens.
 */
integrationsRouter.get('/calendar/auth', asyncHandler(async (req, res) => {
    const businessId = req.query.businessId as string | undefined;
    const idToken = req.query.idToken as string | undefined;

    const auth = await verifyMembership(idToken || null, businessId || null);
    if (!auth.ok) {
        res.status(auth.status).json({ error: auth.error });
        return;
    }
    if (!isGoogleCalendarConfigured) {
        res.status(503).json({ error: 'Google Calendar not configured' });
        return;
    }

    const state = Buffer.from(JSON.stringify({ businessId, uid: auth.uid, nonce: Math.random().toString(36).slice(2) })).toString('base64');
    res.cookie('google_oauth_state', state, STATE_COOKIE_OPTS);
    res.redirect(getCalendarAuthUrl(state));
}));

integrationsRouter.get('/calendar/callback', asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=calendar_access_denied`);
        return;
    }
    if (!code || !state) {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=calendar_missing_params`);
        return;
    }

    const storedState = req.cookies?.google_oauth_state;
    if (!storedState || storedState !== state) {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=calendar_invalid_state`);
        return;
    }

    let businessId: string;
    let connectedByUid: string | undefined;
    try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
        businessId = parsed.businessId;
        connectedByUid = parsed.uid;
    } catch {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=calendar_invalid_state`);
        return;
    }

    try {
        const tokens = await getCalendarTokens(code);
        await prisma.business.update({
            where: { id: businessId },
            data: {
                calendarAccessToken: tokens.accessToken,
                calendarRefreshToken: tokens.refreshToken,
                calendarId: 'primary',
                calendarConnected: true,
                calendarEmail: tokens.email,
                calendarConnectedBy: connectedByUid,
            },
        });

        res.clearCookie('google_oauth_state');
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?success=calendar_connected&calendar=${encodeURIComponent(tokens.email || '')}`);
    } catch (err) {
        console.error('[Calendar OAuth] Error:', err);
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=calendar_token_failed`);
    }
}));

integrationsRouter.get('/meta/auth', asyncHandler(async (req, res) => {
    const businessId = req.query.businessId as string | undefined;
    const idToken = req.query.idToken as string | undefined;

    const auth = await verifyMembership(idToken || null, businessId || null);
    if (!auth.ok) {
        res.status(auth.status).json({ error: auth.error });
        return;
    }
    if (!META_APP_ID) {
        res.status(503).json({ error: 'Meta integration not configured' });
        return;
    }

    const state = Buffer.from(JSON.stringify({ businessId, uid: auth.uid, nonce: Math.random().toString(36).slice(2) })).toString('base64');
    res.cookie('meta_oauth_state', state, STATE_COOKIE_OPTS);

    const redirectUri = `${BACKEND_URL}/integrations/meta/callback`;
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'pages_show_list,pages_messaging,pages_manage_metadata,instagram_basic,instagram_manage_messages');
    res.redirect(authUrl.toString());
}));

integrationsRouter.get('/meta/callback', asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=access_denied`);
        return;
    }
    if (!code || !state) {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=missing_params`);
        return;
    }

    const storedState = req.cookies?.meta_oauth_state;
    if (!storedState || storedState !== state) {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=invalid_state`);
        return;
    }

    let businessId: string;
    let connectedByUid: string | undefined;
    try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
        businessId = parsed.businessId;
        connectedByUid = parsed.uid;
    } catch {
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=invalid_state`);
        return;
    }

    try {
        const redirectUri = `${BACKEND_URL}/integrations/meta/callback`;
        const tokenUrl = new URL(`${GRAPH_API}/oauth/access_token`);
        tokenUrl.searchParams.set('client_id', META_APP_ID!);
        tokenUrl.searchParams.set('client_secret', META_APP_SECRET!);
        tokenUrl.searchParams.set('redirect_uri', redirectUri);
        tokenUrl.searchParams.set('code', code);

        const tokenRes = await fetch(tokenUrl.toString());
        const tokenData = await tokenRes.json() as { access_token?: string };
        if (!tokenRes.ok || !tokenData.access_token) {
            res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=token_exchange_failed`);
            return;
        }

        const longLivedUrl = new URL(`${GRAPH_API}/oauth/access_token`);
        longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
        longLivedUrl.searchParams.set('client_id', META_APP_ID!);
        longLivedUrl.searchParams.set('client_secret', META_APP_SECRET!);
        longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token);
        const longLivedRes = await fetch(longLivedUrl.toString());
        const longLivedData = await longLivedRes.json() as { access_token?: string; expires_in?: number };

        const userAccessToken = longLivedData.access_token || tokenData.access_token;
        const expiresIn = longLivedData.expires_in || 5_184_000;

        const pagesRes = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`);
        const pagesData = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> };

        if (!pagesData.data?.length) {
            res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=no_pages`);
            return;
        }

        const page = pagesData.data[0];
        let instagramUsername: string | undefined;
        if (page.instagram_business_account?.id) {
            try {
                const igRes = await fetch(`${GRAPH_API}/${page.instagram_business_account.id}?fields=username&access_token=${page.access_token}`);
                const igData = await igRes.json() as { username?: string };
                instagramUsername = igData.username;
            } catch (e) {
                console.log('[Meta OAuth] Could not fetch Instagram username:', e);
            }
        }

        await prisma.business.update({
            where: { id: businessId },
            data: {
                metaAccessToken: page.access_token,
                metaPageId: page.id,
                metaPageName: page.name,
                metaInstagramAccountId: page.instagram_business_account?.id || null,
                metaInstagramUsername: instagramUsername || null,
                metaTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                metaConnectedAt: new Date(),
                metaConnectedBy: connectedByUid,
            },
        });

        res.clearCookie('meta_oauth_state');
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?success=meta_connected&page=${encodeURIComponent(page.name)}`);
    } catch (err) {
        console.error('[Meta OAuth] Error:', err);
        res.redirect(`${FRONTEND_ORIGIN}/dashboard/settings/integrations?error=oauth_failed`);
    }
}));
