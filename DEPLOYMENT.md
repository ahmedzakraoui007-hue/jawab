# Deploying Jawab

Jawab is two deployable pieces: this Next.js app (marketing site + dashboard
UI only — a pure frontend, deployed to Vercel) and a standalone Express API
in [server/](server/) (auth, business data, every webhook, AI/booking,
billing, admin — all of it). Every third-party integration (AI, messaging,
calendar, voice, billing) is an account you provision yourself and wire in
via the **backend's** environment variables — the Next.js app itself only
needs to know where the backend lives. This doc walks through each one. See
[.env.example](.env.example) (this app) and
[server/.env.example](server/.env.example) (the backend, which holds nearly
everything) for the full variable lists.

Every integration below fails **closed** and independently: if you skip a
section, the feature it powers is disabled (or falls back to a simpler
default) rather than crashing the app. You can deploy with just the backend
+ Postgres + Gemini working and add channels incrementally.

Firebase has been fully removed from this project — there is no Firestore,
no Firebase Auth, and no `firebase`/`firebase-admin` dependency anywhere in
either app. Everything lives in Postgres via the backend below.

## 0. The standalone backend (server/) — required for everything

Handles auth, business data, webhooks, AI/booking, billing, and admin. See
[server/.env.example](server/.env.example) for the full variable list.

1. Provision a Postgres database — [Railway](https://railway.app) is the
   recommended default (bundles Node hosting + managed Postgres in one
   project with git-push deploys; any Postgres host works equally well,
   e.g. Neon, Render, Supabase-as-just-Postgres). Copy the connection
   string into `DATABASE_URL`.
2. Generate two long random secrets for `JWT_ACCESS_SECRET` and
   `JWT_REFRESH_SECRET` (must be different values —
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   The server refuses to start without both set, rather than silently
   issuing forgeable tokens.
3. Set `FRONTEND_ORIGIN` to this Next.js app's URL (for CORS).
4. Set `BACKEND_PUBLIC_URL` once deployed — used to build OAuth redirect
   URIs (Google Calendar, Meta) and the audio URLs Twilio fetches for voice
   calls.
5. `cd server && npm install && npx prisma migrate deploy` to create the
   schema, then `npm run build && npm start` (or `npm run dev` locally).
6. In the Next.js app's own `.env.local`/Vercel env, set
   `NEXT_PUBLIC_BACKEND_URL` to wherever you deployed this, and
   `JWT_ACCESS_SECRET` to the **exact same value** as step 2 — the
   Next.js app's `middleware.ts` and every `backendFetch` call attach/verify
   access tokens the backend signs, so the two sides have to share that
   secret. (`JWT_REFRESH_SECRET` stays backend-only; the Next.js app never
   verifies a refresh token itself.)

## 1. Google Gemini (required — AI responses + booking actions)

1. Get an API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Set `GEMINI_API_KEY` on the **backend**.

The AI can check calendar availability and create real bookings via
function-calling (see `server/src/lib/booking-actions.ts`), but only for
businesses that have also connected Google Calendar (§4) — without it, the
AI is instructed to offer a human follow-up instead of inventing
appointment times.

## 2. Platform admin access (required for the admin routes)

Set `ADMIN_EMAILS` on the **backend** to a comma-separated allowlist of the
email addresses that should be able to reassign/remove phone numbers
between businesses (`/admin/numbers`) and change plan conversation limits
(`/admin/plan-limits`, surfaced in the admin dashboard's "Plan conversation
limits" card — overriding a tier there takes effect immediately, no
deploy). This is a fixed env-var allowlist, not a database role — there is
no per-user "admin" flag in the data model. Leaving it unset disables the
admin routes entirely (they fail closed, not open).

## 3. Twilio — WhatsApp + Voice (optional, enables those channels)

1. Create an account at [console.twilio.com](https://console.twilio.com).
2. Copy **Account SID** and **Auth Token** from the console dashboard into
   `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` on the **backend**.
3. For WhatsApp: Messaging → Try it out → Send a WhatsApp message gives you
   a sandbox number for testing (format `whatsapp:+14155238886`); for
   production, apply for a WhatsApp-enabled number through Twilio. Set
   `TWILIO_WHATSAPP_NUMBER`.
4. In the number's configuration, set the webhook for incoming
   messages/calls to your deployed **backend**:
   - WhatsApp: `https://your-backend-domain.com/webhooks/whatsapp` (POST)
   - Voice: `https://your-backend-domain.com/webhooks/voice` (POST)
5. Every inbound request is verified against Twilio's `X-Twilio-Signature`
   header (`server/src/lib/twilio.ts`) — requests that don't validate are
   rejected with 403 before anything else runs. If you see rejected
   webhooks after deploying, double check `BACKEND_PUBLIC_URL` matches your
   actual public URL exactly (the signature is computed over the full
   request URL).

Without Twilio configured, the WhatsApp and Voice channels simply won't
receive traffic — no error, just nothing to route.

## 4. Google OAuth — Calendar sync AND "Sign in with Google" (optional)

One Google Cloud OAuth client covers both features below — set it up once.

1. In [console.cloud.google.com](https://console.cloud.google.com), create
   a project and enable the **Google Calendar API**.
2. **APIs & Services → OAuth consent screen** — configure it (External is
   fine for testing with individual Google accounts).
3. **APIs & Services → Credentials → Create OAuth client ID** (type: Web
   application). Add **both** of these exact redirect URIs to the same
   client:
   - `{BACKEND_PUBLIC_URL}/integrations/calendar/callback` (Calendar sync)
   - `{BACKEND_PUBLIC_URL}/auth/google/callback` (Google sign-in)
4. Set `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` on the
   **backend**.
5. Each business connects their own calendar from the dashboard (Settings →
   Integrations) — this is a per-business OAuth grant, not a single shared
   calendar. Google sign-in itself needs no further setup once the client
   above is configured — the "Continue with Google" button on
   login/signup just starts working.

Without this, `check_availability`/`create_booking` (and the dashboard's
manual slots/booking UI) honestly report "calendar not connected" rather
than showing fabricated open slots. The "Continue with Google" button
returns a clear 503 rather than a broken redirect.

## 4b. Phone sign-in — Twilio Verify (optional)

1. In the [Twilio Console](https://console.twilio.com) → **Verify** →
   **Services** → Create new service (any friendly name).
2. Copy its Service SID into `TWILIO_VERIFY_SERVICE_SID` on the
   **backend** — reuses `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` from §3
   above, no separate credentials needed.

Without this, the phone tab on login/signup returns a clear 503 instead of
silently failing to send a code. Twilio itself owns code generation,
expiry, and attempt-limiting — nothing is stored on our side beyond the
outcome of a check.

## 4c. Password reset email — Resend (optional)

1. Create an account at [resend.com](https://resend.com) and verify a
   sending domain (or use the shared `onboarding@resend.dev` test address
   for local dev only — it can't deliver to real users' inboxes).
2. **API Keys** → create one → set `RESEND_API_KEY` on the **backend**.
3. Set `EMAIL_FROM` to your verified sender, e.g.
   `Jawab <noreply@yourdomain.com>`.

Without this, `/auth/password/forgot` still responds 200 (it never
reveals whether an account exists, configured or not) but no email is
actually sent — logged as a warning, not surfaced to the user.

## 5. Meta — Messenger + Instagram DMs/comments (optional)

1. Create an app at [developers.facebook.com](https://developers.facebook.com)
   (type: Business).
2. **Settings → Basic** → copy App ID/Secret into `META_APP_ID` /
   `META_APP_SECRET` on the **backend**.
3. Add the **Messenger** product, connect a Facebook Page, generate a
   Page Access Token → `META_PAGE_ACCESS_TOKEN`. Add the **Instagram**
   product similarly if you want IG DM support, and set
   `INSTAGRAM_ACCOUNT_ID`.
4. Pick your own value for `META_VERIFY_TOKEN` (any string) and enter the
   same value in the Meta webhook setup UI.
5. Webhook URL: `https://your-backend-domain.com/webhooks/meta`, subscribed
   to `messages`, `messaging_postbacks`, and `comments`.
6. Requests are verified against `X-Hub-Signature-256` using `META_APP_SECRET`
   (`server/src/lib/meta.ts`) — unsigned/invalid requests are rejected with
   403.
7. **Before going live**, Meta requires App Review for the
   `pages_messaging` permission for any Page you don't personally admin.
   Development-mode apps only work for admins/testers added to the app.

### Multi-tenancy: `META_PAGE_ACCESS_TOKEN` vs. per-business tokens

Message sending uses each business's own stored Page/IG token
(`business.metaAccessToken`/`metaInstagramAccountId`, populated by the
OAuth callback above), so each business only ever sends as its own
connected Page.

A business that has **not** connected its own Meta account has no token. By
default it is refused — the webhook skips its messages and `/send/meta`
returns 503 — rather than falling back to `META_PAGE_ACCESS_TOKEN`. That
fallback would make every unconnected business send as, and act on behalf
of, whichever single Page that env var belongs to.

Set `META_ALLOW_SHARED_TOKEN=true` to re-enable the fallback. Do this only
for a single-tenant pilot where that Page is your own. Every use of it logs
a warning naming the call site. In any deployment serving more than one
business, leave it unset and have each business complete the OAuth connect
in **Dashboard → Settings → Integrations**.

## 6. ElevenLabs — natural voice for phone calls (optional)

1. Get an API key at [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys).
2. Set `ELEVENLABS_API_KEY` on the **backend** (and optionally
   `ELEVENLABS_VOICE_ID` to override the default voice).

Without this, the Voice webhook automatically falls back to Twilio's
built-in Polly voices — no code change needed either way
(`server/src/routes/webhooks/voice.ts`).

## 7. Stripe (billing)

1. Create an account at [dashboard.stripe.com](https://dashboard.stripe.com)
   (use test-mode keys until you're ready to charge real cards).
2. **Developers → API keys** → copy the **Secret key** into
   `STRIPE_SECRET_KEY` on the **backend**.
3. **Developers → Webhooks → Add endpoint** →
   `{BACKEND_PUBLIC_URL}/webhooks/stripe`, listening for
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy the endpoint's signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. That's it — there's nothing to create in the Stripe dashboard beyond the
   webhook endpoint. Prices are built on the fly from
   `server/src/lib/pricing.ts` (`price_data` on the Checkout Session)
   rather than 36 pre-created Price objects (3 tiers × 6 GCC currencies × 2
   intervals), so changing a price is a one-line edit in that file, not a
   dashboard trip.

Without `STRIPE_SECRET_KEY`, the billing/checkout/portal routes return 503.
Without `STRIPE_WEBHOOK_SECRET`, the webhook rejects everything (fails
closed) rather than silently trusting unverified requests. Either way, every
business is still treated as being on its implicit 14-day trial
(`server/src/lib/billing.ts`) — nothing about AI/booking functionality
depends on Stripe being configured, only on whether the trial/plan is
still active.

**Real payments have not yet been exercised end-to-end against a live
Stripe account in this environment** — test the checkout → webhook →
Postgres round trip with Stripe test-mode keys and a real test card before
relying on it in production.

## 8. Sentry (error monitoring)

1. Create a project at [sentry.io](https://sentry.io) (choose "Next.js" as
   the platform when prompted, though this app's setup doesn't rely on
   Sentry's install wizard).
2. **Settings → Projects → (your project) → Client Keys (DSN)** → copy the
   DSN into both `SENTRY_DSN` (server/edge) and `NEXT_PUBLIC_SENTRY_DSN`
   (browser) — same value, two variables, because the client bundle can
   only see `NEXT_PUBLIC_*`-prefixed vars. These are set on the **Next.js
   app**, not the backend.

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

Both apps have their own Vitest suite:
- `npm test` (Next.js app) — mostly formatting/pricing helpers now that
  the security-critical logic has moved to the backend.
- `cd server && npm test` — signature verification (Twilio, Meta), the
  admin email allowlist, rate-limit IP parsing, JWT signing/verification,
  and password hashing. These don't need any real credentials — they test
  the functions directly, not live API calls.

`.github/workflows/ci.yml` runs on every push/PR to `main`: `tsc --noEmit`,
`npm test`, then `npm run build`, for both apps, all with zero configured
secrets — every integration fails closed when its env vars are unset
(rather than crashing), so a clean build with no `.env` file is exactly
what CI is meant to verify.

## Deploying (Vercel + Railway)

1. **Backend first**: deploy `server/` to Railway (or wherever), following
   §0 above, and confirm it boots with `GET /health` (or equivalent)
   responding before moving on.
2. Import the repo root at [vercel.com/new](https://vercel.com/new) for the
   Next.js app — set the **Root Directory** to the repo root (not
   `server/`) so Vercel builds the Next.js app, not the Express API.
3. Add every variable from `.env.example` you're using under Project
   Settings → Environment Variables (for both Production and Preview).
4. Set `NEXT_PUBLIC_APP_URL` to your final production domain once you have
   one, and `NEXT_PUBLIC_BACKEND_URL` to the backend's deployed URL.
5. Deploy. Then go back through §3, §4, §5, and §7 above and register the
   *actual* deployed webhook/redirect URLs (all pointing at the
   **backend's** domain) with Twilio/Google/Meta/Stripe.

## What's still missing for a full production launch

This app does not yet have:
- **Broad test coverage.** CI (see above) covers typecheck, build, and unit
  tests for pure security/formatting logic on both apps — it does not
  cover API routes, React components, Stripe checkout, or
  integration-level flows end-to-end.
- **Real payments have not been exercised against a live Stripe account**
  in this dev environment — see §7.
- **No admin UI beyond the existing `/dashboard/admin` page** for managing
  users/businesses directly in Postgres — day-to-day admin work (fixing a
  stuck business, manually adjusting a plan) currently means a direct
  database query via Prisma Studio (`cd server && npx prisma studio`) or
  `psql`, not a built-in tool.
- **Multi-currency MRR isn't blended into one number.** The admin
  dashboard (`/dashboard/admin`) reports MRR per currency rather than
  guessing at an exchange rate — intentional, not a gap, but worth knowing
  going in if you expected a single top-line figure.
