# RelocationHub — Implementation Plan

> Last updated: 2026-05-03. Phase 1 + Phase 2 complete. Phase 3 complete. Phase 4 next.

---

## Current TODO (immediate next tasks)

| Priority | Task | Notes |
|---|---|---|
| 1 | Run migration 005 in Supabase SQL editor | Adds destination_city, has_children, number_of_children |
| 2 | Set up pytest for backend | Test Supabase project + mock Anthropic/Resend. Cover: profile CRUD, tier gating, rate limiting, SA hardcoded tasks |
| 3 | Build Phase 4 — Stripe | See Phase 4 below |
| 4 | Export initial schema → `000_initial_schema.sql` | ✅ Done — verify FK + RLS policies match production |

---

## Go-Live Checklist

Run through this before any significant launch or after rebuilding infrastructure from scratch.

### Supabase
- [ ] All migrations run in order: 000 → 001 → 002 → 003 → 004 → 005
- [ ] RLS enabled on all tables: `profiles`, `tasks`, `documents`, `document_validations`, `risk_scores`, `api_usage`, `ind_monitor_subscriptions`, `ind_monitor_cache`
- [ ] Storage bucket `documents` exists with RLS policies (authenticated users can only access their own files)
- [ ] `profiles.tier` default is `'free'`
- [ ] Google OAuth provider enabled in Supabase Auth settings
- [ ] Auth redirect URL set to `https://relocation-hub.vercel.app/auth/callback`

### Railway (backend)
- [ ] All env vars set: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `ADMIN_SECRET`
- [ ] `GET /api/health` returns 200
- [ ] CORS origin matches Vercel URL exactly (no trailing slash)
- [ ] Railway service is not sleeping (paid plan or keepalive cron active)

### Vercel (frontend)
- [ ] All env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_API_URL` points to Railway URL (no trailing slash)
- [ ] Build passes without type errors
- [ ] `vercel.json` — leave as `{}` on Hobby; add cron config on Pro upgrade (see CLAUDE.md)

### cron-job.org (all 4 jobs)
- [ ] Keepalive: `GET https://relocation-hub.vercel.app/api/keepalive` — every 5 min
- [ ] Send reminders: `GET https://relocation-hub.vercel.app/api/send-reminders` — daily
- [ ] Weekly digest: `GET https://relocation-hub.vercel.app/api/weekly-digest` — weekly (Monday 08:00)
- [ ] IND monitor: `GET https://relocation-hub.vercel.app/api/ind-monitor` — every 4 hours

### Resend
- [ ] Domain verified (or using Resend sandbox for testing)
- [ ] `RESEND_FROM_EMAIL` is a verified sender address

### End-to-end smoke test
- [ ] Sign up with Google OAuth → redirects to onboarding
- [ ] Complete onboarding (5 steps) → checklist generated on dashboard
- [ ] Mark a task complete → HR contact email sent (if configured)
- [ ] Upload a document → AI validation returns result
- [ ] Compute risk score → result displayed on dashboard
- [ ] IND monitor subscribe → confirmation shown
- [ ] iCal feed URL opens in calendar app
- [ ] `/tools/30-ruling` loads and runs through all 4 gates
- [ ] Edit profile → save → changes reflected
- [ ] Edit profile → regenerate → new checklist generated
- [ ] Delete account → all data removed

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
| Keepalive cron (cron-job.org, every 5 min) | ✅ Live |
| Weekly digest + reminders + IND monitor cron (cron-job.org) | ✅ Live |

---

## Phase 3 — Innovation ✅ COMPLETE

### Feature 1 ✅ — Checklist regeneration + profile editing
- `PATCH /api/auth/profile/{user_id}` — partial update, Pydantic `exclude_unset`
- `POST /api/checklist/regenerate` — deletes all tasks + re-generates from current profile
- `EditProfileModal.tsx` — all profile fields, two-step confirm for regenerate

### Feature 2 ✅ — IND Appointment Slot Monitor
- Hits OAP JSON API for 4 desks (AM, DH, ZW, DB)
- Notifies on state change only: unavailable → available
- Cron every 4h via cron-job.org
- `IndMonitorWidget.tsx` on dashboard

### Feature 3 ✅ — 30% Ruling eligibility calculator
- Public page at `/tools/30-ruling`. No auth, no backend.
- 4 hard gates: employer / distance / timing / salary

### Feature 4 ✅ — Resource links (housing + schools)
- `destination_city`, `has_children`, `number_of_children` added to profiles (migration 005)
- `ResourcesWidget.tsx` — Pararius deep-link (bedroom count from household size) + ExpatGuide schools link if has_children
- Fields added to onboarding (steps 2+3) and EditProfileModal

---

## Phase 4 — Monetisation 🔲

**Dependencies**: pytest suite passing, Stripe account live.

| Task | Notes |
|---|---|
| `POST /api/billing/webhook` | On `checkout.session.completed` → set `profiles.tier = 'paid'` + `tier_granted_at` |
| Stripe env vars on Railway | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Stripe Checkout session endpoint | `POST /api/billing/create-checkout` — creates Stripe session, returns URL |
| Frontend upgrade flow | Paywall modal "Upgrade" button → redirect to Stripe Checkout → return to dashboard |
| Webhook signature verification | Use `stripe.Webhook.construct_event()`, return 400 on bad signature |
| No guard logic changes needed | Frontend + backend already check `profiles.tier === 'paid'` / `'free'` |
| Price | €3.99/mo |

---

## Phase 5 — B2B white-label 🔲

- HR/Company Portal: companies pay per-employee; HR dashboard sees all relocatees' progress
- Bulk onboarding, task annotation, admin controls
- Requires: `companies` table, `company_id` FK on profiles, multi-tenant RLS policies
- Pricing: per-seat (est. €5/employee/mo)
- This is the higher-value opportunity: 50 companies × 20 employees = 1,000 users from 50 deals

---

## Performance Roadmap

### Stage 1 — 500–2,000 users (~€300–800/mo revenue)
**Infra upgrades (configuration only, no code changes):**
- [ ] Supabase Free → Pro ($25/mo): 200 DB connections + pgBouncer pooling. Do this before 500 users — connection exhaustion is silent and catastrophic.
- [ ] Resend Free → Pro ($20/mo): free tier is 3,000 emails/mo; weekly digests + reminders exceed this quickly.
- [ ] Vercel Hobby → Pro ($20/mo): needed for team access, higher function concurrency, and cron migration from cron-job.org.
- [ ] Railway: bump RAM/CPU when P95 response time > 500ms. It's a slider — no re-architecture needed.

### Stage 2 — 2,000–5,000 users (~€800–2,000/mo revenue)
**Code changes required:**

- [ ] **Async AI job queue**: checklist generation + risk score are synchronous (5–10s). Move to background workers: user gets `202 Accepted` immediately, Railway worker processes, dashboard polls a `jobs` status table. Use `arq` (async Redis queue) or a simple `tasks_queue` table. Prevents Railway timeout + massively improves perceived performance.
- [ ] **Redis cache for hot reads**: dashboard load hits Supabase 4–5 times. A 60s Redis cache for profile + checklist cuts DB load ~80%. Use Upstash Redis ($0–10/mo at this scale).
- [ ] **Switch checklist generation to `claude-haiku-4-5`**: same task quality, ~8× cheaper per token. Keep Sonnet for validation + risk score.
- [ ] **IND monitor email batching**: with 500+ subscribers, bulk email triggers Resend rate limits. Batch sends (100/batch, 500ms delay) in `ind_monitor.py`.

### Stage 3 — 5,000–10,000 users (~€2,000–4,000/mo revenue)
**Architecture changes:**

- [ ] **Supabase read replica**: all dashboard reads are SELECT queries. A read replica (Supabase Pro+) offloads ~80% of DB traffic and eliminates read/write contention.
- [ ] **CDN for document storage**: Supabase Storage works fine early; at high volume, move to Cloudflare R2 (zero egress fees vs. Supabase's metered egress).
- [ ] **B2B multi-tenancy prep**: add `companies` table + `company_id` on profiles. Use Supabase RLS policies per `company_id`. This is the architecture decision that unlocks Phase 5.

### What NOT to do prematurely
- Don't add Redis until Stage 2 (premature complexity)
- Don't split into microservices (Railway monolith scales fine past 10k users)
- Don't add Kubernetes or container orchestration (Railway handles this)
- Don't optimise Anthropic prompts until you can measure token usage per call

### Revenue vs. infra cost estimate
| Users | Paid (10% conv.) | Revenue/mo | Infra cost/mo |
|---|---|---|---|
| 500 | 50 | €200 | ~€50 |
| 2,000 | 200 | €800 | ~€75 |
| 5,000 | 500 | €2,000 | ~€200 |
| 10,000 | 1,000 | €4,000 | ~€400 |
| 50 B2B cos. | — | €5,000+ | ~€400 |
