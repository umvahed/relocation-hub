# RelocationHub — Full Project Context

---

## What We're Building

**RelocationHub** is a SaaS web application that helps people relocating to the Netherlands organize their entire move in one place. The core insight: moving to the Netherlands involves dozens of interdependent tasks (visa, BSN, DigiD, housing, banking, health insurance, shipping) across multiple institutions, timelines, and documents — and nobody has brought it all together in one intelligent hub.

**Target users:** Expats moving to the Netherlands, primarily from South Africa, UK, US, India, and other countries. Also B2B: relocation companies that can white-label the product for their clients.

**Revenue model:**
- Direct: €3.99/mo per user (self-serve, Stripe subscription)
- Future B2B: white-label licensing to relocation companies
- Future affiliate: moving companies, container shippers, flight aggregators paying to appear on the platform

---

## What's Been Built So Far

### Architecture Overview

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  Frontend (Next.js 16)          │────▶│  Backend (FastAPI / Python)       │
│  Hosted on Vercel               │     │  Hosted on Railway                │
│  relocation-hub.vercel.app      │     │  relocation-hub-production...     │
│                                 │     │  .up.railway.app                  │
└─────────────────────────────────┘     └──────────────────────────────────┘
                                                        │
                              ┌─────────────────────────┼──────────────────┐
                              │                         │                  │
                     ┌────────▼───────┐      ┌──────────▼──────┐  ┌───────▼──────┐
                     │   Supabase     │      │  Anthropic API  │  │   Stripe     │
                     │  (Postgres +   │      │  (Claude AI)    │  │  (Payments)  │
                     │   Auth +       │      └─────────────────┘  └──────────────┘
                     │   Storage)     │
                     └────────────────┘
```

---

### Backend (FastAPI — Python 3.12)

**Location:** `relocation-hub/backend/`
**Deployed:** Railway, auto-deploys on every `git push` to `main`
**Live URL:** `https://relocation-hub-production.up.railway.app`

**Stack:**
- FastAPI + Uvicorn
- Supabase Python client (database + auth)
- Anthropic Python SDK (Claude AI — claude-sonnet-4-5)
- Stripe Python SDK (payments, not yet wired to routes)
- Pydantic v2 + pydantic-settings (config + validation)

**Files:**
```
backend/
├── app/
│   ├── main.py          # App entrypoint, CORS middleware, route registration
│   ├── config.py        # Environment variable loading via pydantic-settings
│   └── routes/
│       ├── health.py    # GET /api/health — Railway healthcheck endpoint
│       ├── auth.py      # POST /api/auth/onboard, GET /api/auth/profile/{id}
│       ├── checklist.py # POST /api/checklist/generate, GET, PATCH
│       └── documents.py # (empty — placeholder for document upload routes)
├── requirements.txt     # All Python dependencies pinned
├── railway.toml         # Railway deployment config (start command, healthcheck)
└── .env                 # Local only — never committed (in .gitignore)
```

**API endpoints live today:**

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Railway healthcheck |
| POST | `/api/auth/onboard` | Creates user profile in Supabase |
| GET | `/api/auth/profile/{user_id}` | Fetches user profile |
| POST | `/api/checklist/generate` | Inserts hardcoded critical tasks + calls Claude for remaining tasks |
| GET | `/api/checklist/{user_id}` | Returns all tasks for a user |
| PATCH | `/api/checklist/task/{task_id}` | Updates a task status (pending/completed) |

**Checklist generation logic:**
1. Always inserts 8 hardcoded `critical` category tasks first (see below)
2. Calls Claude to generate 25-30 additional tasks covering visa, admin, housing, banking, etc.
3. Claude tasks with unrecognised categories default to `admin`
4. All tasks stored in Supabase `tasks` table

**Onboarding inputs passed to Claude:**
- `origin_country`, `employment_type`, `move_date`
- `has_pets` (bool) — adds pet import/vet tasks if true
- `shipping_type` (`container` or `luggage_only`) — adds container/customs tasks if container
- `has_relocation_allowance` (bool) — adds allowance/tax tasks if true

---

### Checklist Task Categories (display order in dashboard)

| Category | Label | Notes |
|---|---|---|
| `critical` | Critical — Required First | Always shown first. Hardcoded. Priority 0. |
| `visa` | Visa & Immigration | MVV, VFS appointment, IND |
| `admin` | Administration | BSN, DigiD, gemeente, SARS notification |
| `employment` | Employment | Contract, 30% ruling, employer tasks |
| `housing` | Housing | Temp accommodation first, then permanent |
| `banking` | Banking & Finance | bunq, ING, international transfers |
| `healthcare` | Healthcare | Zorgverzekering, huisarts registration |
| `transport` | Transport | Driving licence exchange, OV-chipkaart |
| `shipping` | Shipping & Logistics | Container or luggage tasks |
| `pets` | Pet Relocation | Only shown if user has pets |

**Critical tasks (hardcoded, always present, priority 0):**
1. Check passport validity (valid 6+ months, 2 blank pages)
2. Obtain IND approval letter from employer (TEV procedure)
3. Complete and sign MVV application form (VFS Global)
4. Get passport photos (Dutch ICAO: 35x45mm, white background)
5. Pay VFS application fee and save proof of payment
6. Obtain apostilled birth certificate (Home Affairs SA)
7. Obtain apostilled police clearance certificate (SAPS + Home Affairs)
8. Apostille academic and professional qualifications (SAQA + Home Affairs)

These tasks always appear first, support document attachment, and cannot be overridden by Claude.

---

### Correct Relocation Process (South Africa → Netherlands)

This is the real-world sequence that the product must reflect:

**PHASE 1 — Document preparation (must happen before anything else):**
- Apostilled birth certificate, marriage cert (if applicable), police clearance, qualifications
- Valid passport (6+ months validity, 2 blank pages)
- All documents from Home Affairs SA — allow 6-10 weeks

**PHASE 2 — Visa & IND:**
- Employer applies to IND for TEV (combined MVV + residence permit) — NOT the individual
- IND approval letter received (2–90 days depending on permit type)
- Book VFS Global appointment (Pretoria or Cape Town)
- Attend VFS: passport + IND approval letter + signed MVV form + photos + proof of payment
- Collect passport with MVV sticker
- Family members: complete antecedents declaration form — their permits processed 3 months after arrival

**PHASE 3 — Pre-departure logistics:**
- Book flight (MVV valid 90 days from issue — must enter NL within this window)
- Arrange temporary accommodation (Airbnb, short-stay, serviced apt) — do NOT commit to permanent housing yet
- Notify SA bank, arrange international transfers
- Container shipping or luggage decisions

**PHASE 4 — Arrival (first 2 weeks):**
- Register at gemeente within 5 days of establishing address
- BSN issued at gemeente registration
- Open Dutch bank account (bunq/ING — requires BSN)
- Apply for DigiD (requires BSN, takes ~5 days by post)
- Register with a huisarts (GP)
- Arrange zorgverzekering (mandatory within 4 months, backdated to registration)

**PHASE 5 — Settling in:**
- Begin permanent housing search (Funda, Pararius) — income must be 3-4x monthly rent
- Understand Dutch rental market: deposit, bidding, makelaar
- Contents insurance (inboedelverzekering)
- Driving licence exchange (within 6 months of gemeente registration)
- School registration for children

---

### Database (Supabase — PostgreSQL)

**Three tables:**

**`profiles`** — One row per user, linked to Supabase Auth
```sql
id (UUID, FK to auth.users)
email, full_name
origin_country, destination_country (default: Netherlands)
move_date
is_paid (boolean)
stripe_customer_id, stripe_subscription_id
created_at, updated_at
```

**`tasks`** — Checklist items
```sql
id (UUID)
user_id (FK to profiles)
title, description
category (critical/visa/admin/employment/housing/banking/healthcare/transport/shipping/pets)
status (pending/completed)
priority (0 = critical prerequisite, 1-10 = Claude-generated priority)
depends_on (UUID array — future dependency logic)
due_date, external_link
created_at, updated_at
```

**`documents`** — User-uploaded files, attached per task
```sql
id (UUID)
user_id (FK to profiles)
task_id (FK to tasks, nullable)
file_name, file_path, file_size, mime_type
category
ai_validation_status, ai_validation_notes
created_at
```

**Supabase Storage:** `documents` bucket (private). RLS policies restrict access to own folder (`{user_id}/{task_id}/...`).

**Row Level Security (RLS)** is enabled on all three tables.

---

### Frontend (Next.js 16 — TypeScript)

**Location:** `relocation-hub/frontend/`
**Deployed:** Vercel, auto-deploys on every `git push` to `main`
**Live URL:** `https://relocation-hub.vercel.app`

**Stack:**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Inter font (Google Fonts)
- Supabase SSR client (`@supabase/ssr`)
- Google OAuth via Supabase Auth

**Pages built:**

| Route | File | What it does |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — hero gradient, feature icons, pricing, support email in footer |
| `/login` | `app/login/page.tsx` | Sign in / Create account tabs (email+password) + Google OAuth; forgot password flow |
| `/auth/callback` | `app/auth/callback/route.ts` | Exchanges code for session; routes to /dashboard (existing user) or /onboarding (new user) |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Handles PKCE + implicit password reset token; lets user set new password |
| `/onboarding` | `app/onboarding/page.tsx` | 5-step form; guards against already-onboarded users (redirects to dashboard) |
| `/dashboard` | `app/dashboard/page.tsx` | Checklist, countdown banner, settings gear menu, delete account |
| `/documents` | `app/documents/page.tsx` | All uploaded documents grouped by category |

**Dashboard behaviour:**
- Tasks grouped by category in fixed order (critical first) with colour-coded left-border accents
- Sections locked (dimmed) until all critical tasks are ticked off
- Click any task to expand: description, official link, due date picker, Google Calendar add, document upload
- Move-date countdown banner: urgency colour shifts (indigo → amber → rose), celebration state on move day
- Progress bar with milestone messages at 25 / 50 / 75 / 100%
- Settings gear menu (top-right): profile info, HR contact, support email, sign out, delete account (two-step confirm)

**Auth flows:**
- Google OAuth → `/auth/callback` → dashboard or onboarding
- Email sign-up → Supabase verification email → `/auth/callback` → onboarding
- Email sign-in → profile check → dashboard or onboarding
- Forgot password → reset email → `/auth/reset-password` → new password form → dashboard
- Returning users always land on `/dashboard` (callback + onboarding guard both check for existing profile/tasks)

**Lib files:**
- `lib/supabase.ts` — Browser Supabase client (for auth)
- `lib/api.ts` — All fetch calls to the FastAPI backend

---

### Deployment Pipeline

```
git push origin main
        │
        ├──▶ Railway detects push → rebuilds backend
        │         → uvicorn app.main:app --host 0.0.0.0 --port $PORT
        │         → healthcheck: /api/health
        │
        └──▶ Vercel detects push → rebuilds Next.js frontend
```

**Environment variables:**
- Backend (Railway): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`
- Frontend (Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
- Stripe keys are optional (not yet wired)

---

### Auth Flow

```
New user (Google):
  Sign in with Google → /auth/callback → no profile found → /onboarding
  → 5-step form → POST /api/auth/onboard + POST /api/checklist/generate → /dashboard

New user (email):
  Create account → Supabase sends verification email → user clicks link
  → /auth/callback → no profile found → /onboarding → same as above

Returning user (any method):
  Sign in → /auth/callback (or browser client) → profile found → /dashboard

Password reset:
  Forgot password → reset email → /auth/reset-password?code=xxx
  → exchangeCodeForSession → new password form → /dashboard
```

---

## Current Status

✅ Backend live on Railway (FastAPI) — only service on Railway
✅ Frontend live on Vercel (Next.js) — only frontend host, Railway frontend service deleted
✅ Google OAuth + email/password auth (sign up, sign in, forgot password, reset password)
✅ Auth callback smart-routes: returning users → dashboard, new users → onboarding
✅ Onboarding guards against re-entry (already-onboarded users skip to dashboard)
✅ Move date validation: min=today enforced on the date input
✅ 5-step onboarding with logistics questions (pets, shipping, allowance, HR contact)
✅ Checklist generation: hardcoded SA VFS prerequisites (priority 100) + SA document tasks (priority 90) + Claude AI tasks
✅ Claude prompt: explicit conditional notes for all 4 employment types, has_pets false guard, shipping/allowance false-case guards
✅ Dashboard: category sections with left-border colour accents, expandable tasks, document upload per task
✅ Dashboard: non-critical sections locked until all critical tasks completed
✅ Dashboard: move-date countdown banner (urgency colours + celebration state on move day)
✅ Dashboard: progress bar with milestone messages at 25/50/75/100%
✅ Dashboard: settings gear menu — profile info, HR contact, support email, sign out, delete account
✅ Delete account: wipes tasks, documents (storage + DB), api_usage, profile, and auth user
✅ Support email (support@relocationhub.app) in footer and settings menu
✅ force-dynamic on all pages that touch Supabase
✅ Vercel cron keepalive — pings /api/health every 5 min to prevent Railway cold starts
⚠️ Checklist is one-shot per user — changing onboarding answers after generation has no effect. No regenerate flow yet.
⚠️ Supabase Storage bucket `documents` must be manually created with RLS policies
🔲 Stripe billing not yet wired
🔲 Email reminders not yet built
🔲 /auth/reset-password needs `https://relocation-hub.vercel.app/auth/reset-password` added to Supabase Redirect URLs allowlist
🔲 Calendar integration (Google Cal / iCal) — iCal feed exists, one-click Google Cal add exists per task
🔲 Admin portal
🔲 Phase labels (pre-arrival / arrival / post-arrival)

---

## Roadmap

### Next — Milestone 2 (Stripe + Polish)
- Stripe Checkout for €3.99/mo — free users see checklist only; paid users unlock document hub + AI validation
- UI polish continued
- Calendar integration: one-click add IND/VFS/gemeente appointments to Google Calendar or iCal

### Milestone 3 — Smart Features
- Email reminders via Resend (CRON job for overdue tasks)
- Task dependencies (grey out tasks blocked by incomplete prerequisites)
- Phase labels on dashboard (pre-arrival / arrival / post-arrival sections)
- AI document validation: upload doc → Claude reads it → flags issues

### Milestone 4 — Growth
- Housing aggregator (Funda, Pararius scraping)
- Moving company quote form
- Flight suggestions based on IND appointment timing
- Multi-language (Dutch + English)

### Milestone 5 — B2B
- White-label for relocation companies
- Admin dashboard (client progress tracking)
- Bulk onboarding
- Affiliate revenue (moving companies, housing platforms)

---

## Repository Structure

```
relocation-hub/
├── backend/                     ← FastAPI → Railway (only Railway service)
│   ├── app/
│   │   ├── main.py              # CORS allows Vercel origin + localhost
│   │   ├── config.py
│   │   └── routes/
│   │       ├── health.py        # GET /api/health — also used by Vercel keepalive cron
│   │       ├── auth.py
│   │       ├── checklist.py     # SA_VFS_PREREQUISITES + SA_DOCUMENT_TASKS hardcoded
│   │       └── documents.py
│   ├── requirements.txt
│   ├── railway.toml
│   └── .env                     ← local only, gitignored
├── frontend/                    ← Next.js → Vercel (only frontend host)
│   ├── app/
│   │   ├── page.tsx
│   │   ├── login/               # force-dynamic
│   │   ├── onboarding/          # force-dynamic
│   │   ├── dashboard/           # force-dynamic; critical dependency lock
│   │   ├── auth/callback/
│   │   └── api/
│   │       └── keepalive/       # GET — pings Railway /api/health (Vercel cron)
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts
│   ├── vercel.json              # cron: /api/keepalive every 5 min
│   └── .env.local               ← local only, gitignored
├── context.md                   ← this file
├── .gitignore
└── README.md
```

## Environment Variables

**Railway (backend only):**
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
ANTHROPIC_API_KEY
FRONTEND_URL=https://relocation-hub.vercel.app
```

**Vercel (frontend only):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=https://relocation-hub-production.up.railway.app
```

Note: `FRONTEND_URL` belongs in Railway only. `NEXT_PUBLIC_*` vars belong in Vercel only.
