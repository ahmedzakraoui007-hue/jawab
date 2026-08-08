// Several lib modules read process.env at module-load time (not lazily),
// so these need to be set before any test file imports them. Vitest loads
// setupFiles before the test file's own imports are evaluated, so this
// works — but don't rely on being able to change these mid-test-file.
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-auth-token';
process.env.META_APP_SECRET = 'test-meta-app-secret';
process.env.ADMIN_EMAILS = 'admin@example.com, Owner@Example.com';
