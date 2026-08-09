import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isPasswordStrongEnough } from './password';

describe('hashPassword / verifyPassword', () => {
    it('a correct password verifies against its own hash', async () => {
        const hash = await hashPassword('correct-horse-battery-staple');
        expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
    });

    it('an incorrect password does not verify', async () => {
        const hash = await hashPassword('correct-horse-battery-staple');
        expect(await verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('never stores the password in plaintext', async () => {
        const hash = await hashPassword('correct-horse-battery-staple');
        expect(hash).not.toBe('correct-horse-battery-staple');
        expect(hash).not.toContain('correct-horse-battery-staple');
    });

    it('hashing the same password twice produces different hashes (salted)', async () => {
        const hash1 = await hashPassword('same-password');
        const hash2 = await hashPassword('same-password');
        expect(hash1).not.toBe(hash2);
    });
});

describe('isPasswordStrongEnough', () => {
    it('rejects passwords under 6 characters', () => {
        expect(isPasswordStrongEnough('12345')).toBe(false);
    });

    it('accepts passwords of 6 or more characters', () => {
        expect(isPasswordStrongEnough('123456')).toBe(true);
    });
});
