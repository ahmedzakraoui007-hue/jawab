import { google } from 'googleapis';

// Same Google Cloud OAuth client as google-calendar.ts (GOOGLE_OAUTH_CLIENT_ID/
// SECRET) — different redirect URI and scope, registered as a second
// "Authorized redirect URI" on that same client rather than provisioning a
// separate one just for sign-in.
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
const REDIRECT_URI = `${BACKEND_URL}/auth/google/callback`;

export const isGoogleSignInConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

function getClient() {
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getSignInAuthUrl(state: string): string {
    const client = getClient();
    return client.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        state,
    });
}

export interface GoogleIdentity {
    email: string;
    name: string;
    googleId: string;
}

/**
 * Exchanges an authorization code for tokens, then cryptographically
 * verifies the returned id_token against Google's own public keys
 * (verifyIdToken fetches/caches Google's JWKS internally) rather than
 * trusting it just because it came back over the token exchange — this is
 * the "verify id_token server-side" step called out in the migration plan.
 */
export async function verifyGoogleSignIn(code: string): Promise<GoogleIdentity> {
    const client = getClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
        throw new Error('Google did not return an id_token');
    }

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
        throw new Error('Google account has no verified email');
    }

    return {
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        googleId: payload.sub,
    };
}
