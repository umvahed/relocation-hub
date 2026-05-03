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
| Cron | Vercel (keepalive) + cron-job.org (digest, reminders, IND monitor) | — |

---

## Features

### Core (free to start)
- **Google OAuth + email/password auth** — sign up, sign in, password reset
- **5-step onboarding** — origin country, move date, employment type, shipping, pets, HR contact
- **AI checklist generation** — hardcoded critical SA/VFS tasks + Claude-generated tasks per profile
- **Dashboard** — category sections, dependency lock, countdown banner, progress bar, dark mode
- **Profile editing + checklist regeneration** — update answers and regenerate the full plan

### Premium AI (paid tier)
- **Document AI Validation** — Claude validates docs against IND 2025 rules (PDF + images); GDPR-compliant
- **Relocation Risk Score** — 0–100 across 4 dimensions (critical tasks, timeline, documents, profile) with top risk items

### Monitoring & notifications
- **IND Appointment Slot Monitor** — polls OAP API every 4h across all 4 desks; emails subscribers when slots open
- **Task reminders** — email alerts N days before due date via Resend
- **HR contact notifications** — task completion alerts + weekly progress digest to relocation contact

### Tools & integrations
- **iCal feed** — subscribe to task deadlines in Google Calendar / Apple Calendar
- **Document hub** — upload and organise documents per task (Supabase Storage, RLS)
- **30% Ruling Calculator** — public, multi-step eligibility calculator at `/tools/30-ruling` (no auth required)

---

## Project Structure

```
relocation-hub/
├── backend/                  # FastAPI — deployed on Railway
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routes/
│   │       ├── auth.py           # onboard, profile CRUD, consent, tier grant
│   │       ├── checklist.py      # generate, regenerate, tasks, usage
│   │       ├── documents.py      # list, delete
│   │       ├── validation.py     # AI document validation
│   │       ├── risk_score.py     # relocation risk score
│   │       ├── notifications.py  # weekly digest + task completion emails
│   │       ├── reminders.py      # due-date reminders
│   │       ├── calendar.py       # iCal feed
│   │       ├── ind_monitor.py    # IND slot monitor
│   │       └── health.py
│   └── requirements.txt
├── frontend/                 # Next.js — deployed on Vercel
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── auth/callback/
│   │   ├── tools/
│   │   │   └── 30-ruling/        # Public eligibility calculator
│   │   ├── components/
│   │   │   ├── RiskScoreWidget.tsx
│   │   │   ├── IndMonitorWidget.tsx
│   │   │   ├── EditProfileModal.tsx
│   │   │   ├── ValidationBadge.tsx
│   │   │   ├── AiConsentModal.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── api/
│   │       ├── keepalive/        # Vercel cron — every 5 min
│   │       ├── weekly-digest/    # cron-job.org — weekly
│   │       ├── send-reminders/   # cron-job.org — daily
│   │       └── ind-monitor/      # cron-job.org — every 4h
│   └── lib/
│       ├── api.ts
│       └── supabase.ts
└── supabase/migrations/
    ├── 001_phase1_engagement.sql
    ├── 002_document_validation_risk_score.sql
    ├── 003_ind_monitor.sql
    └── 004_profile_logistics_columns.sql
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
| `RESEND_API_KEY` | Vercel (cron proxy routes read this server-side) |
| `SUPABASE_URL` | Railway |
| `SUPABASE_ANON_KEY` | Railway |
| `SUPABASE_SERVICE_KEY` | Railway |
| `ANTHROPIC_API_KEY` | Railway |
| `RESEND_API_KEY` | Railway |
| `RESEND_FROM_EMAIL` | Railway |
| `FRONTEND_URL` | Railway |
| `ADMIN_SECRET` | Railway |

---

## Roadmap

| Phase | Status |
|---|---|
| Phase 1 — Premium AI (Document Validation + Risk Score) | ✅ Complete |
| Phase 2 — Engagement (reminders, notifications, iCal) | ✅ Complete |
| Phase 3 — Innovation (regen, IND monitor, 30% ruling, resources) | 🔄 In progress |
| Phase 4 — Monetisation (Stripe €3.99/mo) | 🔲 Pending |
| Phase 5 — B2B white-label HR portal | 🔲 Pending |
