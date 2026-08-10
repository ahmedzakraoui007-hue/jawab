import { createHmac, timingSafeEqual } from 'crypto';

const META_APP_SECRET = process.env.META_APP_SECRET;
const META_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'jawab_verify_token';
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

/**
 * Whether a business with no Meta account of its own may fall back to the
 * single shared META_PAGE_ACCESS_TOKEN. OFF unless explicitly opted into —
 * see the identical guidance in the Next.js app's src/lib/meta.ts (this is
 * a straight port of that fix).
 */
export const isSharedMetaFallbackEnabled = process.env.META_ALLOW_SHARED_TOKEN === 'true';
export const isMetaConfigured = !!META_ACCESS_TOKEN && isSharedMetaFallbackEnabled;
export const isMetaSignatureVerificationEnabled = !!META_APP_SECRET;

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
        attachments?: Array<{ type: 'image' | 'video' | 'audio' | 'file'; payload: { url: string } }>;
    };
    postback?: { mid: string; payload: string; title: string };
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

export function verifyWebhook(
    mode: string | null,
    token: string | null,
    challenge: string | null
): { success: boolean; challenge?: string; error?: string } {
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        return { success: true, challenge: challenge || '' };
    }
    console.error('[Meta] Webhook verification failed', { mode, token });
    return { success: false, error: 'Verification failed' };
}

/** Must run against the raw request body — Meta signs the exact bytes it
 * sent. Requires the raw-body-capturing middleware on this route. */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!META_APP_SECRET || !signatureHeader) return false;

    const expected = 'sha256=' + createHmac('sha256', META_APP_SECRET).update(rawBody, 'utf8').digest('hex');
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== receivedBuf.length) return false;

    return timingSafeEqual(expectedBuf, receivedBuf);
}

export function parseWebhookPayload(object: string, entries: MetaWebhookEntry[]): ParsedMetaMessage[] {
    const messages: ParsedMetaMessage[] = [];

    for (const entry of entries) {
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
                        attachments: event.message.attachments?.map((a) => ({ type: a.type, url: a.payload.url })),
                    });
                }
            }
        }

        if (entry.changes) {
            for (const change of entry.changes) {
                if (change.field === 'comments' || change.field === 'feed') {
                    const value = change.value;
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

export interface MetaCredentials {
    accessToken?: string;
    instagramAccountId?: string;
}

type MetaTokenSource = 'business' | 'shared' | 'none';
interface ResolvedMetaToken {
    token: string | null;
    source: MetaTokenSource;
}

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
            `[Meta] ${context || 'request'}: no per-business token, using the SHARED META_PAGE_ACCESS_TOKEN.`
        );
        return { token: sharedToken, source: 'shared' };
    }

    if (sharedToken && !allowShared) {
        console.error(
            `[Meta] ${context || 'request'}: business has not connected its own Meta account, and ` +
            'META_ALLOW_SHARED_TOKEN is not "true", so the shared token will not be used.'
        );
    }

    return { token: null, source: 'none' };
}

function resolveInstagramAccountId(credentials: MetaCredentials | undefined, source: MetaTokenSource): string | undefined {
    if (credentials?.instagramAccountId) return credentials.instagramAccountId;
    return source === 'shared' ? INSTAGRAM_ACCOUNT_ID : undefined;
}

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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ recipient: { id: recipientId }, message: { text }, messaging_type: 'RESPONSE' }),
        });
        const data = await response.json() as { message_id?: string; error?: { message?: string } };
        if (response.ok) return { success: true, messageId: data.message_id };
        return { success: false, error: data.error?.message || 'Unknown error' };
    } catch (error) {
        console.error('[Meta] Error sending DM:', error);
        return { success: false, error: String(error) };
    }
}

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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ message: text }),
        });
        const data = await response.json() as { id?: string; error?: { message?: string } };
        if (response.ok) return { success: true, commentId: data.id };
        return { success: false, error: data.error?.message || 'Unknown error' };
    } catch (error) {
        console.error('[Meta] Error replying to comment:', error);
        return { success: false, error: String(error) };
    }
}

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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ recipient: { id: recipientId }, sender_action: action }),
        });
    } catch (error) {
        console.error('[Meta] Error sending typing indicator:', error);
    }
}
