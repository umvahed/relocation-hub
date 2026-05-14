# Valryn — Full Project Context

---

## What We're Building

**Valryn** is a SaaS platform that helps professionals relocating to the Netherlands organize their entire move in one place. The core insight: moving to the Netherlands involves dozens of interdependent tasks (visa, BSN, DigiD, housing, banking, health insurance, shipping) across multiple institutions, timelines, and documents — and nobody has brought it all together in one intelligent hub.

**Target users:** Professionals moving to the Netherlands, primarily from South Africa, UK, US, India, and other countries. Also B2B: HR teams managing employee relocations.

**Operator:** Bitquanta, Pieter Calandlaan 765, 1069SC Amsterdam (KVK 97672920)
**Support:** support@valryn.com

**Revenue model:**
- Direct: €19.99 one-time per user (self-serve, Stripe — live)
- Future B2B: per-seat pricing for HR/company portals

---

## What's Been Built

### Architecture Overview

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  Frontend (Next.js — App Router)│────▶│  Backend (FastAPI / Python)       │
│  Hosted on Vercel               │     │  Hosted on Railway                │
│  relocation-hub.vercel.app      │     │  relocation-hub-production...     │
│                                 │     │  .up.railway.app                  │
└─────────────────────────────────┘     └──────────────────────────────────┘
                                                        │
                              ┌─────────────────────────┼──────────────────┐
                              │                         │                  │
                     ┌────────▼───────┐      ┌──────────▼──────┐  ┌───────▼──────┐
                     │   Supabase     │      │  Anthropic API  │  │   Resend     │
                     │  (Postgres +   │      │  (Claude AI)    │  │  (email)     │
                     │   Auth +       │      └─────────────────┘  └──────────────┘
                     │   Storage)     │
                     └────────────────┘
                                               ┌──────────────────┐
                                               │  Stripe          │
                                               │  (payments)      │
                                               └──────────────────┘
```

**Cron jobs:**
- cron-job.org: `/api/keepalive` every 5 min (Railway cold-start prevention), `/api/weekly-digest` weekly, `/api/send-reminders` daily, `/api/ind-appointment-reminders` daily
- GitHub Actions: IND weekly reset every Monday 07:00 CET (`.github/workflows/ind_monitor.yml` → calls `POST /api/ind-monitor/weekly-reset` on Railway directly)

Note: `vercel.json` is intentionally empty — Vercel Hobby only allows daily cron frequency. All crons run via cron-job.org or GitHub Actions.

---

### Backend (FastAPI — Python 3.12)

**Location:** `relocation-hub/backend/`
**Deployed:** Railway, auto-deploys on every `git push` to `main`
**Live URL:** `https://relocation-hub-production.up.railway.app`

**Stack:**
- FastAPI + Uvicorn
- Supabase Python client (database + auth)
- Anthropic Python SDK — `claude-sonnet-4-5` for checklist, `claude-sonnet-4-6` for validation + risk score, `claude-haiku-4-5-20251001` for date extraction
- Stripe Python SDK — billing checkout + webhook
- Pydantic v2 + pydantic-settings
- resend (email)
- pypdf (document pack PDF merging)
- fpdf2 (cover page + allowance statement PDF generation)

**Files:**
```
backend/
├── app/
│   ├── main.py           # App entrypoint, CORS middleware, route registration
│   ├── config.py         # Env vars: SUPABASE_*, ANTHROPIC_API_KEY, FRONTEND_URL,
│   │                     #   DAILY_AI_CALL_LIMIT=5, DAILY_VALIDATION_LIMIT=10,
│   │                     #   DAILY_RISK_SCORE_LIMIT=3, ADMIN_SECRET, MAX_VALIDATION_FILE_SIZE,
│   │                     #   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID
│   └── routes/
│       ├── health.py         # GET /api/health
│       ├── auth.py           # onboard, get/update/delete profile, consent PATCH, admin tier grant
│       ├── checklist.py      # generate, regenerate, get, update task, custom task, usage
│       ├── documents.py      # list, delete documents
│       ├── validation.py     # POST validate, GET validation result, POST extract-date, POST enrich-profile
│       ├── risk_score.py     # POST compute, GET risk score
│       ├── billing.py        # POST /billing/create-checkout, POST /billing/webhook (Stripe)
│       ├── notifications.py  # notify_task_complete() + POST /notifications/weekly-digest
│       ├── reminders.py      # POST /reminders/send + PATCH /reminders/task/{task_id}/due-date
│       ├── calendar.py       # GET /calendar/{user_id}/feed.ics
│       ├── ind_monitor.py    # personal flag system: subscribe, report-no-slots, weekly-reset, appointments
│       ├── docpack.py        # merged PDF generation (cover + non-failed docs via pypdf)
│       ├── allowance.py      # relocation allowance tracker: set total, log expenses, PDF statement
│       └── share.py          # public shareable progress link (no auth)
├── requirements.txt
├── railway.toml
└── .env                  ← local only, gitignored
```

**All API endpoints:**

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Railway healthcheck |
| POST | `/api/auth/onboard` | Creates/upserts user profile |
| GET | `/api/auth/profile/{user_id}` | Fetches full profile (incl. tier, consent) |
| PATCH | `/api/auth/profile/{user_id}` | Partial profile update (any field, exclude_unset) |
| PATCH | `/api/auth/profile/{user_id}/consent` | Set/withdraw AI validation consent |
| DELETE | `/api/auth/profile/{user_id}` | Full account deletion (cascades all data) |
| POST | `/api/admin/grant-paid-tier` | Manually grant paid tier (X-Admin-Secret header) |
| POST | `/api/checklist/generate` | Hardcoded critical tasks + Claude AI tasks |
| POST | `/api/checklist/regenerate` | Delete all tasks + re-generate from current profile |
| GET | `/api/checklist/{user_id}` | All tasks for user |
| POST | `/api/checklist/{user_id}/apply-dates` | Apply legal due-date offsets (gemeente, DigiD, health insurance, RDW) |
| POST | `/api/checklist/custom-task` | Create a custom (user-defined) task (source='custom') |
| DELETE | `/api/checklist/task/{task_id}` | Delete a custom task (403 if source != 'custom') |
| PATCH | `/api/checklist/task/{task_id}` | Update task status |
| GET | `/api/usage/{user_id}` | Daily call counts per type: checklist/validation/risk_score |
| GET | `/api/documents/{user_id}` | List uploaded documents |
| DELETE | `/api/documents/{document_id}` | Delete document from storage + DB |
| POST | `/api/documents/{document_id}/validate` | AI validation (paid + consent gated) |
| GET | `/api/documents/{document_id}/validation` | Get latest validation result |
| POST | `/api/documents/{document_id}/extract-date` | Extract key date via claude-haiku (all tiers, no rate limit); persists to `documents.extracted_date` |
| POST | `/api/documents/{document_id}/enrich-profile` | Extract salary/job title/permit track/employer from employment contract (paid, no rate limit) |
| POST | `/api/billing/create-checkout` | Create Stripe Checkout session (one-time €19.99); returns `checkout_url` |
| POST | `/api/billing/webhook` | Stripe webhook: `checkout.session.completed` → `profiles.tier = 'paid'` |
| POST | `/api/risk-score/compute` | Compute + upsert risk score (paid + consent gated) |
| GET | `/api/risk-score/{user_id}` | Get cached risk score |
| GET | `/api/calendar/{user_id}/feed.ics` | iCal feed for deadline tasks |
| POST | `/api/reminders/send` | Send due-date reminder emails (cron) |
| PATCH | `/api/reminders/task/{task_id}/due-date` | Set task due date |
| POST | `/api/notifications/weekly-digest` | Send weekly digest to HR contacts (cron) |
| GET | `/api/ind-monitor/status/{user_id}` | Subscription status + `user_slots_available` flag |
| POST | `/api/ind-monitor/subscribe` | Subscribe user; sets `user_slots_available=true` |
| DELETE | `/api/ind-monitor/subscribe/{user_id}` | Unsubscribe user |
| POST | `/api/ind-monitor/report-no-slots` | User checked OAP and found nothing — flips personal flag to false |
| POST | `/api/ind-monitor/weekly-reset` | Monday cron: resets all flags to true + emails subscribers; skips Nov 24–Jan 7 |
| POST | `/api/ind-monitor/appointment` | Save booked appointment (date + desk); auto-unsubscribes from alerts |
| GET | `/api/ind-monitor/appointment/{user_id}` | Fetch saved appointment |
| DELETE | `/api/ind-monitor/appointment/{user_id}` | Remove appointment |
| POST | `/api/ind-monitor/send-appointment-reminders` | Daily cron: send 7d and 1d pre-appointment reminder emails |
| GET | `/api/docpack/{user_id}` | Build + stream merged PDF (cover page + non-failed docs) |
| POST | `/api/docpack/{user_id}/send-to-hr` | Build merged PDF, upload to Supabase, email 7-day signed URL to HR contact |
| GET | `/api/allowance/{user_id}` | Get allowance summary: total, spent, balance, expenses list |
| PATCH | `/api/allowance/{user_id}/amount` | Set/update total allowance amount |
| POST | `/api/allowance/{user_id}/expense` | Add expense; emails HR contact with balance update |
| DELETE | `/api/allowance/expense/{expense_id}` | Delete an expense (query param: user_id) |
| GET | `/api/allowance/{user_id}/export` | Stream PDF allowance statement |
| GET | `/api/share/{token}` | Public read-only progress summary (no auth) — name, category progress, risk score, doc count |

**Rate limits (per day, per user):**
- Checklist: 5 calls (`DAILY_AI_CALL_LIMIT`)
- Validation: 10 calls (`DAILY_VALIDATION_LIMIT`)
- Risk score: 3 calls (`DAILY_RISK_SCORE_LIMIT`)
- Date extraction + profile enrichment: no rate limit
- Tracked in `api_usage` with `call_type` column; UNIQUE(user_id, date, call_type)

---

### Checklist Task Categories (display order in dashboard)

| Category | Label | Notes |
|---|---|---|
| `critical` | Critical — Required First | Hardcoded. Priority 100/90. Never Claude-generated. |
| `visa` | Visa & Immigration | |
| `employment` | Employment | Contract, 30% ruling |
| `transport` | Transport | Driving licence exchange lives here pre-arrival |
| `shipping` | Shipping & Logistics | Container or luggage |
| `admin` | Dutch Administration | BSN, DigiD, gemeente, RDW exchange (post-arrival) |
| `housing` | Housing | Temp first, then permanent |
| `banking` | Banking & Finance | |
| `healthcare` | Healthcare | Zorgverzekering, huisarts |
| `pets` | Pet Relocation | Only shown if user has pets |

Dashboard splits into two visual phases:
- **Before you leave**: critical, visa, employment, transport, shipping
- **After you arrive**: admin (Dutch Administration), housing, banking, healthcare, pets

---

### Database (Supabase — PostgreSQL)

**`profiles`**
```sql
id (UUID, FK to auth.users)
email, full_name, origin_country, destination_country, employment_type
move_date, has_pets, shipping_type, has_relocation_allowance
contact_name, contact_email
destination_city (text, nullable)
has_children (boolean, default false)
number_of_children (int, nullable)
container_ship_date (date, nullable)
notify_by_email (boolean, default true)
has_partner (boolean, default false)
partner_full_name (text, nullable)
partner_email (text, nullable)
partner_origin_country (text, nullable)
tier ('free' | 'paid', default 'free')
tier_granted_at (timestamptz)
trial_ends_at (timestamptz)   -- set once on first onboard; isPaid = tier='paid' OR trial_ends_at > now()
ai_validation_consent (boolean, default false)
ai_validation_consent_at (timestamptz)
stripe_customer_id (text, nullable)
stripe_subscription_id (text, nullable)
share_token (text, UNIQUE, nullable)   -- set on first share; used for /share/[token] public page
relocation_allowance (numeric, nullable)   -- total allowance budget
-- Migration 014 additions:
employer_arranges_permit ('employer' | 'self' | 'eu_citizen' | 'unsure', nullable)
employer_is_sponsor (boolean, nullable)
has_driving_licence (boolean, nullable)
driving_licence_country (text, nullable)
children_school_stage ('preschool' | 'primary' | 'secondary' | 'both' | 'not_sure', nullable)
expects_30_ruling (boolean, nullable)
already_in_netherlands (boolean, nullable)
created_at, updated_at
```

**`tasks`**
```sql
id, user_id, title, description
category (critical/visa/employment/transport/shipping/admin/housing/banking/healthcare/pets)
status (pending/completed), priority (100/90 = hardcoded critical, 1-10 = Claude)
source ('hardcoded' | 'ai' | 'custom')   -- only 'custom' tasks are deletable via UI
due_date, reminder_sent_at, external_link, depends_on
created_at, updated_at
```

**`documents`**
```sql
id, user_id, task_id (nullable), file_name, file_path, file_size, mime_type, category
extracted_date (text, nullable)        -- YYYY-MM-DD; extracted by claude-haiku (migration 015)
extracted_date_label (text, nullable)  -- max 4 words e.g. "Passport expiry date" (migration 015)
created_at
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

**`ind_monitor_subscriptions`**
```sql
id, user_id (UNIQUE, FK → profiles ON DELETE CASCADE)
email, active (boolean), last_notified_at, created_at
user_slots_available (boolean, default true)   -- optimistic; user flips false after checking OAP; Monday cron resets to true
```

**`ind_appointments`**
```sql
id (UUID), user_id (UNIQUE, FK → profiles ON DELETE CASCADE)
desk_code (text), desk_name (text)
appointment_date (date)
reminder_sent_7d (boolean, default false)
reminder_sent_1d (boolean, default false)
created_at
```

**`relocation_expenses`**
```sql
id (UUID), user_id (FK → profiles ON DELETE CASCADE)
task_id (nullable, FK → tasks)
description (text), amount_eur (numeric)
created_at
```

**Migrations:**
- `000_initial_schema.sql` — profiles, tasks, documents base schema
- `001_phase1_engagement.sql` — api_usage, contact columns, reminder_sent_at
- `002_document_validation_risk_score.sql` — document_validations, risk_scores, profiles tier/consent columns, api_usage call_type
- `003_ind_monitor.sql` — ind_monitor_subscriptions
- `004_profile_logistics_columns.sql` — employment_type, has_pets, shipping_type, has_relocation_allowance on profiles
- `005_profile_city_children.sql` — destination_city, has_children, number_of_children on profiles
- `006_container_ship_date.sql` — container_ship_date on profiles
- `007_notification_preferences.sql` — notify_by_email BOOLEAN NOT NULL DEFAULT TRUE on profiles
- `008_custom_tasks_and_partner.sql` — tasks.source column; has_partner, partner_full_name, partner_email, partner_origin_country on profiles
- `009_trial_ends_at.sql` — trial_ends_at TIMESTAMPTZ on profiles
- `010_allowance_tracker.sql` — relocation_expenses table; relocation_allowance column on profiles
- `011_share_token.sql` — share_token UNIQUE TEXT on profiles
- `012_ind_slot_data.sql` — stripe_customer_id, stripe_subscription_id on profiles
- `013_ind_community_status.sql` — user_slots_available on ind_monitor_subscriptions; ind_appointments table
- `014_expanded_onboarding.sql` — 7 new profile columns (employer_arranges_permit, employer_is_sponsor, has_driving_licence, driving_licence_country, children_school_stage, expects_30_ruling, already_in_netherlands)
- `015_document_dates.sql` — extracted_date + extracted_date_label TEXT columns on documents

**Supabase Storage:** `documents` bucket (private). RLS policies restrict to own folder.

---

### Frontend (Next.js — TypeScript)

**Location:** `relocation-hub/frontend/`
**Deployed:** Vercel, auto-deploys on `git push` to `main`
**Live URL:** `https://relocation-hub.vercel.app`

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, Supabase SSR client

**Pages:**

| Route | File | What it does |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — hero, feature grid, pricing, footer with legal links |
| `/login` | `app/login/page.tsx` | Email+password + Google OAuth + forgot password |
| `/auth/callback` | `app/auth/callback/route.ts` | Smart routing: profile found → dashboard, no profile → onboarding |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | PKCE + implicit password reset |
| `/onboarding` | `app/onboarding/page.tsx` | 6-step form; guards re-entry |
| `/dashboard` | `app/dashboard/page.tsx` | Checklist, countdown banner, widgets, upgrade CTA, settings, delete account |
| `/documents` | `app/documents/page.tsx` | Documents grouped by category, ValidationBadge, Validate button |
| `/share/[token]` | `app/share/[token]/page.tsx` | Public read-only HR progress one-pager (no auth required) |
| `/tools/30-ruling` | `app/tools/30-ruling/page.tsx` | Public 30% ruling eligibility calculator — 4 hard gates, no auth |
| `/privacy` | `app/privacy/page.tsx` | GDPR Privacy Policy (Bitquanta data controller) |
| `/terms` | `app/terms/page.tsx` | Terms of Service (EU Consumer Rights, payment terms, IP, governing law) |
| `/refunds` | `app/refunds/page.tsx` | Refund Policy (voluntary 14-day guarantee) |
| `/upgrade/success` | `app/upgrade/success/page.tsx` | Post-Stripe-payment landing; auto-redirects to dashboard after 4s |

**Components (`app/components/`):**

| File | Purpose |
|---|---|
| `AiConsentModal.tsx` | GDPR consent modal (not dismissable via Escape/backdrop) |
| `ValidationBadge.tsx` | Pill badge (pass/warn/fail) + expandable issues list |
| `RiskScoreWidget.tsx` | Score card: top blocker in collapsed header, risk items before dimension breakdown |
| `IndMonitorWidget.tsx` | IND slot availability status (always visible) + subscription toggle + appointment booking |
| `AllowanceTrackerWidget.tsx` | Set total budget, log expenses per task, running balance, HR email on each expense, PDF export |
| `EditProfileModal.tsx` | Edit all profile fields incl. partner section; Save profile or Save & regenerate checklist |
| `ResourcesWidget.tsx` | City-aware housing (Pararius), ExpatGuide schools (if children), Marktplaats + IKEA (if container) |
| `ThemeToggle.tsx` | Dark/light mode toggle |
| `InstallPrompt.tsx` | PWA install banner (bottom of dashboard): native `beforeinstallprompt` on Android, manual Share instructions on iOS; dismisses permanently via `localStorage` |

**Cron proxy routes (`app/api/`):**

| Route | Hits | Schedule |
|---|---|---|
| `keepalive/` | Railway `/api/health` | Every 5 min (cron-job.org) |
| `weekly-digest/` | Railway `/api/notifications/weekly-digest` | Weekly (cron-job.org) |
| `send-reminders/` | Railway `/api/reminders/send` | Daily (cron-job.org) |
| `ind-appointment-reminders/` | Railway `/api/ind-monitor/send-appointment-reminders` | Daily (cron-job.org) |

Note: IND weekly flag reset runs via GitHub Actions (`.github/workflows/ind_monitor.yml`), not via a Vercel proxy.

**Lib files:**
- `lib/supabase.ts` — Browser Supabase client
- `lib/api.ts` — All fetch calls to FastAPI backend (full TypeScript types for all features, including `createCheckoutSession`)

---

### IND Appointment Monitor — Design Notes

**Why no scraping:** The IND OAP (Online Appointment Portal) is protected by Cloudflare Bot Management. All cloud/datacenter IPs (Railway = AWS, Vercel = Cloudflare, GitHub Actions = Azure) are blocked at the CDN layer — returns a JS challenge page, not the JSON response. Scraping is definitively impossible from any hosted service.

**Personal flag system:** Each subscribed user has `user_slots_available BOOLEAN DEFAULT TRUE` — optimistic by default. The user manually checks OAP and clicks "I checked — no slots available" to flip their personal flag to false. Every Monday 07:00 CET, GitHub Actions resets all flags to true and emails subscribers to check again. Exception period Nov 24–Jan 7 skips the reset (IND holiday closure).

**Widget state machine (6 states):**
1. Loading
2. Appointment booked → countdown to appointment date + what-to-bring list
3. Not subscribed → shows availability status + "Remind me" CTA
4. Exception period → holiday message
5. Subscribed + slots available → green status + "I checked — no slots available" button
6. Subscribed + no slots → amber status + instructions to keep checking

**Nearest desk detection:** `CITY_TO_DESK` map in the widget maps destination cities to IND desk codes. Shows "Nearest IND desk: [Name]" when `destinationCity` is set in profile.

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
- Strictly necessary cookies only (Supabase auth session) — no consent banner needed.
- AP (Autoriteit Persoonsgegevens) is the supervisory authority.

---

### Stripe Billing

- One-time payment €19.99 (EUR), card only via Stripe Checkout
- `POST /api/billing/create-checkout`: accepts `{ user_id, email }`, creates Checkout session, returns `{ checkout_url }`
- `POST /api/billing/webhook`: verifies `stripe-signature` header; on `checkout.session.completed` → `profiles.tier = 'paid'`
- Success URL: `/upgrade/success?session_id={CHECKOUT_SESSION_ID}` — auto-redirects to dashboard after 4s
- Cancel URL: `/dashboard`
- `metadata.user_id` passed through Checkout to webhook for profile update
- No guard logic changes needed — tier checks already in place throughout frontend + backend

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
RESEND_API_KEY, RESEND_FROM_EMAIL
FRONTEND_URL=https://relocation-hub.vercel.app
ADMIN_SECRET=<random string>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

Vercel (frontend):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=https://relocation-hub-production.up.railway.app
RESEND_API_KEY    ← needed by cron proxy routes (server-side only, no NEXT_PUBLIC_)
```

GitHub Actions secrets:
```
RAILWAY_URL    ← used by ind_monitor.yml to call POST /api/ind-monitor/weekly-reset
RESEND_API_KEY ← used by ind_monitor.yml for auth header (ADMIN_SECRET pattern)
```

---

## Current Status

✅ Google OAuth + email/password auth (sign up, sign in, forgot password, reset password)
✅ 6-step onboarding (basics, employment, logistics+school-stage, permit+situation, move-date, HR-contact)
✅ AI checklist generation: hardcoded SA VFS tasks + Claude-generated tasks; EU citizen path; children-aware; partner-aware (`[Partner]` prefixed tasks); school-stage-specific; 30%-ruling task; RDW driving-licence note
✅ Dashboard: category sections, dependency lock, countdown banner, progress bar, dark mode, violet Partner badge
✅ Priority Actions widget: top-of-sidebar card showing overdue + due-soon + next critical tasks with scroll-to-task
✅ Legal due dates: auto-applied from move_date for gemeente (5d), DigiD (17d), health insurance (125d), RDW exchange (190d)
✅ Document upload per task (Supabase Storage)
✅ Document date extraction: claude-haiku extracts key dates (passport expiry, flight, employment start, tenancy begin); persisted to `documents.extracted_date`; auto-runs on upload
✅ Document list page (`/documents`)
✅ iCal feed + per-task Google Calendar add button
✅ Task search bar
✅ Custom tasks: inline "+ Add a task" per category; `×` delete for source='custom' tasks only
✅ Delete account (cascades all data)
✅ Dark mode
✅ **Document AI Validation** — Claude validates against IND 2025 rules, GDPR-compliant, paid tier gated
✅ **Relocation Risk Score** — 0–100 across 4 dimensions; top blocker surfaced in collapsed widget header; action list before dimension breakdown
✅ Paid tier system: `profiles.tier`, Stripe checkout, webhook, consent modal, consent withdrawal
✅ 7-day free trial — trial_ends_at set on first onboard; all paid features accessible during trial
✅ Per-type rate limiting (checklist / validation / risk_score)
✅ Task completion confirmation dialog: critical tasks warn about IND documents; others prompt to attach a document
✅ Task completion → HR contact email notification
✅ Weekly digest email to HR contacts (cron-job.org)
✅ Task due-date reminders via Resend (cron-job.org); partner email included for `[Partner]` tasks
✅ Email notification preference (notify_by_email toggle)
✅ **Profile editing + checklist regeneration** — EditProfileModal (incl. partner section); preserves custom tasks + completed status + manually-set due dates; diff banner (added/removed count)
✅ **IND Appointment Slot Monitor** — personal per-user flag system; Monday GitHub Actions reset; exception period Nov 24–Jan 7; appointment booking with countdown + what-to-bring view; 7d/1d reminder emails; nearest desk detection
✅ **30% Ruling calculator** — `/tools/30-ruling`, public, 4 hard gates (employer/distance/timing/salary), net monthly estimate, linked from landing + dashboard
✅ **Resource links** — ResourcesWidget: Pararius deep-link (city-aware), ExpatGuide schools (if children), Marktplaats + IKEA (if container)
✅ **Container shipping** — 3 shipping options, container_ship_date, ContainerArrivalBanner, arrival window estimate
✅ **Document pack** — merged PDF with cover page + per-document divider pages (showing #, filename, category) + document pages; download + send to HR with 7-day signed URL
✅ **Partner support** — partner fields on profile; `[Partner]` prefixed tasks; violet Partner badge on dashboard; partner email for reminders + completion notifications
✅ **Relocation allowance tracker** — set total budget, log expenses per task, running balance, HR email on each expense, PDF statement export
✅ **Shareable progress link** — `/share/[token]` public read-only one-pager for HR: overall %, per-category bars, risk score, doc count; print-friendly
✅ **WhatsApp reminder copy** — preformatted message copied to clipboard for tasks with due dates
✅ **Profile enrichment from documents** — employment contract → salary/job title/permit track/employer extracted by Claude; dismissible offer banner on dashboard
✅ **Expanded onboarding (6 steps)** — permit arrangement, IND sponsor, already-in-NL, driving licence, school stage, 30% ruling expectation; EU citizen path skips IND tasks
✅ **Stripe payments** — one-time €19.99; sidebar upgrade button; `/upgrade/success` redirect page
✅ **Legal pages** — `/privacy` (GDPR compliant), `/terms` (EU Consumer Rights Directive), `/refunds` (voluntary 14-day guarantee)
✅ **Landing page revamp** — hero, 9-feature grid, pricing section, expanded footer with legal links
✅ **PWA install prompt** — `manifest.json` + `icon.svg` (Valryn V-mark, dark navy, gradient violet); `InstallPrompt.tsx` on dashboard; Apple meta tags in layout; `beforeinstallprompt` on Android, Share instructions on iOS
✅ **Share page Next.js 16 fix** — `params` in async Server Components is a Promise in Next.js 15+; `/share/[token]/page.tsx` now `await`s params before use

---

## Roadmap

### Phase 1 — Premium AI features ✅ COMPLETE
1. ✅ Document AI Validation
2. ✅ Relocation Risk Score

### Phase 2 — Engagement layer ✅ COMPLETE
- Task completion → HR contact email (`notify_task_complete`)
- Weekly digest to HR contact (`POST /notifications/weekly-digest`)
- Task due-date reminders (`POST /reminders/send`)
- iCal feed (`GET /calendar/{user_id}/feed.ics`)
- Keepalive + cron jobs running

### Phase 3 — Innovation ✅ COMPLETE
1. ✅ Checklist regeneration + profile editing
2. ✅ IND Appointment Slot Monitor
3. ✅ 30% Ruling eligibility calculator
4. ✅ Resource links
5. ✅ Container shipping improvements + task search
6. ✅ Document pack — merged PDF
7. ✅ Custom tasks + partner support
8. ✅ Relocation allowance tracker
9. ✅ Shareable progress link
10. ✅ Risk score top blocker + action list
11. ✅ WhatsApp reminder copy
12. ✅ Expanded onboarding (6 steps) — EU citizen path, school stage, permit arrangement
13. ✅ School-stage-specific tasks + RDW direct-exchange + 30%-ruling task + employer_is_sponsor blocker
14. ✅ Profile enrichment from documents (salary, job title, permit track, employer)
15. ✅ Dashboard Priority Actions widget
16. ✅ Document date extraction (claude-haiku) + auto-runs on upload
17. ✅ Task completion confirmation dialog (critical vs non-critical messaging)

### Phase 4 — Monetisation ✅ COMPLETE
- ✅ Stripe one-time payment €19.99
- ✅ `POST /api/billing/create-checkout` + `POST /api/billing/webhook`
- ✅ Sidebar upgrade button (handles trial active/expired/none states)
- ✅ `/upgrade/success` landing page
- ✅ Legal pages: `/privacy`, `/terms`, `/refunds`
- ✅ Landing page revamp

### Phase 5 — B2B HR Portal ← NEXT
- Companies pay per-seat; HR admins manage multiple relocatees from one dashboard
- Data model: `companies` table + `company_users` junction (role: hr_admin | employee)
- HR portal at `/hr` — Google OAuth only, role-checked on sign-in
- Employee list with progress bars, critical task status, document count
- RLS policies for HR read access scoped to company_users
- Pricing: per-employee seat fee via Stripe, separate product from individual one-time €19.99

---

## Repository Structure

```
relocation-hub/
├── .github/
│   ├── workflows/
│   │   └── ind_monitor.yml     # Monday 07:00 CET — triggers weekly IND flag reset
│   └── scripts/
│       └── ind_monitor.py      # Calls POST /api/ind-monitor/weekly-reset on Railway
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routes/
│   │       ├── health.py
│   │       ├── auth.py
│   │       ├── checklist.py
│   │       ├── documents.py
│   │       ├── validation.py
│   │       ├── risk_score.py
│   │       ├── billing.py
│   │       ├── notifications.py
│   │       ├── reminders.py
│   │       ├── calendar.py
│   │       ├── ind_monitor.py
│   │       ├── docpack.py
│   │       ├── allowance.py
│   │       └── share.py
│   ├── requirements.txt
│   └── railway.toml
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── refunds/page.tsx
│   │   ├── upgrade/success/page.tsx
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── share/[token]/
│   │   ├── auth/callback/
│   │   ├── tools/
│   │   │   └── 30-ruling/
│   │   ├── components/
│   │   │   ├── AiConsentModal.tsx
│   │   │   ├── ValidationBadge.tsx
│   │   │   ├── RiskScoreWidget.tsx
│   │   │   ├── IndMonitorWidget.tsx
│   │   │   ├── AllowanceTrackerWidget.tsx
│   │   │   ├── EditProfileModal.tsx
│   │   │   ├── ResourcesWidget.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── InstallPrompt.tsx
│   │   └── api/
│   │       ├── keepalive/
│   │       ├── weekly-digest/
│   │       ├── send-reminders/
│   │       └── ind-appointment-reminders/
│   ├── public/
│   │   ├── manifest.json         # PWA manifest (display: standalone, theme: #4f46e5)
│   │   └── icons/
│   │       └── icon.svg          # Valryn V-mark (dark navy bg, gradient violet)
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts
│   └── vercel.json               ← intentionally empty (Hobby plan)
└── supabase/migrations/
    ├── 000_initial_schema.sql
    ├── 001_phase1_engagement.sql
    ├── 002_document_validation_risk_score.sql
    ├── 003_ind_monitor.sql
    ├── 004_profile_logistics_columns.sql
    ├── 005_profile_city_children.sql
    ├── 006_container_ship_date.sql
    ├── 007_notification_preferences.sql
    ├── 008_custom_tasks_and_partner.sql
    ├── 009_trial_ends_at.sql
    ├── 010_allowance_tracker.sql
    ├── 011_share_token.sql
    ├── 012_ind_slot_data.sql
    ├── 013_ind_community_status.sql
    ├── 014_expanded_onboarding.sql
    └── 015_document_dates.sql
```
