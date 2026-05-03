# RelocationHub

SaaS web app helping expats relocating to the Netherlands organise their entire move — visa, admin, housing, banking, healthcare and more — in one intelligent hub.

**Live:** [relocation-hub.vercel.app](https://relocation-hub.vercel.app)

---

## Stack

| Layer | Tech | Host |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS v4 | Vercel |
| Backend | FastAPI + Python 3.12 | Railway |
| Database / Auth / Storage | Supabase (Postgres + GoTrue + S3-compatible) | Supabase |
| AI | Anthropic Claude (`claude-sonnet-4-5` / `claude-sonnet-4-6`) | via Railway |
| Email | Resend | via Railway |

---

## Features

- **Google OAuth + email/password auth** — sign up, sign in, password reset
- **5-step onboarding** — origin country, move date, employment type, shipping, pets, HR contact
- **AI checklist generation** — hardcoded critical SA/VFS tasks + Claude-generated tasks per profile
- **Dashboard** — category sections, dependency lock, countdown banner, progress bar, dark mode
- **Document upload** — per-task, Supabase Storage, RLS enforced
- **Document AI Validation** — Claude validates against IND 2025 rules (paid tier, GDPR consent)
- **Relocation Risk Score** — 0–100 score across 4 dimensions with top risk items (paid tier)
- **iCal feed** — subscribe to task deadlines in Google Calendar / Apple Calendar
- **Task reminders** — email alerts N days before due date via Resend
- **HR contact notifications** — task completion alerts + weekly digest to relocation contact
- **Profile editing + checklist regeneration** — update profile answers and regenerate the full plan
- **IND Appointment Slot Monitor** — polls OAP API every 4h, emails subscribers when slots open
- **Paid tier system** — `profiles.tier` (`free` | `paid`), manually granted pre-Stripe

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
│   │   ├── page.tsx              # Landing
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── auth/callback/
│   │   ├── components/
│   │   │   ├── RiskScoreWidget.tsx
│   │   │   ├── IndMonitorWidget.tsx
│   │   │   ├── EditProfileModal.tsx
│   │   │   ├── ValidationBadge.tsx
│   │   │   └── AiConsentModal.tsx
│   │   └── api/
│   │       ├── keepalive/        # cron: every 5 min (Vercel)
│   │       ├── weekly-digest/    # cron: weekly (cron-job.org)
│   │       ├── send-reminders/   # cron: daily (cron-job.org)
│   │       └── ind-monitor/      # cron: every 4h (cron-job.org)
│   └── lib/
│       ├── api.ts
│       └── supabase.ts
└── supabase/migrations/
    ├── 001_phase1_engagement.sql
    ├── 002_document_validation_risk_score.sql
    └── 003_ind_monitor.sql
```

---

## Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase + Anthropic keys
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase + API URL
npm run dev
```

---

## Roadmap

| Phase | Status |
|---|---|
| Phase 1 — Premium AI (Document Validation + Risk Score) | ✅ Complete |
| Phase 2 — Engagement (reminders, notifications, iCal) | ✅ Complete |
| Phase 3 — Innovation (regen, IND monitor, 30% ruling, resources) | 🔄 In progress |
| Phase 4 — Monetisation (Stripe €3.99/mo) | 🔲 Pending |
| Phase 5 — B2B white-label HR portal | 🔲 Pending |
