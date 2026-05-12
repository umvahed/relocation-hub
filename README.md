# RelocationHub

SaaS web app helping expats relocating to the Netherlands organise their entire move — visa, admin, housing, banking, healthcare and more — in one intelligent hub.

**Operated by:** Bitquanta, Pieter Calandlaan 765, 1069SC Amsterdam (KVK 97672920)  
**Live:** [relocation-hub.vercel.app](https://relocation-hub.vercel.app)  
**Free tool:** [30% Ruling Calculator](https://relocation-hub.vercel.app/tools/30-ruling)

---

## Stack

| Layer | Tech | Host |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS v4 | Vercel |
| Backend | FastAPI + Python 3.12 | Railway |
| Database / Auth / Storage | Supabase (Postgres + GoTrue + S3-compatible) | Supabase |
| AI | Anthropic Claude (`claude-sonnet-4-5` checklist · `claude-sonnet-4-6` validation + risk score · `claude-haiku-4-5-20251001` date extraction) | via Railway |
| Payments | Stripe (one-time €19.99) | Stripe |
| Email | Resend | via Railway |
| Cron | cron-job.org (keepalive, digest, reminders, IND appointment reminders) + GitHub Actions (IND weekly reset, Mondays 07:00 CET) | — |

---

## Features

### Free tier
- **Google OAuth + email/password auth** — sign up, sign in, password reset
- **6-step onboarding** — origin country, employment type, logistics + school stage, permit arrangement + situation, move date, HR contact; EU citizen path skips IND tasks
- **AI checklist generation** — hardcoded critical tasks + Claude-generated tasks; EU citizen, highly skilled migrant, ICT transfer paths; partner-aware (`[Partner]` prefixed tasks); school-stage-specific; 30%-ruling task; RDW driving licence exchange note
- **Checklist regeneration** — edit profile answers and regenerate the full plan with a diff banner (added/removed count); custom tasks + completion state preserved
- **Dashboard** — Priority Actions sidebar widget, countdown banner, progress bar, dependency lock, dark mode, violet Partner badge, IND urgency / pre-departure / diff banners
- **Custom tasks** — inline "+ Add a task" per category; `×` delete for custom tasks only
- **Legal due dates** — auto-filled from move date for gemeente (5d), DigiD (17d), health insurance (125d), RDW exchange (190d)
- **IND Appointment Monitor** — personal per-user flag system; Monday GitHub Actions cron resets flags + emails subscribers; exception Nov 24–Jan 7; appointment booking with countdown + what-to-bring; 7d/1d reminder emails
- **Partner support** — partner name/email/country on profile; checklist generates `[Partner]` tasks; partner email receives reminders and task-completion notifications
- **Relocation allowance tracker** — set total budget, log expenses per task, running balance, HR email on each expense, PDF statement export
- **Shareable progress link** — `/share/[token]` public read-only one-pager for HR: overall %, per-category bars, risk score, doc count; print-friendly
- **HR contact notifications** — task completion alerts + weekly progress digest; partner email for partner tasks
- **Task reminders** — email alerts before due date; partner email included for `[Partner]` tasks
- **iCal feed** — subscribe to task deadlines in Google Calendar / Apple Calendar
- **WhatsApp reminder copy** — preformatted message to clipboard for tasks with due dates
- **Document pack** — merged PDF (cover page + all non-failed docs via pypdf); download or email to HR contact
- **Document date extraction** — claude-haiku extracts key dates (passport expiry, flight departure, employment start, tenancy begin) from uploaded docs; persisted to `documents.extracted_date`; auto-runs on every validatable upload
- **30% Ruling Calculator** — public, multi-step eligibility calculator at `/tools/30-ruling` (no auth required)
- **Resource links** — city-aware housing (Pararius), ExpatGuide schools (if children), Marktplaats + IKEA (if container)
- **Container arrival estimate** — origin-country-specific delivery window based on ship date

### Paid tier (€19.99 one-time via Stripe)
- **AI Document Validation** — Claude validates docs against IND 2025 rules (PDF + images); GDPR-compliant; explicit consent required
- **Relocation Risk Score** — 0–100 across 4 dimensions (critical tasks, timeline, documents, profile); top blocker in widget header; action list before dimension breakdown
- **Profile enrichment from documents** — employment contract → salary, job title, permit track, employer extracted by Claude; dismissible offer banner on dashboard
- **Larger file uploads + storage quota**

---

## Project Structure

```
relocation-hub/
├── .github/
│   ├── workflows/ind_monitor.yml       # Monday 07:00 CET — triggers weekly IND flag reset
│   └── scripts/ind_monitor.py          # Calls POST /api/ind-monitor/weekly-reset on Railway
├── backend/
│   ├── app/
│   │   ├── main.py                     # App entrypoint, CORS, route registration
│   │   ├── config.py                   # All env vars incl. Stripe keys
│   │   └── routes/
│   │       ├── auth.py                 # onboard, profile CRUD, consent, admin tier grant
│   │       ├── checklist.py            # generate, regenerate, tasks, usage
│   │       ├── documents.py            # list, delete
│   │       ├── validation.py           # AI validation + date extraction + profile enrichment
│   │       ├── risk_score.py           # relocation risk score
│   │       ├── billing.py              # Stripe checkout + webhook → tier='paid'
│   │       ├── notifications.py        # weekly digest + task completion emails
│   │       ├── reminders.py            # due-date reminders
│   │       ├── calendar.py             # iCal feed
│   │       ├── ind_monitor.py          # IND appointment monitor
│   │       ├── docpack.py              # merged PDF generation
│   │       ├── allowance.py            # relocation allowance tracker
│   │       ├── share.py                # public shareable progress link
│   │       └── health.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── privacy/page.tsx            # GDPR Privacy Policy
│   │   ├── terms/page.tsx              # Terms of Service
│   │   ├── refunds/page.tsx            # Refund Policy
│   │   ├── upgrade/success/page.tsx    # Post-Stripe-payment landing
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── share/[token]/              # Public HR progress page
│   │   ├── auth/callback/
│   │   ├── tools/30-ruling/            # Public eligibility calculator
│   │   ├── components/
│   │   │   ├── RiskScoreWidget.tsx
│   │   │   ├── IndMonitorWidget.tsx
│   │   │   ├── AllowanceTrackerWidget.tsx
│   │   │   ├── ResourcesWidget.tsx
│   │   │   ├── EditProfileModal.tsx
│   │   │   ├── ValidationBadge.tsx
│   │   │   ├── AiConsentModal.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── api/
│   │       ├── keepalive/              # cron-job.org every 5 min
│   │       ├── weekly-digest/          # cron-job.org weekly
│   │       ├── send-reminders/         # cron-job.org daily
│   │       └── ind-appointment-reminders/  # cron-job.org daily
│   └── lib/
│       ├── api.ts                      # All typed fetch helpers
│       └── supabase.ts                 # Browser Supabase client
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
    ├── 013_ind_community_status.sql    # user_slots_available + ind_appointments table
    ├── 014_expanded_onboarding.sql     # 7 new profile columns (permit path, school stage, etc.)
    └── 015_document_dates.sql          # extracted_date + extracted_date_label on documents
```

---

## Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in keys
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.local.example .env.local   # fill in keys
npm run dev
```

---

## Environment Variables

| Variable | Location |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel |
| `NEXT_PUBLIC_API_URL` | Vercel |
| `RESEND_API_KEY` | Vercel (cron proxies) AND Railway (email sending) |
| `SUPABASE_URL` | Railway |
| `SUPABASE_ANON_KEY` | Railway |
| `SUPABASE_SERVICE_KEY` | Railway |
| `ANTHROPIC_API_KEY` | Railway |
| `RESEND_FROM_EMAIL` | Railway |
| `FRONTEND_URL` | Railway |
| `ADMIN_SECRET` | Railway |
| `STRIPE_SECRET_KEY` | Railway |
| `STRIPE_WEBHOOK_SECRET` | Railway |
| `STRIPE_PRICE_ID` | Railway |
| `RAILWAY_URL` | GitHub Actions secret |

`FRONTEND_URL` belongs in Railway ONLY. `NEXT_PUBLIC_*` belong in Vercel ONLY. `RESEND_API_KEY` lives in BOTH.

---

## Roadmap

| Phase | Status |
|---|---|
| Phase 1 — Premium AI (Document Validation + Risk Score) | ✅ Complete |
| Phase 2 — Engagement (reminders, notifications, iCal) | ✅ Complete |
| Phase 3 — Innovation (regen, IND monitor, allowance, share, partner, doc pack, expanded onboarding, profile enrichment, Stripe) | ✅ Complete |
| Phase 4 — B2B HR Portal | 🔲 Next |

---

## Legal

Privacy Policy · Terms of Service · Refund Policy available at `/privacy`, `/terms`, `/refunds`.  
Support: support@relocationhub.app  
Operator: Bitquanta, Pieter Calandlaan 765, 1069SC Amsterdam, KVK 97672920
