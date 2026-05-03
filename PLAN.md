# RelocationHub — Implementation Plan

> Last updated: 2026-05-03. Phase 1 + Phase 2 complete. Phase 3 in progress.

---

## Phase 1 — Premium AI features ✅ COMPLETE

| Feature | Status |
|---|---|
| Document AI Validation | ✅ Live |
| Relocation Risk Score | ✅ Live |
| Paid tier system (admin grant, consent modal, GDPR) | ✅ Live |
| DB migration 002 | ✅ Run |

---

## Phase 2 — Engagement layer ✅ COMPLETE

| Feature | Status |
|---|---|
| Task completion → HR contact email (`notify_task_complete`) | ✅ Live |
| Weekly digest to HR contact (`POST /notifications/weekly-digest`) | ✅ Live |
| Task due-date reminders (`POST /reminders/send`) | ✅ Live |
| iCal feed (`GET /calendar/{user_id}/feed.ics`) | ✅ Live |
| Keepalive cron (Vercel, every 5 min) | ✅ Live |
| Weekly digest + reminders cron (cron-job.org) | ✅ Live |

---

## Phase 3 — Innovation ← IN PROGRESS

### Feature 1 ✅ — Checklist regeneration + profile editing

- `PATCH /api/auth/profile/{user_id}` — partial update, Pydantic `exclude_unset`
- `POST /api/checklist/regenerate` — deletes all tasks + re-generates from current profile
- `_build_and_insert_tasks()` extracted helper shared by generate + regenerate
- `EditProfileModal.tsx` — all profile fields, two-step confirm for regenerate (destructive)
- "Edit profile & plan" link in dashboard settings dropdown

### Feature 2 ✅ — IND Appointment Slot Monitor

- Hits OAP JSON API (`https://oap.ind.nl/oap/api/desks/{desk}/slots/?productKey=DOC&persons=1`) for 4 desks: AM, DH, ZW, DB
- Notifies on state change only: unavailable → available (no spam)
- `ind_monitor_subscriptions` + `ind_monitor_cache` tables (migration 003)
- Cron every 4h via cron-job.org → Vercel `/api/ind-monitor` → Railway `/api/ind-monitor/check`
- `IndMonitorWidget.tsx` on dashboard — live status + subscribe/unsubscribe toggle

### Feature 3 🔲 — 30% Ruling eligibility calculator

Public page at `/tools/30-ruling` — SEO + CTA to sign up.

**Implementation:**
- Public Next.js page (no auth)
- Form: salary, role, nationality, degree level, prior Netherlands stay
- Logic: Dutch tax authority rules (40% ruling from 2024 transition)
- Result: eligible / not eligible / borderline + explanation
- CTA: "Track your 30% ruling application in RelocationHub"
- No backend needed — pure frontend calculation

### Feature 4 🔲 — Resource links (housing + schools)

Lightweight "Resources" card on the dashboard. No backend. Contextual based on profile.

**Requires new profile fields (migration 005):**
- `destination_city` text (Amsterdam, Rotterdam, Utrecht, Den Haag, Eindhoven, Other)
- `has_children` boolean (default false)
- `number_of_children` integer (nullable)

**What it shows:**
- 🏠 Pararius deep-link: `https://pararius.com/apartments/{city}/{N}-bedrooms` — N calculated from household size
- 🎓 ExpatGuide schools link (only if `has_children`): `https://expatguide.nl/education/bilingual-schools-netherlands/` filtered by city
- Add `destination_city` + children fields to onboarding step 2 and EditProfileModal

**Cut features (deliberately removed from roadmap):**
- ~~Shareable relocation progress card~~ — low real-world usage, not core value
- ~~Anonymous peer benchmarking~~ — mildly interesting, doesn't help users act
- ~~AI Chat Assistant~~ — expensive, clunky, not differentiated

---

## Phase 4 — Monetisation 🔲

When Stripe is ready:
- Add `POST /api/billing/webhook` — on `checkout.session.completed` → set `profiles.tier = 'paid'`
- No changes needed to validation/risk score guard logic (402 handling already in place)
- No changes needed to frontend paywall UI (already checks `profile.tier === 'paid'`)
- Add Stripe keys to Railway: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Price: €3.99/mo

---

## Phase 5 — B2B white-label 🔲

- HR/Company Portal: companies pay per-employee; HR dashboard sees all relocatees' progress
- Bulk onboarding, task annotation, admin controls
- Separate pricing tier (per-seat)
