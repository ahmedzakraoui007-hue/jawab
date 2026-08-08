/**
 * Meta (Facebook/Instagram) API Integration
 * Handles Messenger DMs, Instagram DMs, and Comments
 */

import { createHmac, timingSafeEqual } from 'crypto';

// Environment variables
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN; // Page Access Token from Meta Console
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'jawab_verify_token';
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

/**
 * Whether a business with no Meta account of its own may fall back to the
 * single shared META_PAGE_ACCESS_TOKEN.
 *
 * This is OFF unless explicitly opted into, because the fallback is a
 * cross-tenant hazard: with it on, every business that hasn't completed
 * its own OAuth connect sends as — and can therefore read/act on behalf
 * of — whichever Page that one env-var token belongs to. That is correct
 * for exactly one deployment shape (a single-tenant pilot where the token
 * IS the operator's own Page) and wrong for every other one, so it has to
 * be a deliberate choice rather than a silent default.
 */
export const isSharedMetaFallbackEnabled = process.env.META_ALLOW_SHARED_TOKEN === 'true';

/** True only when a shared token exists AND using it is actually permitted. */
export const isMetaConfigured = !!META_ACCESS_TOKEN && isSharedMetaFallbackEnabled;
export const isMetaSignatureVerificationEnabled = !!META_APP_SECRET;

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Types
export interface MetaWebhookEntry {
    id: string;
    time: number;
    messaging?: MetaMessagingEvent[];
    changes?: MetaChangeEvent[];
}

export interface MetaMessagingEvent {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
            type: 'image' | 'video' | 'audio' | 'file';
            payload: { url: string };
        }>;
    };
    postback?: {
        mid: string;
        payload: string;
        title: string;
    };
}

export interface MetaChangeEvent {
    field: 'feed' | 'comments' | 'mentions';
    value: {
        from: { id: string; name?: string };
        item: 'comment' | 'post' | 'status';
        comment_id?: string;
        post_id?: string;
        parent_id?: string;
        message?: string;
        verb: 'add' | 'edited' | 'remove';
        created_time: number;
    };
}

export interface ParsedMetaMessage {
    platform: 'messenger' | 'instagram_dm' | 'instagram_comment' | 'facebook_comment';
    senderId: string;
    senderName?: string;
    messageId?: string;
    text: string;
    postId?: string;
    commentId?: string;
    parentCommentId?: string;
    isPublic: boolean;
    timestamp: Date;
    attachments?: Array<{ type: string; url: string }>;
}

/**
 * Verify Meta webhook subscription
 */
export function verifyWebhook(
    mode: string | null,
    token: string | null,
    challenge: string | null
): { success: boolean; challenge?: string; error?: string } {
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log('[Meta] Webhook verified successfully');
        return { success: true, challenge: challenge || '' };
    }

    console.error('[Meta] Webhook verification failed', { mode, token, expected: META_VERIFY_TOKEN });
    return { success: false, error: 'Verification failed' };
}

/**
 * Verify that an incoming webhook POST body genuinely came from Meta.
 * Meta signs the raw request body with HMAC-SHA256 using the app secret,
 * sent as `X-Hub-Signature-256: sha256=<hex>`. Must run against the raw
 * (unparsed) body — recomputing over re-serialized JSON will not match.
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!META_APP_SECRET || !signatureHeader) return false;

    const expected = 'sha256=' + createHmac('sha256', META_APP_SECRET).update(rawBody, 'utf8').digest('hex');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== receivedBuf.length) return false;

    return timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Parse incoming Meta webhook payload
 */
export function parseWebhookPayload(
    object: string,
    entries: MetaWebhookEntry[]
): ParsedMetaMessage[] {
    const messages: ParsedMetaMessage[] = [];

    for (const entry of entries) {
        // Handle DMs (Messenger or Instagram)
        if (entry.messaging) {
            for (const event of entry.messaging) {
                if (event.message?.text) {
                    const platform = object === 'instagram' ? 'instagram_dm' : 'messenger';
                    messages.push({
                        platform,
                        senderId: event.sender.id,
                        messageId: event.message.mid,
                        text: event.message.text,
                        isPublic: false,
                        timestamp: new Date(event.timestamp),
                        attachments: event.message.attachments?.map(a => ({
                            type: a.type,
                            url: a.payload.url,
                        })),
                    });
                }
            }
        }

        // Handle Comments (Facebook or Instagram)
        if (entry.changes) {
            for (const change of entry.changes) {
                if (change.field === 'comments' || change.field === 'feed') {
                    const value = change.value;

                    // Only process new comments (not edits or deletions)
                    if (value.verb === 'add' && value.item === 'comment' && value.message) {
                        const platform = object === 'instagram' ? 'instagram_comment' : 'facebook_comment';
                        messages.push({
                            platform,
                            senderId: value.from.id,
                            senderName: value.from.name,
                            text: value.message,
                            postId: value.post_id,
                            commentId: value.comment_id,
                            parentCommentId: value.parent_id,
                            isPublic: true,
                            timestamp: new Date(value.created_time * 1000),
                        });
                    }
                }
            }
        }
    }

    return messages;
}

/** Per-business Meta credentials, as stored on business.meta by the OAuth
 * callback. Pass these so a send acts as that business's own Page/IG
 * account rather than the single global fallback credential. */
export interface MetaCredentials {
    accessToken?: string;
    instagramAccountId?: string;
}

export type MetaTokenSource = 'business' | 'shared' | 'none';

export interface ResolvedMetaToken {
    token: string | null;
    source: MetaTokenSource;
}

/**
 * Single choke point for "which access token does this Graph API call use?".
 *
 * Every outbound Meta call goes through here rather than reaching for the
 * module-level env var directly, so there is exactly one place where the
 * business-token-vs-shared-token decision is made and one place to audit.
 *
 * `overrides` exists so the decision logic is unit-testable without
 * process.env gymnastics — production callers pass nothing and get the
 * env-derived defaults.
 */
export function resolveMetaAccessToken(
    credentials?: MetaCredentials,
    context?: string,
    overrides?: { sharedToken?: string; allowSharedFallback?: boolean }
): ResolvedMetaToken {
    if (credentials?.accessToken) {
        return { token: credentials.accessToken, source: 'business' };
    }

    const sharedToken = overrides?.sharedToken !== undefined ? overrides.sharedToken : META_ACCESS_TOKEN;
    const allowShared =
        overrides?.allowSharedFallback !== undefined ? overrides.allowSharedFallback : isSharedMetaFallbackEnabled;

    if (sharedToken && allowShared) {
        console.warn(
            `[Meta] ${context || 'request'}: no per-business token, using the SHARED META_PAGE_ACCESS_TOKEN. ` +
            'This acts as the operator\'s own Page — only valid for single-tenant pilot use.'
        );
        return { token: sharedToken, source: 'shared' };
    }

    if (sharedToken && !allowShared) {
        console.error(
            `[Meta] ${context || 'request'}: business has not connected its own Meta account. ` +
            'A shared token exists but META_ALLOW_SHARED_TOKEN is not "true", so it will not be used.'
        );
    }

    return { token: null, source: 'none' };
}

/** Instagram account to send as: the business's own, or the shared one only
 * when the shared-token fallback is actually in play. */
function resolveInstagramAccountId(credentials: MetaCredentials | undefined, source: MetaTokenSource): string | undefined {
    if (credentials?.instagramAccountId) return credentials.instagramAccountId;
    return source === 'shared' ? INSTAGRAM_ACCOUNT_ID : undefined;
}

/**
 * Send a DM via Messenger or Instagram
 */
export async function sendDirectMessage(
    recipientId: string,
    text: string,
    platform: 'messenger' | 'instagram_dm' = 'messenger',
    credentials?: MetaCredentials
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { token: accessToken, source } = resolveMetaAccessToken(credentials, 'sendDirectMessage');
    if (!accessToken) {
        return { success: false, error: 'This business has not connected its Meta account' };
    }

    const igAccountId = resolveInstagramAccountId(credentials, source);
    if (platform === 'instagram_dm' && !igAccountId) {
        return { success: false, error: 'No Instagram account connected for this business' };
    }

    const endpoint = platform === 'instagram_dm'
        ? `${GRAPH_API_BASE}/${igAccountId}/messages`
        : `${GRAPH_API_BASE}/me/messages`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text },
                messaging_type: 'RESPONSE',
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`[Meta] DM sent to ${recipientId} via ${platform}`);
            return { success: true, messageId: data.message_id };
        } else {
            console.error('[Meta] Failed to send DM:', data);
            return { success: false, error: data.error?.message || 'Unknown error' };
        }
    } catch (error) {
        console.error('[Meta] Error sending DM:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Reply to a Facebook or Instagram comment
 */
export async function replyToComment(
    commentId: string,
    text: string,
    accessToken?: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
    const { token } = resolveMetaAccessToken({ accessToken }, 'replyToComment');
    if (!token) {
        return { success: false, error: 'This business has not connected its Meta account' };
    }

    try {
        const response = await fetch(`${GRAPH_API_BASE}/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ message: text }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`[Meta] Replied to comment ${commentId}`);
            return { success: true, commentId: data.id };
        } else {
            console.error('[Meta] Failed to reply to comment:', data);
            return { success: false, error: data.error?.message || 'Unknown error' };
        }
    } catch (error) {
        console.error('[Meta] Error replying to comment:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get user profile information
 */
export async function getUserProfile(
    userId: string,
    credentials?: MetaCredentials
): Promise<{ name?: string; profilePic?: string } | null> {
    const { token } = resolveMetaAccessToken(credentials, 'getUserProfile');
    if (!token) return null;

    try {
        const response = await fetch(
            `${GRAPH_API_BASE}/${userId}?fields=name,profile_pic&access_token=${token}`
        );

        if (response.ok) {
            const data = await response.json();
            return { name: data.name, profilePic: data.profile_pic };
        }
    } catch (error) {
        console.error('[Meta] Error fetching user profile:', error);
    }

    return null;
}

/**
 * Get media URL from attachment ID
 */
export async function getMediaUrl(
    attachmentId: string,
    credentials?: MetaCredentials
): Promise<string | null> {
    const { token } = resolveMetaAccessToken(credentials, 'getMediaUrl');
    if (!token) return null;

    try {
        const response = await fetch(
            `${GRAPH_API_BASE}/${attachmentId}?fields=url&access_token=${token}`
        );

        if (response.ok) {
            const data = await response.json();
            return data.url;
        }
    } catch (error) {
        console.error('[Meta] Error fetching media URL:', error);
    }

    return null;
}

/**
 * Send quick replies (for interactive responses)
 */
export async function sendQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>,
    platform: 'messenger' | 'instagram_dm' = 'messenger',
    credentials?: MetaCredentials
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { token, source } = resolveMetaAccessToken(credentials, 'sendQuickReplies');
    if (!token) {
        return { success: false, error: 'This business has not connected its Meta account' };
    }

    const igAccountId = resolveInstagramAccountId(credentials, source);
    if (platform === 'instagram_dm' && !igAccountId) {
        return { success: false, error: 'No Instagram account connected for this business' };
    }

    const endpoint = platform === 'instagram_dm'
        ? `${GRAPH_API_BASE}/${igAccountId}/messages`
        : `${GRAPH_API_BASE}/me/messages`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: {
                    text,
                    quick_replies: quickReplies.map(qr => ({
                        content_type: 'text',
                        title: qr.title,
                        payload: qr.payload,
                    })),
                },
                messaging_type: 'RESPONSE',
            }),
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, messageId: data.message_id };
        } else {
            return { success: false, error: data.error?.message || 'Unknown error' };
        }
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * Mark a message as seen (typing indicator)
 */
export async function sendTypingIndicator(
    recipientId: string,
    action: 'typing_on' | 'typing_off' | 'mark_seen' = 'typing_on',
    accessToken?: string
): Promise<void> {
    const { token } = resolveMetaAccessToken({ accessToken }, 'sendTypingIndicator');
    if (!token) return;

    try {
        await fetch(`${GRAPH_API_BASE}/me/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                recipient: { id: recipientId },
                sender_action: action,
            }),
        });
    } catch (error) {
        console.error('[Meta] Error sending typing indicator:', error);
    }
}
