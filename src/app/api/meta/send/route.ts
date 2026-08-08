import { NextRequest, NextResponse } from 'next/server';
import { sendDirectMessage, replyToComment, isMetaConfigured, type MetaCredentials } from '@/lib/meta';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { resolveOwnBusinessId } from '@/lib/auth-guard';
import { checkRateLimit } from '@/lib/rate-limit';

const META_SEND_RATE_LIMIT = 30;
const META_SEND_RATE_WINDOW_SECONDS = 60;

/**
 * POST /api/meta/send
 * Send outbound messages via Meta platforms (human takeover)
 *
 * Body:
 * - recipientId: string (required for DMs)
 * - message: string (required)
 * - platform: 'messenger' | 'instagram_dm' (for DMs)
 * - commentId: string (for comment replies)
 *
 * businessId is always resolved from the authenticated caller's own
 * account, and the send uses that business's own stored Meta credentials
 * (business.meta.accessToken/instagramAccountId, populated by the OAuth
 * callback) rather than the single global META_PAGE_ACCESS_TOKEN — so a
 * signed-in user can only ever send as their own connected Page/IG account.
 * Falls back to the global token only if a business hasn't connected its
 * own Meta account yet, matching the single-tenant/pilot deployment case
 * documented in DEPLOYMENT.md.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isAdminConfigured) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const businessId = await resolveOwnBusinessId(request);
        if (!businessId) {
            return NextResponse.json({ error: 'No business associated with this account' }, { status: 403 });
        }

        const rateLimit = await checkRateLimit(`meta-send:${businessId}`, META_SEND_RATE_LIMIT, META_SEND_RATE_WINDOW_SECONDS);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests, please slow down' },
                { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || META_SEND_RATE_WINDOW_SECONDS) } }
            );
        }

        const businessSnap = await adminDb.collection('businesses').doc(businessId).get();
        if (!businessSnap.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const business = businessSnap.data()!;
        const metaCreds: MetaCredentials = {
            accessToken: business.meta?.accessToken,
            instagramAccountId: business.meta?.instagramAccountId,
        };

        if (!metaCreds.accessToken && !isMetaConfigured) {
            return NextResponse.json(
                { error: 'Meta is not connected for this business' },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { recipientId, message, platform, commentId } = body;

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Reply to comment
        if (commentId) {
            const result = await replyToComment(commentId, message, metaCreds.accessToken);
            if (result.success) {
                return NextResponse.json({
                    success: true,
                    type: 'comment_reply',
                    commentId: result.commentId,
                });
            } else {
                return NextResponse.json(
                    { error: result.error },
                    { status: 500 }
                );
            }
        }

        // Send DM
        if (!recipientId) {
            return NextResponse.json(
                { error: 'recipientId is required for DMs' },
                { status: 400 }
            );
        }

        const result = await sendDirectMessage(
            recipientId,
            message,
            platform || 'messenger',
            metaCreds
        );

        if (result.success) {
            return NextResponse.json({
                success: true,
                type: 'direct_message',
                platform: platform || 'messenger',
                messageId: result.messageId,
            });
        } else {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('[Meta Send API Error]', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/meta/send
 * Check Meta API status
 */
export async function GET() {
    return NextResponse.json({
        configured: isMetaConfigured,
        platforms: ['messenger', 'instagram_dm', 'instagram_comment', 'facebook_comment'],
        timestamp: new Date().toISOString(),
    });
}
