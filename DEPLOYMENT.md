# Deploying Jawab

Jawab is a Next.js app with no bundled backend services — every integration
(auth/database, AI, messaging, calendar, voice) is a third-party account you
provision yourself and wire in via environment variables. This doc walks
through each one. See [.env.example](.env.example) for the full variable
list; copy it to `.env.local` for local development.

Every integration below fails **closed** and independently: if you skip a
section, the feature it powers is disabled (or falls back to a simpler
default) rather than crashing the app. You can deploy with just Firebase +
Gemini working and add channels incrementally.

## 1. Firebase (required — auth, database, admin access)

Every API route needs this. Without it, all Firestore reads/writes and all
webhooks fail closed.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database (production mode, pick a region
   close to your users — this app defaults to `Asia/Dubai` timezone logic
   for bookings).
4. Deploy `firestore.rules` from this repo to your project (Firestore →
   Rules tab, or via the Firebase CLI: `firebase deploy --only firestore:rules`).
   These rules lock every collection to authenticated business members —
   do not skip this step or every customer's conversation data is
   world-readable to any signed-in Firebase user.
5. **Project Settings → General → Your apps** → add a Web app → copy the
   config values into `NEXT_PUBLIC_FIREBASE_*`.
6. **Project Settings → Service Accounts** → Generate new private key →
   downloads a JSON file. Map its fields to:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (keep the `\n` sequences
     literal if your hosting provider stores env vars as single-line
     strings — the app converts them back to real newlines at startup)

   **Never commit this JSON file.** Treat it like a password.

## 2. Google Gemini (required — AI responses + booking actions)

1. Get an API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Set `GEMINI_API_KEY`.

The AI can check calendar availability and create real bookings via
function-calling (see `src/lib/booking-actions.ts`), but only for businesses
that have also connected Google Calendar (§5) — without it, the AI is
instructed to offer a human follow-up instead of inventing appointment
times.

## 3. Platform admin access (required for the admin routes)

Set `ADMIN_EMAILS` to a comma-separated allowlist of the email addresses
that should be able to reassign/remove phone numbers between businesses
(`/api/admin/numbers`). This is a fixed env-var allowlist, not a Firestore
role — there is no per-user "admin" flag in the data model. Leaving it unset
disables the admin routes entirely (they fail closed, not open).

## 4. Twilio — WhatsApp + Voice (optional, enables those channels)

1. Create an account at [console.twilio.com](https://console.twilio.com).
2. Copy **Account SID** and **Auth Token** from the console dashboard into
   `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`.
3. For WhatsApp: Messaging → Try it out → Send a WhatsApp message gives you
   a sandbox number for testing (format `whatsapp:+14155238886`); for
   production, apply for a WhatsApp-enabled number through Twilio. Set
   `TWILIO_WHATSAPP_NUMBER`.
4. In the number's configuration, set the webhook for incoming
   messages/calls to your deployed app:
   - WhatsApp: `https://your-domain.com/api/webhooks/whatsapp` (POST)
   - Voice: `https://your-domain.com/api/webhooks/voice` (POST)
5. Every inbound request is verified against Twilio's `X-Twilio-Signature`
   header (`src/lib/twilio.ts`) — requests that don't validate are rejected
   with 403 before anything else runs. If you see rejected webhooks after
   deploying, double check `NEXT_PUBLIC_APP_URL` matches your actual public
   URL exactly (the signature is computed over the full request URL).

Without Twilio configured, the WhatsApp and Voice channels simply won't
receive traffic — no error, just nothing to route.

## 5. Google Calendar (optional — enables real availability + booking sync)

1. In [console.cloud.google.com](https://console.cloud.google.com), create
   a project (or reuse your Firebase one — they can share a GCP project) and
   enable the **Google Calendar API**.
2. **APIs & Services → OAuth consent screen** — configure it (External is
   fine for testing with individual Google accounts).
3. **APIs & Services → Credentials → Create OAuth client ID** (type: Web
   application). Add this exact redirect URI:
   `{NEXT_PUBLIC_APP_URL}/api/integrations/calendar/callback`
4. Set `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET`.
5. Each business connects their own calendar from the dashboard (Settings →
   Integrations) — this is a per-business OAuth grant, not a single shared
   calendar.

Without this, `check_availability`/`create_booking` (and the dashboard's
manual slots/booking UI) honestly report "calendar not connected" rather
than showing fabricated open slots.

## 6. Meta — Messenger + Instagram DMs/comments (optional)

1. Create an app at [developers.facebook.com](https://developers.facebook.com)
   (type: Business).
2. **Settings → Basic** → copy App ID/Secret into `META_APP_ID` /
   `META_APP_SECRET`.
3. Add the **Messenger** product, connect a Facebook Page, generate a
   Page Access Token → `META_PAGE_ACCESS_TOKEN`. Add the **Instagram**
   product similarly if you want IG DM support, and set
   `INSTAGRAM_ACCOUNT_ID`.
4. Pick your own value for `META_VERIFY_TOKEN` (any string) and enter the
   same value in the Meta webhook setup UI.
5. Webhook URL: `https://your-domain.com/api/webhooks/meta`, subscribed to
   `messages`, `messaging_postbacks`, and `comments`.
6. Requests are verified against `X-Hub-Signature-256` using `META_APP_SECRET`
   (`src/lib/meta.ts`) — unsigned/invalid requests are rejected with 403.
7. **Before going live**, Meta requires App Review for the
   `pages_messaging` permission for any Page you don't personally admin.
   Development-mode apps only work for admins/testers added to the app.

Message sending uses each business's own stored Page/IG token
(`business.meta.accessToken`/`instagramAccountId`, populated by the OAuth
callback in §6 above), so each business only ever sends as its own connected
Page — `META_PAGE_ACCESS_TOKEN` is now just a fallback for a business that
hasn't connected its own Meta account yet (useful for a quick single-tenant
deployment without going through OAuth per business).

## 7. ElevenLabs — natural voice for phone calls (optional)

1. Get an API key at [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys).
2. Set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_VOICE_ID` to
   override the default voice).

Without this, the Voice webhook automatically falls back to Twilio's
built-in Polly voices — no code change needed either way
(`src/app/api/webhooks/voice/route.ts`).

## 8. Stripe (billing)

1. Create an account at [dashboard.stripe.com](https://dashboard.stripe.com)
   (use test-mode keys until you're ready to charge real cards).
2. **Developers → API keys** → copy the **Secret key** into
   `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint** →
   `{NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`, listening for
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy the endpoint's signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. That's it — there's nothing to create in the Stripe dashboard beyond the
   webhook endpoint. Prices are built on the fly from
   `src/lib/pricing.ts` (`price_data` on the Checkout Session) rather than
   36 pre-created Price objects (3 tiers × 6 GCC currencies × 2 intervals),
   so changing a price is a one-line edit in that file, not a dashboard trip.

Without `STRIPE_SECRET_KEY`, the billing/checkout/portal routes return 503.
Without `STRIPE_WEBHOOK_SECRET`, the webhook rejects everything (fails
closed) rather than silently trusting unverified requests. Either way, every
business is still treated as being on its implicit 14-day trial
(`src/lib/billing.ts`) — nothing about AI/booking functionality depends on
Stripe being configured, only on whether the trial/plan is still active.

## 9. Sentry (error monitoring)

1. Create a project at [sentry.io](https://sentry.io) (choose "Next.js" as
   the platform when prompted, though this app's setup doesn't rely on
   Sentry's install wizard).
2. **Settings → Projects → (your project) → Client Keys (DSN)** → copy the
   DSN into both `SENTRY_DSN` (server/edge) and `NEXT_PUBLIC_SENTRY_DSN`
   (browser) — same value, two variables, because the client bundle can
   only see `NEXT_PUBLIC_*`-prefixed vars.

Without either DSN set, `Sentry.init()` runs as an intentional no-op —
nothing is captured or sent anywhere, and nothing else changes. This setup
deliberately does **not** wrap `next.config.ts` in `withSentryConfig`
(which mainly exists for automatic source-map upload) — that plugin needs a
`SENTRY_AUTH_TOKEN` this environment doesn't have, and added build-time
overhead wasn't worth it given this app's build is already close to a
memory ceiling on constrained machines (see Testing & CI below). Runtime
error capture works fully without it; you'd only be missing de-minified
stack traces in the Sentry UI, which you can add later by following
Sentry's Next.js source-maps guide if it turns out to matter.

## Testing & CI

`npm test` runs the Vitest suite (`src/lib/**/*.test.ts`) — unit tests for
the security-critical pure logic that's easy to get subtly wrong:
signature verification (Twilio, Meta), the admin email allowlist, rate-limit
IP parsing, and language/formatting helpers. These don't need any real
credentials — they test the functions directly, not live API calls.

`.github/workflows/ci.yml` runs on every push/PR to `main`: `tsc --noEmit`,
`npm test`, then `npm run build`, all with zero configured secrets — every
integration in this app fails closed when its env vars are unset (rather
than crashing), so a clean build with no `.env` file is exactly what CI is
meant to verify.

## Deploying (Vercel)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add every variable from `.env.example` you're using under Project
   Settings → Environment Variables (for both Production and Preview, if
   you want webhooks to work against preview deployments too).
3. Set `NEXT_PUBLIC_APP_URL` to your final production domain once you have
   one — several OAuth redirect URIs and the Twilio signature check depend
   on it matching exactly.
4. Deploy. Then go back through §4–6 and §8 above and register the
   *actual* deployed webhook/redirect URLs with Twilio/Google/Meta/Stripe —
   those steps need a real URL to point at.

## What's still missing for a full production launch

This app does not yet have:
- **Broad test coverage.** CI (see above) covers typecheck, build, and unit
  tests for pure security/formatting logic — it does not cover API routes,
  React components, Stripe checkout, or integration-level flows end-to-end.
  None of the billing, usage-limit, admin, or Sentry code added in this
  pass has been exercised against a real Stripe/Sentry account — there
  isn't one in this dev environment. Test the checkout → webhook →
  Firestore round trip with Stripe test-mode keys and a real test card
  before relying on it.
- **A self-serve way to change the conversation-limit numbers.** Plan
  quotas (`PLAN_CONVERSATION_LIMITS` in `src/lib/pricing.ts`) are a code
  constant, matched to the marketing page's promised numbers — changing
  them is a one-line edit + deploy, not a dashboard setting.
- **Multi-currency MRR isn't blended into one number.** The admin
  dashboard (`/dashboard/admin`) reports MRR per currency rather than
  guessing at an exchange rate — intentional, not a gap, but worth knowing
  going in if you expected a single top-line figure.
