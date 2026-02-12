/**
 * Meta (Facebook/Instagram) API Integration
 * Handles Messenger DMs, Instagram DMs, and Comments
 */

// Environment variables
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN; // Page Access Token from Meta Console
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'jawab_verify_token';
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

export const isMetaConfigured = !!META_ACCESS_TOKEN;

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

/**
 * Send a DM via Messenger or Instagram
 */
export async function sendDirectMessage(
    recipientId: string,
    text: string,
    platform: 'messenger' | 'instagram_dm' = 'messenger'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!META_ACCESS_TOKEN) {
        console.error('[Meta] Access token not configured');
        return { success: false, error: 'Meta access token not configured' };
    }

    const endpoint = platform === 'instagram_dm'
        ? `${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/messages`
        : `${GRAPH_API_BASE}/me/messages`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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
    text: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
    if (!META_ACCESS_TOKEN) {
        console.error('[Meta] Access token not configured');
        return { success: false, error: 'Meta access token not configured' };
    }

    try {
        const response = await fetch(`${GRAPH_API_BASE}/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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
    userId: string
): Promise<{ name?: string; profilePic?: string } | null> {
    if (!META_ACCESS_TOKEN) return null;

    try {
        const response = await fetch(
            `${GRAPH_API_BASE}/${userId}?fields=name,profile_pic&access_token=${META_ACCESS_TOKEN}`
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
export async function getMediaUrl(attachmentId: string): Promise<string | null> {
    if (!META_ACCESS_TOKEN) return null;

    try {
        const response = await fetch(
            `${GRAPH_API_BASE}/${attachmentId}?fields=url&access_token=${META_ACCESS_TOKEN}`
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
    platform: 'messenger' | 'instagram_dm' = 'messenger'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!META_ACCESS_TOKEN) {
        return { success: false, error: 'Meta access token not configured' };
    }

    const endpoint = platform === 'instagram_dm'
        ? `${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/messages`
        : `${GRAPH_API_BASE}/me/messages`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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
    action: 'typing_on' | 'typing_off' | 'mark_seen' = 'typing_on'
): Promise<void> {
    if (!META_ACCESS_TOKEN) return;

    try {
        await fetch(`${GRAPH_API_BASE}/me/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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
