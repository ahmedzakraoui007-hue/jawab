# Jawab — Full Codebase Analysis Report

---

## 1. Project Structure Map

```
jawab/
├── .env.local                    # Real credentials (⚠️ EXPOSED in repo)
├── .env.example                  # Template
├── next.config.ts                # Empty — no custom config
├── package.json                  # Next 16, React 19, AntD 6, Firebase 12
├── firestore.rules               # ⚠️ Overly permissive
├── tsconfig.json
├── postcss.config.mjs
├── design.md                     # 44K design spec
├── docs/
│   └── META_WEBHOOK_SETUP.md
├── public/                       # Default Next.js SVGs only
└── src/
    ├── app/
    │   ├── layout.tsx            # Root layout (Inter font, Providers wrapper)
    │   ├── page.tsx              # Landing page (Aceternity UI, dark theme)
    │   ├── providers.tsx         # AuthProvider + AntD + React Query
    │   ├── globals.css           # 1177 lines — full design system + Tailwind
    │   ├── (auth)/
    │   │   ├── login/page.tsx    # Tailwind dark theme, Lucide icons
    │   │   └── signup/page.tsx   # Tailwind dark theme, 495 lines
    │   ├── (dashboard)/
    │   │   ├── layout.tsx        # AntD Layout+Sider+Header, ProtectedRoute
    │   │   └── dashboard/
    │   │       ├── page.tsx              # Overview — mock metrics
    │   │       ├── conversations/page.tsx # Chat inbox — 340 lines, mock data
    │   │       ├── bookings/page.tsx     # Bookings table+calendar — mock data
    │   │       ├── analytics/page.tsx    # Placeholder "coming soon"
    │   │       ├── knowledge/page.tsx    # Services/FAQ CRUD — has API calls
    │   │       └── settings/integrations/page.tsx  # Integration cards
    │   ├── (onboarding)/
    │   │   └── onboarding/page.tsx       # 5-step wizard — custom UI components
    │   └── api/
    │       ├── ai/route.ts               # ⚠️ In-memory chat, mock business
    │       ├── business/faqs/route.ts
    │       ├── business/services/route.ts
    │       ├── calendar/auth|book|callback|slots/
    │       ├── integrations/calendar|meta/
    │       ├── meta/send/route.ts
    │       ├── tts/route.ts
    │       ├── webhooks/meta|voice|whatsapp/
    │       └── whatsapp/send/route.ts
    ├── components/
    │   ├── aceternity/            # 5 animation components (Spotlight, WobbleCard, etc.)
    │   ├── magicui/               # 5 effect components (marquee, border-beam, etc.)
    │   ├── auth/
    │   │   ├── ProtectedRoute.tsx # Client-side auth guard
    │   │   └── index.ts
    │   └── ui/                    # Custom Button, Input, Card, Badge, Avatar
    ├── hooks/                     # (exists but contents not analyzed)
    ├── lib/
    │   ├── firebase.ts            # Firebase init with fallback demo keys
    │   ├── auth-context.tsx       # Full auth: email, Google, phone OTP
    │   ├── gemini.ts              # Gemini 2.0 Flash integration
    │   ├── google-calendar.ts     # Calendar API wrapper
    │   ├── antd-theme.ts          # Custom AntD theme tokens
    │   ├── meta.ts                # Meta/Instagram API
    │   ├── twilio.ts              # Twilio WhatsApp/Voice
    │   ├── elevenlabs.ts          # Voice synthesis
    │   ├── types.ts               # Centralized TypeScript types
    │   └── utils.ts               # Helpers (cn, formatCurrency, detectLanguage)
    ├── styles/                    # Additional styles
    └── types/
        └── index.ts
```

---

## 2. Complete Walkthrough

### What Jawab Does
Jawab is an **AI-powered business receptionist** targeting MENA SMEs (salons, restaurants, clinics). It handles:
- **WhatsApp** automation via Twilio
- **Voice calls** with AI (Gemini + ElevenLabs TTS)
- **Instagram/Facebook** DMs and comments via Meta API
- **Booking management** with Google Calendar integration
- **Dashboard** for business owners to monitor conversations, bookings, and analytics

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| UI (Landing/Auth) | Tailwind CSS 4 + Aceternity UI + Lucide icons |
| UI (Dashboard) | Ant Design 6.2.3 + @ant-design/icons |
| State | React Query (TanStack), Zustand |
| Auth | Firebase Auth (email, Google, phone OTP) |
| Database | Firestore (planned, partially wired) |
| AI | Google Gemini 2.0 Flash |
| Voice | ElevenLabs TTS |
| Messaging | Twilio (WhatsApp/Voice), Meta API (IG/FB) |
| Calendar | Google Calendar API v3 |
| Hosting | Vercel |

### Authentication Setup
- **Firebase config** (`src/lib/firebase.ts`): Singleton init with client/server split. Auth + Storage only init on client (`typeof window !== 'undefined'`). Falls back to demo keys if env vars missing.
- **Auth Context** (`src/lib/auth-context.tsx`): Full `AuthProvider` with email/password, Google popup, phone OTP with reCAPTCHA. Creates user document in Firestore on signup. Reads `businessId`, `role`, `onboardingComplete` from Firestore.
- **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`): Client-side only. Redirects to `/login` if unauthenticated, to `/onboarding` if `requireOnboarding` flag set.

### Routing & Protected Routes
- **Landing** (`/`): Public, dark theme with Aceternity effects
- **Auth** (`/login`, `/signup`): Public, dark Tailwind UI
- **Onboarding** (`/onboarding`): No auth protection currently
- **Dashboard** (`/dashboard/*`): Wrapped in `ProtectedRoute` via `(dashboard)/layout.tsx`
- **API routes** (`/api/*`): **No auth protection at all** — no middleware.ts exists

---

## 3. Issues Found

### 🔴 CRITICAL (Will break production)

**1. API Keys and Secrets Committed to Repository**
- `.env.local` contains **real Firebase, Gemini, Twilio, ElevenLabs, Google Calendar, and Meta API credentials** in plaintext
- These are now in your git history even if you delete the file
- **Action**: Rotate ALL keys immediately. Add `.env.local` to `.gitignore`.

**2. Firebase Auth Domain Mismatch on Vercel**
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is set to `jawab-2026.firebaseapp.com`
- On Vercel, your app runs at `your-app.vercel.app` — Google OAuth `signInWithPopup` will fail because:
  - The redirect URI won't match what's registered in Google Cloud Console
  - Firebase's `authDomain` needs to either match or be explicitly configured
- **Action**: In Firebase Console → Authentication → Settings → Authorized Domains, add your Vercel domain. In Google Cloud Console → OAuth → Authorized redirect URIs, add `https://your-app.vercel.app/__/auth/handler`.

**3. No `middleware.ts` — API Routes Completely Unprotected**
- Any API endpoint (`/api/ai`, `/api/whatsapp/send`, `/api/meta/send`, etc.) can be called by anyone without authentication
- The webhook endpoints legitimately need to be public, but business data and AI endpoints should be protected
- **Action**: Create `middleware.ts` at root with Firebase token verification for `/api/*` routes (exclude webhooks).

**4. In-Memory Chat Storage (`src/app/api/ai/route.ts`)**
- `const conversations = {}` stores chat history in server memory
- On Vercel (serverless), every cold start wipes this. Conversations will randomly reset
- **Action**: Migrate to Firestore

**5. Mock Business Data in AI Route**
- `mockBusiness` object is hardcoded — the AI always responds as "Glamour Ladies Salon"
- No actual business is fetched from Firestore
- **Action**: Fetch business by `businessId` from Firestore

**6. Firestore Rules Too Permissive**
- `allow read: if true` on businesses and conversations means anyone can read all business data
- `allow read, write: if true` on conversations subcollection means anyone can read/write any conversation
- **Action**: Tighten rules to require auth, use Admin SDK for server-side webhook processing

### 🟠 HIGH (Significant problems)

**7. Two Conflicting Design Systems**
- Landing/Auth pages use **Tailwind + dark theme + custom `src/components/ui`**
- Dashboard uses **Ant Design + light theme + AntD components**
- `globals.css` is 1177 lines with a full custom design system that partially conflicts with both
- Body has `color: var(--text-primary)` (dark text) which conflicts with Tailwind dark theme expectations
- CSS `h1-h6` styles set `color: var(--gray-800)` globally, which will override AntD heading colors in some cases

**8. `NEXT_PUBLIC_APP_URL` Still Set to `localhost`**
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
- Any code that uses this for absolute URLs (OAuth callbacks, webhook URLs) will break on Vercel
- **Action**: Set to your Vercel deployment URL, or use `VERCEL_URL` env var

**9. No `vercel.json` Configuration**
- Missing configuration for function timeouts, region, headers
- Webhook endpoints may timeout with default 10s Vercel limit
- **Action**: Add `vercel.json` with appropriate function config

**10. Dashboard is Completely Monolithic**
- `conversations/page.tsx` (340 lines), `bookings/page.tsx` (299 lines), `knowledge/page.tsx` (497 lines) — all inline
- `src/components/dashboard/` directory is completely empty
- **Action**: Extract reusable components (ConversationList, MessageBubble, BookingTable, etc.)

**11. Onboarding Page Has No Auth Protection**
- `/onboarding` route group has no layout wrapping it with `ProtectedRoute`
- Anyone can access the onboarding flow without being logged in
- The `handleComplete` function doesn't save to Firebase — just does `setTimeout` then redirects

**12. `bodyStyle` Deprecated in AntD v6**
- `bookings/page.tsx` line 271 uses `bodyStyle={{ padding: 0 }}` — this prop is deprecated in AntD v5+
- Should use `styles={{ body: { padding: 0 } }}`

### 🟡 MEDIUM

**13. Google Sign-In Popup Blocked on Mobile**
- `signInWithPopup` is used for Google auth — this is frequently blocked on mobile browsers
- **Action**: Add fallback to `signInWithRedirect` for mobile detection

**14. Hardcoded Timezone in Google Calendar**
- `google-calendar.ts` uses `'Asia/Dubai'` timezone hardcoded
- Won't work for businesses outside UAE
- **Action**: Make dynamic from business settings

**15. Hardcoded 30-min Slot Duration**
- Calendar slot generation uses 30-minute intervals despite accepting `serviceDuration` parameter
- **Action**: Use `serviceDuration` for slot calculation

**16. Language Detection is Regex-Based**
- `detectLanguage` in utils.ts uses basic Unicode range checks
- Urdu detection is broken — it checks for Arabic range first, so Urdu always returns `'ar'`

**17. `firebase-admin` in Client Bundle**
- `package.json` includes `firebase-admin` as a regular dependency
- This 10MB+ package should never be in the client bundle — it contains server-only code
- **Action**: Ensure it's only imported in API routes, or move to separate package

**18. Revenue Shows `$` Instead of `AED`**
- `bookings/page.tsx` line 253: `prefix={<Text type="success">$</Text>}` — should be AED
- `formatCurrency` function exists and formats as AED, but isn't used here

**19. AntD Calendar `dateCellRender` Deprecated**
- `bookings/page.tsx` uses `dateCellRender` which is deprecated in AntD v5+
- Should use `cellRender` prop instead

**20. Sidebar Business Name Hardcoded**
- Dashboard layout line 229 shows "Glamour Ladies Salon" / "Professional Plan" hardcoded
- Should be fetched from Firestore based on the logged-in user's `businessId`

**21. Notification Badge Count Hardcoded**
- Dashboard layout: `Badge count={2}` for notifications, `Badge count={3}` on conversations menu item
- These should reflect real data

---

## 4. Summary — Ranked by Severity

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | 🔴 CRITICAL | API keys/secrets committed to repo | `.env.local` |
| 2 | 🔴 CRITICAL | Firebase auth domain mismatch on Vercel | `firebase.ts`, Firebase Console |
| 3 | 🔴 CRITICAL | No middleware.ts — all API routes unprotected | Project root |
| 4 | 🔴 CRITICAL | In-memory chat storage (resets on cold start) | `api/ai/route.ts` |
| 5 | 🔴 CRITICAL | Mock business data in AI route | `api/ai/route.ts` |
| 6 | 🔴 CRITICAL | Firestore rules allow public read/write | `firestore.rules` |
| 7 | 🟠 HIGH | Two conflicting design systems (Tailwind vs AntD) | `globals.css`, all pages |
| 8 | 🟠 HIGH | `NEXT_PUBLIC_APP_URL` set to localhost | `.env.local` |
| 9 | 🟠 HIGH | No `vercel.json` configuration | Project root |
| 10 | 🟠 HIGH | All dashboard pages monolithic (no components) | `(dashboard)/` pages |
| 11 | 🟠 HIGH | Onboarding has no auth or persistence | `onboarding/page.tsx` |
| 12 | 🟠 HIGH | Deprecated `bodyStyle` prop in AntD | `bookings/page.tsx` |
| 13 | 🟡 MEDIUM | Google popup auth blocked on mobile | `auth-context.tsx` |
| 14 | 🟡 MEDIUM | Hardcoded timezone (Asia/Dubai) | `google-calendar.ts` |
| 15 | 🟡 MEDIUM | Hardcoded 30-min slot duration | `google-calendar.ts` |
| 16 | 🟡 MEDIUM | Broken Urdu language detection | `utils.ts` |
| 17 | 🟡 MEDIUM | `firebase-admin` in client bundle | `package.json` |
| 18 | 🟡 MEDIUM | Revenue shows $ instead of AED | `bookings/page.tsx` |
| 19 | 🟡 MEDIUM | Deprecated `dateCellRender` in Calendar | `bookings/page.tsx` |
| 20 | 🟡 MEDIUM | Hardcoded business name in sidebar | `(dashboard)/layout.tsx` |
| 21 | 🟡 MEDIUM | Hardcoded notification badge counts | `(dashboard)/layout.tsx` |

---

**⚠️ IMMEDIATE ACTION REQUIRED: Rotate all API keys in `.env.local` — they are exposed.**