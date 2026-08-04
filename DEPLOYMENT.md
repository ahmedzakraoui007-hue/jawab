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

**Known limitation:** message *sending* currently uses the single global
`META_PAGE_ACCESS_TOKEN` for every business rather than a per-business
token, even though the data model has room for one (`business.meta.accessToken`).
This means all businesses on one deployment currently share one Meta Page —
fine for a single-tenant or pilot deployment, not yet correct for true
multi-tenant production use of this channel.

## 7. ElevenLabs — natural voice for phone calls (optional)

1. Get an API key at [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys).
2. Set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_VOICE_ID` to
   override the default voice).

Without this, the Voice webhook automatically falls back to Twilio's
built-in Polly voices — no code change needed either way
(`src/app/api/webhooks/voice/route.ts`).

## Deploying (Vercel)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add every variable from `.env.example` you're using under Project
   Settings → Environment Variables (for both Production and Preview, if
   you want webhooks to work against preview deployments too).
3. Set `NEXT_PUBLIC_APP_URL` to your final production domain once you have
   one — several OAuth redirect URIs and the Twilio signature check depend
   on it matching exactly.
4. Deploy. Then go back through §4–6 above and register the *actual*
   deployed webhook/redirect URLs with Twilio/Google/Meta — those steps
   need a real URL to point at.

## What's still missing for a full production launch

This app does not yet have:
- **Real subscription billing.** Pricing plans are published for reference
  only; no payment processor is integrated, and nothing is charged
  automatically (see `src/content/legal.ts` §3, which now describes this
  accurately rather than promising auto-billing that doesn't exist).
- **A dedicated admin UI.** Platform-admin actions today are limited to
  `/api/admin/numbers`, gated by the `ADMIN_EMAILS` allowlist — there's no
  UI for it yet, just the API.
- **Automated tests / CI.** Changes are currently verified manually via
  `npx tsc --noEmit` and `npm run build` before each commit.
- **Error monitoring** (e.g. Sentry). Errors currently only go to
  `console.error`, which on Vercel means the function logs.
