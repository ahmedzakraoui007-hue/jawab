// lib/jwt.ts throws at import time if these are unset (refuses to start
// with a missing signing secret) — must be set before any test file
// imports it. See the main app's vitest.setup.ts for the same pattern.
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.META_APP_SECRET = 'test-meta-app-secret';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-auth-token';
process.env.ADMIN_EMAILS = 'admin@example.com, Owner@Example.com';
