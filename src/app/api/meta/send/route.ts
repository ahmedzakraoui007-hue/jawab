import { NextRequest, NextResponse } from 'next/server';
import { sendDirectMessage, replyToComment, isMetaConfigured } from '@/lib/meta';

/**
 * POST /api/meta/send
 * Send outbound messages via Meta platforms
 *
 * Body:
 * - recipientId: string (required)
 * - message: string (required)
 * - platform: 'messenger' | 'instagram_dm' (for DMs)
 * - commentId: string (for comment replies)
 *
 * SECURITY NOTE: unlike /api/whatsapp/send, this route has no
 * business-ownership scoping. sendDirectMessage/replyToComment (lib/meta.ts)
 * send via a single global META_PAGE_ACCESS_TOKEN env var shared by the
 * whole platform — there is currently no per-business Meta credential used
 * for sending (even though MetaIntegration.accessToken is modeled per
 * business in src/lib/types.ts and populated by the OAuth callback, it's
 * never actually read here). Any authenticated user can currently message
 * any recipientId/commentId through the shared Page. Properly fixing this
 * needs lib/meta.ts's send functions to accept and use the calling
 * business's own stored token instead of the env var — a real feature
 * change, not a quick patch. This route also has no frontend caller today
 * (confirmed via repo search), so it is not an active exploit path, but
 * treat it as unsafe to expose/link to until that's addressed.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isMetaConfigured) {
            return NextResponse.json(
                { error: 'Meta API not configured' },
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
            const result = await replyToComment(commentId, message);
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
            platform || 'messenger'
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
