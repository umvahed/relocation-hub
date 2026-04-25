# RelocationHub — Implementation Plan
## Phase 2: Engagement Layer

> Updated: 2026-04-26. Phase 1 (Document AI Validation + Risk Score) is complete and live.

---

## Phase 1 — COMPLETE ✅

| Feature | Status |
|---|---|
| Document AI Validation | ✅ Live |
| Relocation Risk Score | ✅ Live |
| Paid tier system (admin grant, consent modal, GDPR) | ✅ Live |
| DB migration 002 | ✅ Run |

---

## What we're building next

### Step 1 — Audit existing routes (do this first)

Three route files exist but their real-world wiring is unknown:

| File | Audit question |
|---|---|
| `backend/app/routes/notifications.py` | What endpoints exist? What does it actually send? Is Resend configured? |
| `backend/app/routes/reminders.py` | Is the due-date PATCH wired? Are reminder emails sending? |
| `backend/app/routes/calendar.py` | iCal feed confirmed working — what else is in here? |

Read all three files before building anything new.

---

### Step 2 — Email reminders

Per-task due dates are already stored in `tasks.due_date`. What's needed:

- **Backend:** scheduled job or endpoint that finds tasks with `due_date` approaching and sends reminder emails via Resend
- **User control:** configurable cadence (day before, 3 days before, etc.) — stored on profile or per-task
- **Trigger:** either a Vercel cron hitting a backend endpoint, or a Railway background task
- `tasks.reminder_sent_at` column already exists — use to prevent duplicate sends

**Resend env var:** `RESEND_API_KEY` — already in `config.py`, needs to be added to Railway if not there.

---

### Step 3 — HR/consultant contact notifications

Described as the key differentiator. User adds a contact (name + email) during onboarding.

**What the contact should receive:**
1. **Task completion alert** — when user ticks off a task, contact gets an email ("Ahmed completed: Register at gemeente")
2. **Weekly digest** — summary of progress that week (tasks completed, tasks due soon)

**What already exists:**
- `profiles.contact_name` + `profiles.contact_email` — stored at onboarding
- `notifications.py` — may already have some of this (needs audit from Step 1)
- Task completion already fires in `PATCH /api/checklist/task/{task_id}` — hook exists

**Resend from address:** `RESEND_FROM_EMAIL` already in config (default: `Relocation Hub <onboarding@resend.dev>`)

---

### Step 4 — Checklist regeneration

Currently checklist is one-shot. `POST /api/checklist/generate` returns early if tasks exist.

**Needed:** `POST /api/checklist/regenerate`
- Deletes all existing tasks for user
- Deletes all documents? (decide: probably not — keep documents, only regenerate tasks)
- Re-runs the same generation logic with updated profile answers
- Frontend: button in settings menu ("Regenerate checklist") with a confirmation dialog

---

## After Phase 2 — Stripe (Phase 3)

When Stripe is ready:
- Add `POST /api/billing/webhook` — on `checkout.session.completed` → set `profiles.tier = 'paid'`
- No changes needed to validation/risk score guard logic (402 handling already in place)
- No changes needed to frontend paywall UI (already checks `profile.tier === 'paid'`)
- Add Stripe keys to Railway: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## Verification checklist for Phase 2

- [ ] `notifications.py` audited — endpoints + Resend integration documented
- [ ] `reminders.py` audited — what's working vs. missing
- [ ] Resend API key confirmed in Railway env vars
- [ ] Task completion triggers contact email
- [ ] Weekly digest sends to contact email
- [ ] Reminder email sends N days before due date
- [ ] `reminder_sent_at` stamped to prevent duplicates
- [ ] Regenerate endpoint deletes + recreates tasks
- [ ] Regenerate button in settings with confirmation
