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
