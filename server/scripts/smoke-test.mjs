#!/usr/bin/env node
/**
 * End-to-end smoke test against a RUNNING server instance with a real
 * Postgres behind it — signup -> login -> /auth/me -> create business ->
 * /businesses/me, asserting each response shape. Not part of `npm test`
 * (those are pure unit tests with no live network/DB) — run this manually
 * after `npx prisma migrate dev` against a real database:
 *
 *   npm run dev              # in one terminal
 *   node scripts/smoke-test.mjs   # in another
 *
 * Uses a randomized email each run so it can be re-run without manually
 * clearing the users table first.
 */

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:4000';
const email = `smoke-test-${Date.now()}@example.com`;
const password = 'correct-horse-battery-staple';
const displayName = 'Smoke Test Owner';

let failures = 0;

function assert(condition, message) {
    if (!condition) {
        failures++;
        console.error(`✗ ${message}`);
    } else {
        console.log(`✓ ${message}`);
    }
}

async function main() {
    console.log(`Running smoke test against ${BASE_URL} as ${email}\n`);

    // A cookie jar isn't available via plain fetch — capture and resend
    // the refresh cookie manually across requests, same as a real browser
    // would automatically, just done by hand here.
    let refreshCookie;

    function withCookie(headers = {}) {
        return refreshCookie ? { ...headers, Cookie: refreshCookie } : headers;
    }

    function captureCookie(res) {
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) refreshCookie = setCookie.split(';')[0];
    }

    // 1. Signup
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
    });
    captureCookie(signupRes);
    const signupData = await signupRes.json();
    assert(signupRes.status === 201, `signup returns 201 (got ${signupRes.status})`);
    assert(typeof signupData.accessToken === 'string', 'signup returns an accessToken');
    assert(signupData.user?.email === email, 'signup returns the correct user email');
    assert(signupData.user?.onboardingComplete === false, 'new user has onboardingComplete: false');

    let accessToken = signupData.accessToken;

    // 2. GET /auth/me with the access token
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, `GET /auth/me returns 200 (got ${meRes.status})`);
    assert(meData.user?.email === email, '/auth/me returns the same user');

    // 3. Login (separately, to prove the password round-trips through
    // bcrypt correctly, not just that signup issued a valid session)
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    captureCookie(loginRes);
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, `login returns 200 (got ${loginRes.status})`);
    accessToken = loginData.accessToken;

    // 4. Wrong password is rejected
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrong-password' }),
    });
    assert(badLoginRes.status === 401, `login with wrong password returns 401 (got ${badLoginRes.status})`);

    // 5. Create a business
    const createBizRes = await fetch(`${BASE_URL}/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
            name: 'Smoke Test Salon',
            industry: 'salon',
            address: '123 Test St',
            area: 'Downtown',
            city: 'Dubai',
            hours: { monday: { open: '10:00', close: '20:00' } },
            services: [{ name: 'Haircut', price: 100, duration: 45 }],
        }),
    });
    const createBizData = await createBizRes.json();
    assert(createBizRes.status === 201, `create business returns 201 (got ${createBizRes.status})`);
    assert(createBizData.business?.name === 'Smoke Test Salon', 'business name round-trips correctly');

    // 6. GET /businesses/me reflects the newly created business
    const getBizRes = await fetch(`${BASE_URL}/businesses/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const getBizData = await getBizRes.json();
    assert(getBizRes.status === 200, `GET /businesses/me returns 200 (got ${getBizRes.status})`);
    assert(getBizData.business?.id === createBizData.business?.id, '/businesses/me returns the same business just created');

    // 7. Refresh token rotation
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: withCookie(),
    });
    captureCookie(refreshRes);
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, `refresh returns 200 (got ${refreshRes.status})`);
    assert(refreshData.accessToken !== accessToken, 'refresh issues a brand new access token');

    // 8. The rotated-out refresh cookie no longer works if replayed
    // (can't easily replay the OLD cookie here since captureCookie
    // overwrote it — this is a known gap in this script, not a claim that
    // rotation is untested; see server/src/lib/jwt.test.ts's coverage of
    // the underlying token verification instead).

    // 9. Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: withCookie(),
    });
    assert(logoutRes.status === 204, `logout returns 204 (got ${logoutRes.status})`);

    console.log(`\n${failures === 0 ? '✓ All checks passed' : `✗ ${failures} check(s) failed`}`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('Smoke test crashed:', err);
    process.exit(1);
});
