# RelocationHub — Implementation Plan

> Last updated: 2026-05-05. Phases 1–3 complete. Phase 4 (Stripe) is next.

---

## Current TODO (immediate next tasks)

| Priority | Task | Notes |
|---|---|---|
| 1 | Run migration 007 in Supabase SQL editor | Adds `notify_by_email BOOLEAN NOT NULL DEFAULT TRUE` to profiles |
| 2 | Set up pytest for backend | Before Stripe — cover tier gating, rate limiting, profile CRUD, SA tasks, IND monitor |
| 3 | Build Phase 4 — Stripe | See Phase 4 below |

---

## Go-Live Checklist

Run through this before any significant launch or after rebuilding infrastructure from scratch.

### Supabase
- [ ] All migrations run in order: 000 → 001 → 002 → 003 → 004 → 005 → 006 → 007
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
- [ ] Complete onboarding (5 steps, including container ship date if applicable) → checklist generated
- [ ] Mark a task complete → HR contact email sent (if configured)
- [ ] Upload a document → AI validation returns result
- [ ] Compute risk score → result displayed on dashboard
- [ ] IND monitor subscribe → confirmation shown
- [ ] iCal feed URL opens in calendar app
- [ ] `/tools/30-ruling` loads and runs through all 4 gates
- [ ] Edit profile → save → changes reflected
- [ ] Edit profile → regenerate → new checklist generated
- [ ] Container ship date set → arrival banner appears on dashboard
- [ ] Task search → filters correctly, clear button works
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
| Task completion → HR contact email | ✅ Live |
| Weekly digest to HR contact | ✅ Live |
| Task due-date reminders | ✅ Live |
| iCal feed | ✅ Live |
| Keepalive + all crons via cron-job.org | ✅ Live |

---

## Phase 3 — Innovation ✅ COMPLETE

### Feature 1 ✅ — Checklist regeneration + profile editing
- `PATCH /api/auth/profile/{user_id}` with Pydantic `exclude_unset`
- `POST /api/checklist/regenerate`
- `EditProfileModal.tsx` with two-step confirm for regenerate

### Feature 2 ✅ — IND Appointment Slot Monitor
- OAP JSON API for 4 desks (AM, DH, ZW, DB)
- Notifies on state change only: unavailable → available
- Cron every 4h via cron-job.org
- `IndMonitorWidget.tsx` on dashboard
- Community self-report endpoint (`POST /api/ind-monitor/report-slot`) kept in backend but UI button removed — users unlikely to alert competitors

### Feature 3 ✅ — 30% Ruling eligibility calculator
- Public page `/tools/30-ruling` — no auth, no backend
- 4 hard gates: Dutch employer / distance / timing / salary
- Linked from nav (desktop), hero (mobile CTA), tools banner, footer, dashboard

### Feature 4 ✅ — Resource links
- `destination_city`, `has_children`, `number_of_children` (migration 005)
- `ResourcesWidget.tsx` — Pararius deep-link, ExpatGuide schools, Marktplaats + IKEA when container
- Fields in onboarding step 2+3 and EditProfileModal

### Feature 5 ✅ — Container shipping improvements + task search
- Three shipping options: luggage only / full container / both (luggage now + container later)
- `container_ship_date` profile field (migration 006)
- Onboarding + EditProfileModal: ship date picker with lead-time warning when container selected
- Backend: `both` shipping type generates combined luggage + container task set; ship date in prompt context
- `ContainerArrivalBanner` on dashboard: origin-country-specific arrival estimate (min/max weeks), switches to "should have arrived" message once window passes
- Task search bar: filters by title, description, category; live match count; clear button

### Feature 6 ✅ — Document pack
- Cover PDF (fpdf2): applicant info, relocation overview, household, shipping, HR contact, document table with validation status
- ZIP download: `GET /api/docpack/{user_id}` streams cover PDF + all uploaded documents
- Send to HR: `POST /api/docpack/{user_id}/send-to-hr` uploads ZIP to Supabase, emails HR 7-day signed URL
- Document pack card on `/documents` page

### Feature 7 ✅ — Document validation UX + task gate
- Critical tasks block completion if any attached document has `fail` OR `warn` validation status
- Background auto-validation fires after upload to a critical task (paid + consent users)
- Validation badges (`✓ pass` / `⚠ warn` / `✗ fail`) inline on task document rows
- "Details" link on each validated doc row → navigates to `/documents`
- Backend email on critical-doc validation: notifies user + HR contact with result and issues
- Passport prompt tightened: expiry within 6 months → hard `fail`/`error`, not `warn`
- Quirky loading sayings during onboarding AI checklist generation (12 Dutch-themed messages, 2.4s cycle)

### Feature 8 ✅ — Email notification preference
- `notify_by_email BOOLEAN NOT NULL DEFAULT TRUE` on profiles (migration 007)
- Toggle in dashboard settings dropdown — persisted via `PATCH /api/auth/profile/{user_id}`
- Backend respects preference in: document validation emails, IND slot alerts, IND reminders

---

## Phase 4 — Monetisation 🔲 ← NEXT

**Dependencies**: migrations 005–007 run, pytest suite passing (recommended).

| Task | Notes |
|---|---|
| `POST /api/billing/create-checkout` | Creates Stripe Checkout session, returns URL. Accepts `user_id` + `price_id`. |
| `POST /api/billing/webhook` | Verifies Stripe signature. On `checkout.session.completed` → set `profiles.tier = 'paid'` + `tier_granted_at` |
| Stripe env vars on Railway | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Upgrade CTA in paywall modal | "Upgrade" button → POST `/api/billing/create-checkout` → redirect to Stripe Checkout |
| Success redirect | Stripe returns to `/dashboard?upgraded=1` → show success toast |
| No guard logic changes | Frontend + backend already check `profiles.tier === 'paid'` / `'free'` |
| Price | €3.99/mo |

---

## Phase 5 — B2B HR Portal 🔲

**Goal:** Companies pay per-seat; HR admins manage multiple relocatees from one dashboard.

### Data model additions
- `companies` table: `id, name, domain, tier, created_at`
- `company_users` junction: `company_id, user_id, role` (`hr_admin` | `employee`)

### HR portal features
| Feature | Notes |
|---|---|
| Separate `/hr` login | Google OAuth only; role-checked on sign-in |
| Employee list | Progress bar, critical task status, doc count per employee |
| Document visibility | HR reads docs via existing signed-URL mechanism; no new storage policies needed |
| Task controls | HR can enable/disable per-employee tasks; create company-specific custom tasks |
| Bulk onboarding | CSV upload → triggers onboarding + checklist generation per row |
| Reminders | HR sets/overrides due dates; sends one-off email reminders to individuals |
| Weekly digest | Already covers HR contacts — no new email infrastructure needed |

### Architecture notes
- RLS policies: `hr_admin` read on `tasks`, `documents`, `document_validations` scoped to `company_users`
- All HR writes go through backend (audit trail)
- **Design RLS before Stripe (Phase 4)** to avoid retrofitting after paying users exist
- Pricing: per-employee seat fee via Stripe (separate product from €3.99/mo individual)
- Higher value than consumer: 50 companies × 20 employees = 1,000 users from 50 deals

---

## Performance Roadmap

### Stage 1 — 500–2,000 users (~€300–800/mo revenue)
- [ ] Supabase Free → Pro ($25/mo): connection pooling. Do before 500 users — exhaustion is silent.
- [ ] Resend Free → Pro ($20/mo): 3,000 email/mo free limit exceeded quickly with digests + reminders.
- [ ] Vercel Hobby → Pro ($20/mo): higher function concurrency, move keepalive to vercel.json cron.
- [ ] Railway: bump RAM/CPU when P95 response time > 500ms (slider, no code change).

### Stage 2 — 2,000–5,000 users (~€800–2,000/mo revenue)
- [ ] **Async AI job queue**: AI calls are synchronous (5–10s). Move to background workers with `arq` + Redis. User gets `202 Accepted`, polls for result.
- [ ] **Redis cache for hot reads**: 60s Upstash Redis cache for profile + checklist cuts DB load ~80%.
- [ ] **Switch checklist to `claude-haiku-4-5`**: ~8× cheaper per token, same task quality.
- [ ] **IND monitor email batching**: bulk send triggers Resend rate limits at 500+ subscribers.

### Stage 3 — 5,000–10,000 users (~€2,000–4,000/mo revenue)
- [ ] **Supabase read replica**: offloads ~80% of dashboard reads.
- [ ] **Cloudflare R2 for documents**: zero egress fees vs. Supabase metered egress.
- [ ] **B2B multi-tenancy prep**: `companies` table + `company_id` on profiles + per-company RLS.

### Revenue vs. infra cost
| Users | Paid (10%) | Revenue/mo | Infra/mo |
|---|---|---|---|
| 500 | 50 | €200 | ~€50 |
| 2,000 | 200 | €800 | ~€75 |
| 5,000 | 500 | €2,000 | ~€200 |
| 10,000 | 1,000 | €4,000 | ~€400 |
| 50 B2B cos. | — | €5,000+ | ~€400 |
