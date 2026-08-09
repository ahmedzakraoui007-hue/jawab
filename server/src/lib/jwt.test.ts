import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    hashToken,
} from './jwt';

describe('access tokens', () => {
    it('round-trips the user id and email through sign and verify', () => {
        const token = signAccessToken('user-123', 'owner@example.com');
        expect(verifyAccessToken(token)).toEqual({ sub: 'user-123', email: 'owner@example.com' });
    });

    it('rejects a garbage token without throwing', () => {
        expect(verifyAccessToken('not-a-jwt')).toBeNull();
    });

    it('rejects a token signed with a different secret (forged token)', () => {
        const forged = jwt.sign({ sub: 'attacker', email: 'attacker@example.com' }, 'wrong-secret');
        expect(verifyAccessToken(forged)).toBeNull();
    });

    it('rejects an expired token', () => {
        const expired = jwt.sign({ sub: 'user-123', email: 'owner@example.com' }, 'test-access-secret', { expiresIn: -10 });
        expect(verifyAccessToken(expired)).toBeNull();
    });

    it('rejects a validly-signed token missing the email claim', () => {
        // e.g. an older token format, or a hand-crafted forgery that got
        // the signature right but not the expected payload shape.
        const missingEmail = jwt.sign({ sub: 'user-123' }, 'test-access-secret');
        expect(verifyAccessToken(missingEmail)).toBeNull();
    });
});

describe('refresh tokens', () => {
    it('round-trips the user id through sign and verify', () => {
        const token = signRefreshToken('user-456');
        expect(verifyRefreshToken(token)).toEqual({ sub: 'user-456' });
    });

    it('an access token does not verify as a refresh token (different secrets)', () => {
        const accessToken = signAccessToken('user-123', 'owner@example.com');
        expect(verifyRefreshToken(accessToken)).toBeNull();
    });

    it('a refresh token does not verify as an access token', () => {
        const refreshToken = signRefreshToken('user-123');
        expect(verifyAccessToken(refreshToken)).toBeNull();
    });
});

describe('hashToken', () => {
    it('is deterministic for the same input', () => {
        expect(hashToken('some-token')).toBe(hashToken('some-token'));
    });

    it('produces different hashes for different inputs', () => {
        expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });

    it('does not return the plaintext token', () => {
        expect(hashToken('some-token')).not.toBe('some-token');
    });
});
