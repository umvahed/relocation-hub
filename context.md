# RelocationHub — Full Project Context

---

## What We're Building

**RelocationHub** is a SaaS web application that helps people relocating to the Netherlands organize their entire move in one place. The core insight: moving to the Netherlands involves dozens of interdependent tasks (visa, BSN, DigiD, housing, banking, health insurance, shipping) across multiple institutions, timelines, and documents — and nobody has brought it all together in one intelligent hub.

**Target users:** Expats moving to the Netherlands, primarily from South Africa, UK, US, India, and other countries. Also B2B: relocation companies that can white-label the product for their clients.

**Revenue model:**
- Direct: €3.99/mo per user (self-serve, Stripe subscription)
- Future B2B: white-label licensing to relocation companies
- Future affiliate: moving companies, container shippers, flight aggregators

---

## What's Been Built

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
                     │  (Postgres +   │      │  (Claude AI)    │  │  (not wired) │
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
- Anthropic Python SDK — `claude-sonnet-4-5` for checklist, `claude-sonnet-4-6` for validation + risk score
- Pydantic v2 + pydantic-settings

**Files:**
```
backend/
├── app/
│   ├── main.py           # App entrypoint, CORS middleware, route registration
│   ├── config.py         # Env vars: SUPABASE_*, ANTHROPIC_API_KEY, FRONTEND_URL,
│   │                     #   DAILY_AI_CALL_LIMIT=5, DAILY_VALIDATION_LIMIT=10,
│   │                     #   DAILY_RISK_SCORE_LIMIT=3, ADMIN_SECRET, MAX_VALIDATION_FILE_SIZE
│   └── routes/
│       ├── health.py         # GET /api/health
│       ├── auth.py           # onboard, get profile, consent PATCH, admin tier grant, delete account
│       ├── checklist.py      # generate, get, update task, usage endpoint; _check_and_increment_usage(call_type)
│       ├── documents.py      # list, delete documents
│       ├── validation.py     # POST validate, GET validation result
│       ├── risk_score.py     # POST compute, GET risk score
│       ├── notifications.py  # email notifications (Resend) — needs audit
│       ├── reminders.py      # task reminders — needs audit
│       └── calendar.py       # iCal feed
├── requirements.txt
├── railway.toml
└── .env                  ← local only, gitignored
```

**API endpoints:**

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Railway healthcheck |
| POST | `/api/auth/onboard` | Creates/upserts user profile |
| GET | `/api/auth/profile/{user_id}` | Fetches full profile (incl. tier, consent) |
| PATCH | `/api/auth/profile/{user_id}/consent` | Set/withdraw AI validation consent |
| POST | `/api/admin/grant-paid-tier` | Manually grant paid tier (X-Admin-Secret header) |
| DELETE | `/api/auth/profile/{user_id}` | Full account deletion (cascades all data incl. risk_scores) |
| POST | `/api/checklist/generate` | Hardcoded critical tasks + Claude AI tasks |
| GET | `/api/checklist/{user_id}` | All tasks for user |
| PATCH | `/api/checklist/task/{task_id}` | Update task status |
| GET | `/api/usage/{user_id}` | Daily call counts per type: checklist/validation/risk_score |
| GET | `/api/documents/{user_id}` | List uploaded documents |
| DELETE | `/api/documents/{document_id}` | Delete document from storage + DB |
| POST | `/api/documents/{document_id}/validate` | AI validation (paid + consent gated) |
| GET | `/api/documents/{document_id}/validation` | Get latest validation result |
| POST | `/api/risk-score/compute` | Compute + upsert risk score (paid + consent gated) |
| GET | `/api/risk-score/{user_id}` | Get cached risk score |
| GET | `/api/calendar/{user_id}/feed.ics` | iCal feed for deadline tasks |

**Rate limits (per day, per user):**
- Checklist: 5 calls (`DAILY_AI_CALL_LIMIT`)
- Validation: 10 calls (`DAILY_VALIDATION_LIMIT`)
- Risk score: 3 calls (`DAILY_RISK_SCORE_LIMIT`)
- Tracked in `api_usage` with `call_type` column; UNIQUE(user_id, date, call_type)

---

### Checklist Task Categories (display order in dashboard)

| Category | Label | Notes |
|---|---|---|
| `critical` | Critical — Required First | Hardcoded. Priority 100/90. Never Claude-generated. |
| `visa` | Visa & Immigration | |
| `admin` | Administration | BSN, DigiD, gemeente |
| `employment` | Employment | Contract, 30% ruling |
| `housing` | Housing | Temp first, then permanent |
| `banking` | Banking & Finance | |
| `healthcare` | Healthcare | Zorgverzekering, huisarts |
| `transport` | Transport | Driving licence exchange |
| `shipping` | Shipping & Logistics | Container or luggage |
| `pets` | Pet Relocation | Only shown if user has pets |

---

### Database (Supabase — PostgreSQL)

**`profiles`**
```sql
id (UUID, FK to auth.users)
email, full_name, origin_country, destination_country, employment_type
move_date, has_pets, shipping_type, has_relocation_allowance
contact_name, contact_email
tier ('free' | 'paid', default 'free')
tier_granted_at (timestamptz)
ai_validation_consent (boolean, default false)
ai_validation_consent_at (timestamptz)
stripe_customer_id, stripe_subscription_id
created_at, updated_at
```

**`tasks`**
```sql
id, user_id, title, description
category (critical/visa/admin/employment/housing/banking/healthcare/transport/shipping/pets)
status (pending/completed), priority (100/90 = hardcoded critical, 1-10 = Claude)
due_date, reminder_sent_at, external_link, depends_on
created_at, updated_at
```

**`documents`**
```sql
id, user_id, task_id (nullable), file_name, file_path, file_size, mime_type, category, created_at
```

**`document_validations`** — AI results only, no raw file content
```sql
id, document_id (FK → documents ON DELETE CASCADE), user_id
status ('pass' | 'warn' | 'fail'), summary (no PII)
issues (jsonb: [{severity, field, message, action}])
model_version, validated_at
```

**`risk_scores`** — one row per user, upserted on recompute
```sql
id, user_id (UNIQUE), score (0-100), risk_level ('low' | 'med' | 'high')
risk_items (jsonb: [{rank, category, title, detail, action}])
dimension_scores (jsonb: {critical_completion, timeline_feasibility, document_readiness, profile_completeness})
computed_at
```

**`api_usage`**
```sql
id, user_id, date, call_count, call_type ('checklist' | 'validation' | 'risk_score')
UNIQUE(user_id, date, call_type)
```

**Migrations:**
- `001_phase1_engagement.sql` — api_usage, contact columns, reminder_sent_at
- `002_document_validation_risk_score.sql` — document_validations, risk_scores, profiles tier/consent columns, api_usage call_type

**Supabase Storage:** `documents` bucket (private). RLS policies restrict to own folder.

---

### Frontend (Next.js 16 — TypeScript)

**Location:** `relocation-hub/frontend/`
**Deployed:** Vercel, auto-deploys on `git push` to `main`
**Live URL:** `https://relocation-hub.vercel.app`

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase SSR client

**Pages:**

| Route | File | What it does |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/login` | `app/login/page.tsx` | Email+password + Google OAuth + forgot password |
| `/auth/callback` | `app/auth/callback/route.ts` | Smart routing: profile found → dashboard, no profile → onboarding |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | PKCE + implicit password reset |
| `/onboarding` | `app/onboarding/page.tsx` | 5-step form; guards re-entry |
| `/dashboard` | `app/dashboard/page.tsx` | Checklist, countdown banner, RiskScoreWidget, settings, delete account |
| `/documents` | `app/documents/page.tsx` | Documents grouped by category, ValidationBadge, Validate button |

**Components (`app/components/`):**

| File | Purpose |
|---|---|
| `AiConsentModal.tsx` | GDPR consent modal (not dismissable via Escape/backdrop); loading state during PATCH |
| `ValidationBadge.tsx` | Pill badge (pass/warn/fail) + expandable issues list |
| `RiskScoreWidget.tsx` | Score card: progress bar + risk level + dimension breakdown + top risk items + Refresh |

**Lib files:**
- `lib/supabase.ts` — Browser Supabase client
- `lib/api.ts` — All fetch calls to FastAPI backend (incl. validateDocument, computeRiskScore, updateConsent, getRiskScore + full TypeScript types)

---

### GDPR / Document Validation Rules

- Document bytes fetched into Railway RAM → sent to Claude → immediately discarded. Never written to disk, never logged.
- Only validation results (JSON) stored — no raw content.
- Explicit consent required before first AI call. Stored as `profiles.ai_validation_consent` + `ai_validation_consent_at`.
- Consent withdrawable from settings menu (dashboard).
- `document_validations` has CASCADE on `documents.id` — deleting a doc auto-deletes its validation.
- `delete_account` explicitly deletes `risk_scores` row.
- Exception handlers log only `document_id`, never file content.
- Supported MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`. Word/DOCX → 422.
- Legal basis: Article 6(1)(b) GDPR — contract performance.

---

### Deployment Pipeline

```
git push origin main
        │
        ├──▶ Railway → rebuilds backend → uvicorn app.main:app
        │
        └──▶ Vercel → rebuilds Next.js frontend
```

**Environment variables:**

Railway (backend):
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
ANTHROPIC_API_KEY
FRONTEND_URL=https://relocation-hub.vercel.app
ADMIN_SECRET=<random string>
```

Vercel (frontend):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=https://relocation-hub-production.up.railway.app
```

---

## Current Status

✅ Google OAuth + email/password auth (sign up, sign in, forgot password, reset password)
✅ 5-step onboarding with logistics questions (pets, shipping, allowance, HR contact)
✅ AI checklist generation: hardcoded SA VFS tasks + Claude-generated tasks
✅ Dashboard: category sections, dependency lock, countdown banner, progress bar, settings menu
✅ Document upload per task (Supabase Storage)
✅ Document list page (`/documents`)
✅ iCal feed + per-task Google Calendar add button
✅ Delete account (cascades all data)
✅ **Document AI Validation** — Claude validates against IND 2025 rules, GDPR-compliant, paid tier gated
✅ **Relocation Risk Score** — 0–100 across 4 dimensions, Claude risk items, dashboard widget
✅ Paid tier system: `profiles.tier`, admin grant endpoint, consent modal, consent withdrawal
✅ Per-type rate limiting (checklist / validation / risk_score)
⚠️ Checklist is one-shot — no regenerate flow. Changing onboarding answers after generation has no effect.
🔲 Stripe billing
🔲 Email reminders (Resend) — `reminders.py` exists, needs audit
🔲 HR contact notifications (Resend) — `notifications.py` exists, needs audit
🔲 Checklist regeneration endpoint

---

## Roadmap

### Phase 1 — Premium AI features ✅ COMPLETE
1. ✅ Document AI Validation
2. ✅ Relocation Risk Score

### Phase 2 — Engagement layer (next)
1. Audit `notifications.py`, `reminders.py`, `calendar.py` — determine what's wired vs. missing
2. Email reminders — per-task due dates, configurable cadence via Resend
3. HR/consultant contact notifications — task completion alerts + weekly digest (key differentiator)
4. Checklist regeneration — `/api/checklist/regenerate` (delete + regenerate from updated profile)

### Phase 3 — Monetisation
- Stripe Checkout €3.99/mo
- Webhook on `checkout.session.completed` → `profiles.tier = 'paid'`
- No frontend/backend guard changes needed (402 handling already in place)

### Phase 4 — B2B white-label
- HR/Company Portal: companies pay per-employee; HR sees all relocatees' progress
- Admin dashboard, bulk onboarding, task annotation

---

## Repository Structure

```
relocation-hub/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routes/
│   │       ├── health.py
│   │       ├── auth.py          # consent PATCH + admin tier grant added
│   │       ├── checklist.py     # _check_and_increment_usage(call_type) + usage breakdown
│   │       ├── documents.py
│   │       ├── validation.py    # Document AI Validation
│   │       ├── risk_score.py    # Relocation Risk Score
│   │       ├── notifications.py # needs audit
│   │       ├── reminders.py     # needs audit
│   │       └── calendar.py
│   ├── requirements.txt
│   └── railway.toml
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── auth/callback/
│   │   ├── components/
│   │   │   ├── AiConsentModal.tsx
│   │   │   ├── ValidationBadge.tsx
│   │   │   └── RiskScoreWidget.tsx
│   │   └── api/keepalive/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts
│   └── vercel.json              # cron: /api/keepalive every 5 min
├── supabase/migrations/
│   ├── 001_phase1_engagement.sql
│   └── 002_document_validation_risk_score.sql
├── PLAN.md
├── CLAUDE.md
└── context.md
```
