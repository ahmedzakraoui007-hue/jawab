import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyMetaSignature, verifyWebhook, parseWebhookPayload, type MetaWebhookEntry } from '@/lib/meta';

// Set in vitest.setup.ts before any module import.
const APP_SECRET = 'test-meta-app-secret';

function signBody(body: string): string {
    return 'sha256=' + createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');
}

describe('verifyMetaSignature', () => {
    it('accepts a body genuinely signed with the configured app secret', () => {
        const body = JSON.stringify({ object: 'page', entry: [] });
        expect(verifyMetaSignature(body, signBody(body))).toBe(true);
    });

    it('rejects a body whose signature does not match (tampered payload)', () => {
        const original = JSON.stringify({ object: 'page', entry: [] });
        const tampered = JSON.stringify({ object: 'page', entry: [{ id: 'attacker' }] });
        expect(verifyMetaSignature(tampered, signBody(original))).toBe(false);
    });

    it('rejects when there is no signature header at all', () => {
        expect(verifyMetaSignature('{}', null)).toBe(false);
    });

    it('rejects a garbage signature without throwing', () => {
        expect(verifyMetaSignature('{}', 'sha256=not-hex-and-wrong-length')).toBe(false);
    });
});

describe('verifyWebhook', () => {
    it('succeeds when mode is subscribe and the token matches META_VERIFY_TOKEN', () => {
        // No META_VERIFY_TOKEN set in setup, so the module falls back to its
        // documented default: 'jawab_verify_token'.
        const result = verifyWebhook('subscribe', 'jawab_verify_token', 'echo-me');
        expect(result).toEqual({ success: true, challenge: 'echo-me' });
    });

    it('fails when the token does not match', () => {
        const result = verifyWebhook('subscribe', 'wrong-token', 'echo-me');
        expect(result.success).toBe(false);
    });

    it('fails when mode is not subscribe', () => {
        const result = verifyWebhook('unsubscribe', 'jawab_verify_token', 'echo-me');
        expect(result.success).toBe(false);
    });
});

describe('parseWebhookPayload', () => {
    it('parses a Messenger DM into a private ParsedMetaMessage', () => {
        const entries: MetaWebhookEntry[] = [{
            id: 'page123',
            time: 1000,
            messaging: [{
                sender: { id: 'user1' },
                recipient: { id: 'page123' },
                timestamp: 1700000000000,
                message: { mid: 'mid1', text: 'Hi there' },
            }],
        }];

        const messages = parseWebhookPayload('page', entries);

        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject({
            platform: 'messenger',
            senderId: 'user1',
            text: 'Hi there',
            isPublic: false,
        });
    });

    it('parses an Instagram DM as instagram_dm when object is "instagram"', () => {
        const entries: MetaWebhookEntry[] = [{
            id: 'ig123',
            time: 1000,
            messaging: [{
                sender: { id: 'user2' },
                recipient: { id: 'ig123' },
                timestamp: 1700000000000,
                message: { mid: 'mid2', text: 'Hey' },
            }],
        }];

        const messages = parseWebhookPayload('instagram', entries);
        expect(messages[0].platform).toBe('instagram_dm');
    });

    it('parses a new public comment as isPublic: true, and skips edits/deletes', () => {
        const entries: MetaWebhookEntry[] = [{
            id: 'page123',
            time: 1000,
            changes: [
                {
                    field: 'comments',
                    value: {
                        from: { id: 'commenter1', name: 'Alice' },
                        item: 'comment',
                        comment_id: 'c1',
                        post_id: 'p1',
                        message: 'Great service!',
                        verb: 'add',
                        created_time: 1700000000,
                    },
                },
                {
                    field: 'comments',
                    value: {
                        from: { id: 'commenter1' },
                        item: 'comment',
                        comment_id: 'c2',
                        message: 'edited comment',
                        verb: 'edited',
                        created_time: 1700000001,
                    },
                },
            ],
        }];

        const messages = parseWebhookPayload('page', entries);

        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject({
            platform: 'facebook_comment',
            senderId: 'commenter1',
            text: 'Great service!',
            commentId: 'c1',
            isPublic: true,
        });
    });

    it('ignores messaging events with no text (e.g. pure postbacks)', () => {
        const entries: MetaWebhookEntry[] = [{
            id: 'page123',
            time: 1000,
            messaging: [{
                sender: { id: 'user1' },
                recipient: { id: 'page123' },
                timestamp: 1700000000000,
                postback: { mid: 'mid3', payload: 'GET_STARTED', title: 'Get Started' },
            }],
        }];

        expect(parseWebhookPayload('page', entries)).toHaveLength(0);
    });
});
