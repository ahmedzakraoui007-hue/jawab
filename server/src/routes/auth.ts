import { Router } from 'express';
import { randomBytes } from 'crypto';
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
import { isGoogleSignInConfigured, getSignInAuthUrl, verifyGoogleSignIn } from '../lib/google-auth';
import { isPhoneVerificationConfigured, sendPhoneVerification, checkPhoneVerification } from '../lib/twilio';
import { isEmailConfigured, sendEmail, passwordResetEmailHtml } from '../lib/email';
import { checkRateLimit, getClientIp } from '../lib/rate-limit';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

export const authRouter = Router();

const REFRESH_COOKIE = 'jawab_refresh_token';
const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',')[0].trim();

// Cross-site by default in production: the Next.js app (Vercel) and this
// backend (Railway/etc.) sit on different registrable domains, so the
// browser only attaches this cookie to a `credentials: 'include'` fetch
// from the frontend (session restore, refresh) if SameSite is None —
// which itself requires Secure. Dev stays Lax since localhost:3000 and
// localhost:4000 are same-site (SameSite ignores port), where Secure isn't
// available over plain http.
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/auth',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
};

const OAUTH_STATE_COOKIE = 'google_signin_state';
const oauthStateCookieOptions = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, maxAge: 600_000 };

const signupSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6, 'Password should be at least 6 characters.'),
    displayName: z.string().trim().min(1),
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
});

function publicUser(user: { id: string; email: string | null; phone: string | null; displayName: string; role: string; businessId: string | null; onboardingComplete: boolean }) {
    return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        businessId: user.businessId,
        onboardingComplete: user.onboardingComplete,
    };
}

/** Issues a fresh token pair, persists the refresh token's hash, and sets
 * the refresh cookie on the response — the one place both signup and
 * login (and refresh rotation) do this, so the two can't drift apart. */
async function issueSession(res: import('express').Response, userId: string, email: string | null) {
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

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
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

/**
 * GET /auth/google — reached via a plain browser navigation
 * (window.location.href), not fetch, so it can't attach anything; the
 * whole point of a redirect-based OAuth flow is that it doesn't need to.
 */
authRouter.get('/google', asyncHandler(async (req, res) => {
    if (!isGoogleSignInConfigured) {
        res.status(503).json({ error: 'Google sign-in is not configured' });
        return;
    }

    const state = randomBytes(24).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);
    res.redirect(getSignInAuthUrl(state));
}));

authRouter.get('/google/callback', asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    const fail = (reason: string) => res.redirect(`${FRONTEND_ORIGIN}/login?error=${reason}`);

    if (error) return fail('google_access_denied');
    if (!code || !state) return fail('google_missing_params');

    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE);
    if (!storedState || storedState !== state) return fail('google_invalid_state');

    try {
        const identity = await verifyGoogleSignIn(code);

        let user = await prisma.user.findUnique({ where: { email: identity.email } });
        if (!user) {
            user = await prisma.user.create({
                data: { email: identity.email, displayName: identity.name, lastLoginAt: new Date() },
            });
        } else {
            await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        }

        // Sets the httpOnly refresh cookie on this (the backend's own)
        // origin; the frontend picks up the session on the next page load
        // via its existing refreshAccessToken() restore-on-mount flow —
        // there's no access token to hand off through the redirect URL.
        await issueSession(res, user.id, user.email);
        res.redirect(`${FRONTEND_ORIGIN}/auth/callback`);
    } catch (err) {
        console.error('[Auth] Google sign-in error:', err);
        fail('google_signin_failed');
    }
}));

const sendOtpSchema = z.object({
    phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format, e.g. +14155551234'),
});

const SEND_OTP_RATE_LIMIT = 5;
const VERIFY_OTP_RATE_LIMIT = 10;
const OTP_RATE_WINDOW_SECONDS = 10 * 60;

authRouter.post('/phone/send-otp', asyncHandler(async (req, res) => {
    if (!isPhoneVerificationConfigured) {
        res.status(503).json({ error: 'Phone sign-in is not configured' });
        return;
    }

    const { phone } = sendOtpSchema.parse(req.body);

    // Both keys: caps how many codes one phone number can request, and how
    // many an abusive caller can fan out across many numbers from one IP.
    const [phoneLimit, ipLimit] = await Promise.all([
        checkRateLimit(`otp-send:phone:${phone}`, SEND_OTP_RATE_LIMIT, OTP_RATE_WINDOW_SECONDS),
        checkRateLimit(`otp-send:ip:${getClientIp(req)}`, SEND_OTP_RATE_LIMIT * 3, OTP_RATE_WINDOW_SECONDS),
    ]);
    if (!phoneLimit.allowed || !ipLimit.allowed) {
        res.status(429).json({ error: 'Too many requests, please try again later' });
        return;
    }

    await sendPhoneVerification(phone);
    res.json({ sent: true });
}));

const verifyOtpSchema = z.object({
    phone: z.string().trim(),
    code: z.string().trim().length(6),
    displayName: z.string().trim().min(1).max(120).optional(),
});

authRouter.post('/phone/verify-otp', asyncHandler(async (req, res) => {
    if (!isPhoneVerificationConfigured) {
        res.status(503).json({ error: 'Phone sign-in is not configured' });
        return;
    }

    const { phone, code, displayName } = verifyOtpSchema.parse(req.body);

    const rateLimit = await checkRateLimit(`otp-verify:phone:${phone}`, VERIFY_OTP_RATE_LIMIT, OTP_RATE_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.status(429).json({ error: 'Too many attempts, please request a new code' });
        return;
    }

    const approved = await checkPhoneVerification(phone, code);
    if (!approved) {
        res.status(401).json({ error: 'Invalid or expired code' });
        return;
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        user = await prisma.user.create({
            data: { phone, displayName: displayName || 'Jawab User', lastLoginAt: new Date() },
        });
    } else {
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    const accessToken = await issueSession(res, user.id, user.email);
    res.json({ accessToken, user: publicUser(user) });
}));

const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

const FORGOT_PASSWORD_RATE_LIMIT = 5;
const FORGOT_PASSWORD_WINDOW_SECONDS = 15 * 60;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

authRouter.post('/password/forgot', asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);

    const rateLimit = await checkRateLimit(`pwd-forgot:${email}`, FORGOT_PASSWORD_RATE_LIMIT, FORGOT_PASSWORD_WINDOW_SECONDS);
    if (!rateLimit.allowed) {
        res.status(429).json({ error: 'Too many requests, please try again later' });
        return;
    }

    // Always respond 200 regardless of whether the account exists or email
    // sending is even configured — distinguishing those cases lets an
    // attacker enumerate registered emails.
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && isEmailConfigured) {
        const token = randomBytes(32).toString('hex');
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(token),
                expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
            },
        });

        const resetUrl = `${FRONTEND_ORIGIN}/reset-password?token=${token}`;
        await sendEmail({
            to: email,
            subject: 'Reset your Jawab password',
            html: passwordResetEmailHtml(resetUrl),
        });
    }

    res.json({ sent: true });
}));

const resetPasswordSchema = z.object({
    token: z.string().trim().min(1),
    password: z.string().min(6, 'Password should be at least 6 characters.'),
});

authRouter.post('/password/reset', asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const tokenHash = hashToken(token);
    const stored = await prisma.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null } });

    if (!stored || stored.expiresAt < new Date()) {
        res.status(400).json({ error: 'This reset link is invalid or has expired.' });
        return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
        prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
        prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
        // Force re-login everywhere — a leaked/reused old session shouldn't
        // survive a password reset that was presumably triggered because
        // the account was compromised.
        prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    res.json({ success: true });
}));
