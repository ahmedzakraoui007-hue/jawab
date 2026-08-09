import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { hashPassword, verifyPassword, isPasswordStrongEnough } from '../lib/password';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashToken,
    REFRESH_TOKEN_TTL_SECONDS,
} from '../lib/jwt';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

export const authRouter = Router();

const REFRESH_COOKIE = 'jawab_refresh_token';
const isProd = process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/auth',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
};

const signupSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6, 'Password should be at least 6 characters.'),
    displayName: z.string().trim().min(1),
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
});

function publicUser(user: { id: string; email: string; displayName: string; role: string; businessId: string | null; onboardingComplete: boolean }) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        businessId: user.businessId,
        onboardingComplete: user.onboardingComplete,
    };
}

/** Issues a fresh token pair, persists the refresh token's hash, and sets
 * the refresh cookie on the response — the one place both signup and
 * login (and refresh rotation) do this, so the two can't drift apart. */
async function issueSession(res: import('express').Response, userId: string, email: string) {
    const accessToken = signAccessToken(userId, email);
    const refreshToken = signRefreshToken(userId);

    await prisma.refreshToken.create({
        data: {
            userId,
            tokenHash: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
        },
    });

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return accessToken;
}

authRouter.post('/signup', asyncHandler(async (req, res) => {
    const { email, password, displayName } = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
        return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: { email, passwordHash, displayName, lastLoginAt: new Date() },
    });

    const accessToken = await issueSession(res, user.id, user.email);
    res.status(201).json({ accessToken, user: publicUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Same generic message whether the email doesn't exist or the password
    // is wrong — distinguishing the two lets an attacker enumerate
    // registered emails.
    const invalidMessage = 'Invalid email or password.';

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        res.status(401).json({ error: invalidMessage });
        return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = await issueSession(res, user.id, user.email);
    res.json({ accessToken, user: publicUser(user) });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
        res.status(401).json({ error: 'No refresh token' });
        return;
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
    }

    const tokenHash = hashToken(token);
    const stored = await prisma.refreshToken.findFirst({
        where: { userId: payload.sub, tokenHash, revokedAt: null },
    });

    if (!stored || stored.expiresAt < new Date()) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
    }

    // Rotate: revoke the token that was just used and issue a new one.
    // If this exact token is presented again later, that's a replay (the
    // legitimate client would only ever have the newest one) — revoking
    // on use, not just on logout, is what makes rotation actually work.
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
        res.status(401).json({ error: 'User no longer exists' });
        return;
    }

    const accessToken = await issueSession(res, user.id, user.email);
    res.json({ accessToken, user: publicUser(user) });
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
        await prisma.refreshToken.updateMany({
            where: { tokenHash: hashToken(token), revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    res.status(204).send();
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ user: publicUser(user) });
}));
