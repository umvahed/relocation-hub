# RelocationHub

SaaS web app helping expats relocating to the Netherlands organise their entire move — visa, admin, housing, banking, healthcare and more — in one intelligent hub.

**Live:** [relocation-hub.vercel.app](https://relocation-hub.vercel.app)
**Free tool:** [30% Ruling Calculator](https://relocation-hub.vercel.app/tools/30-ruling)

---

## Stack

| Layer | Tech | Host |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS v4 | Vercel |
| Backend | FastAPI + Python 3.12 | Railway |
| Database / Auth / Storage | Supabase (Postgres + GoTrue + S3-compatible) | Supabase |
| AI | Anthropic Claude (`claude-sonnet-4-5` / `claude-sonnet-4-6`) | via Railway |
| Email | Resend | via Railway |
| Cron | cron-job.org (keepalive, digest, reminders, appointment reminders) + GitHub Actions (IND weekly reset, Mondays) | — |

---

## Features

### Core (free to start — 7-day full trial)
- **Google OAuth + email/password auth** — sign up, sign in, password reset
- **5-step onboarding** — origin country, employment type, shipping, pets, children, partner, move date, HR contact
- **AI checklist generation** — hardcoded critical SA/VFS tasks + Claude-generated tasks per profile; children-aware (apostilled birth certs, school search, JGZ); partner-aware (`[Partner]` prefixed tasks for EU vs non-EU partners)
- **Custom tasks** — inline "+ Add a task" per category on dashboard; `×` delete for custom tasks only
- **Dashboard** — category sections, dependency lock, countdown banner, progress bar, dark mode, violet Partner badge
- **Legal due dates** — pre-filled from move date for gemeente (5d), DigiD (17d), health insurance (125d), RDW exchange (190d)
- **Document pack** — merged PDF (cover page + all non-failed docs) via pypdf; download or email to HR contact
- **Profile editing + checklist regeneration** — update answers and regenerate the full plan
- **Partner support** — partner name/email/country on profile; checklist generates partner tasks; partner email receives reminders and task-completion notifications
- **Relocation allowance tracker** — set total budget, log expenses per task, running balance, HR email on each expense, PDF statement export
- **Shareable progress link** — `/share/[token]` public read-only one-pager for HR: overall %, per-category bars, risk score, doc count
- **WhatsApp reminder copy** — preformatted message to clipboard for tasks with due dates

### Premium AI (paid tier + 7-day trial)
- **Document AI Validation** — Claude validates docs against IND 2025 rules (PDF + images); GDPR-compliant
- **Relocation Risk Score** — 0–100 across 4 dimensions (critical tasks, timeline, documents, profile) with top blocker surfaced in widget header
- **Inline validation nudges** — contextual "Validate it with AI" buttons on task document rows; auto-validates on upload for critical tasks

### Monitoring & notifications
- **IND Appointment Monitor** — personal per-user flag system (default: slots available); user flips "no slots" after checking OAP; Monday GitHub Actions cron resets all flags + emails subscribers; exception period Nov 24–Jan 7 skips reset; user saves booked appointment → countdown + what-to-bring view; 7d/1d reminder emails
- **Task reminders** — email alerts N days before due date; partner email included for `[Partner]` tasks
- **HR contact notifications** — task completion alerts + weekly progress digest; partner email included for partner tasks

### Tools & integrations
- **iCal feed** — subscribe to task deadlines in Google Calendar / Apple Calendar
- **Document hub** — upload and organise documents per task (Supabase Storage, RLS); back-navigation context from task
- **30% Ruling Calculator** — public, multi-step eligibility calculator at `/tools/30-ruling` (no auth required)
- **Resource links** — city-aware housing (Pararius), ExpatGuide schools (if children), Marktplaats + IKEA (if container)
- **Container arrival estimate** — estimated delivery window based on ship date and origin

---

## Project Structure

```
relocation-hub/
├── .github/
│   ├── workflows/ind_monitor.yml     # Monday 07:00 CET — triggers weekly reset
│   └── scripts/ind_monitor.py        # Calls POST /api/ind-monitor/weekly-reset
├── backend/                          # FastAPI — deployed on Railway
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routes/
│   │       ├── auth.py               # onboard, profile CRUD, consent, tier grant
│   │       ├── checklist.py          # generate, regenerate, tasks, usage
│   │       ├── documents.py          # list, delete
│   │       ├── validation.py         # AI document validation
│   │       ├── risk_score.py         # relocation risk score
│   │       ├── notifications.py      # weekly digest + task completion emails
│   │       ├── reminders.py          # due-date reminders
│   │       ├── calendar.py           # iCal feed
│   │       ├── ind_monitor.py        # IND appointment monitor
│   │       ├── docpack.py            # merged PDF generation
│   │       ├── allowance.py          # relocation allowance tracker
│   │       ├── share.py              # public shareable progress link
│   │       └── health.py
│   └── requirements.txt
├── frontend/                         # Next.js — deployed on Vercel
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── share/[token]/            # Public progress page
│   │   ├── auth/callback/
│   │   ├── tools/30-ruling/          # Public eligibility calculator
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
│   │       ├── keepalive/            # cron-job.org — every 5 min
│   │       ├── weekly-digest/        # cron-job.org — weekly
│   │       ├── send-reminders/       # cron-job.org — daily
│   │       └── ind-appointment-reminders/  # cron-job.org — daily
│   └── lib/
│       ├── api.ts
│       └── supabase.ts
└── supabase/migrations/
    ├── 001_phase1_engagement.sql
    ├── 002_document_validation_risk_score.sql
    ├── 003_ind_monitor.sql
    ├── 004_profile_logistics_columns.sql
    ├── 005_resource_links.sql
    ├── 006_container_ship_date.sql
    ├── 007_notify_by_email.sql
    ├── 008_custom_tasks_and_partner.sql
    ├── 009_trial_ends_at.sql
    ├── 010_allowance_tracker.sql
    ├── 011_share_token.sql
    ├── 012_stripe_fields.sql
    └── 013_ind_community_status.sql  # user_slots_available + ind_appointments
```

---

## Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase + Anthropic + Resend keys
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase + API URL
npm run dev
```

---

## Env vars

| Variable | Location |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel |
| `NEXT_PUBLIC_API_URL` | Vercel |
| `RESEND_API_KEY` | Vercel (cron proxy routes) AND Railway (email sending) |
| `SUPABASE_URL` | Railway |
| `SUPABASE_ANON_KEY` | Railway |
| `SUPABASE_SERVICE_KEY` | Railway |
| `ANTHROPIC_API_KEY` | Railway |
| `RESEND_FROM_EMAIL` | Railway |
| `FRONTEND_URL` | Railway |
| `ADMIN_SECRET` | Railway |
| `RAILWAY_URL` | GitHub Actions secret |

---

## Roadmap

| Phase | Status |
|---|---|
| Phase 1 — Premium AI (Document Validation + Risk Score) | ✅ Complete |
| Phase 2 — Engagement (reminders, notifications, iCal) | ✅ Complete |
| Phase 3 — Innovation (regen, IND monitor, allowance tracker, share link, etc.) | ✅ Complete |
| Phase 4 — Monetisation (Stripe €19.99 one-time) | 🔲 Next |
| Phase 5 — B2B HR Portal | 🔲 Pending |
