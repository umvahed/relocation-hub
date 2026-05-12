# RelocationHub — Implementation Plan

> Last updated: 2026-05-13. Phases 1–4 complete (Stripe live). Phase 5 (B2B HR Portal) is next.

---

## Current TODO (immediate next tasks)

| Priority | Task | Notes |
|---|---|---|
| 1 | Add homepage link in dashboard nav | No way back to landing page from dashboard |
| 2 | Set up pytest for backend | Cover tier gating, rate limiting, profile CRUD, SA tasks, IND monitor, partner tasks, allowance, billing |
| 3 | Build Phase 5 — B2B HR Portal | See Phase 5 below |

---

## Go-Live Checklist

Run through this before any significant launch or after rebuilding infrastructure from scratch.

### Supabase
- [ ] All migrations run in order: 000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015
- [ ] RLS enabled on all tables: `profiles`, `tasks`, `documents`, `document_validations`, `risk_scores`, `api_usage`, `ind_monitor_subscriptions`, `ind_appointments`, `relocation_expenses`
- [ ] Storage bucket `documents` exists with RLS policies (authenticated users can only access their own files)
- [ ] `profiles.tier` default is `'free'`
- [ ] Google OAuth provider enabled in Supabase Auth settings
- [ ] Auth redirect URL set to `https://relocation-hub.vercel.app/auth/callback`

### Railway (backend)
- [ ] All env vars set: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `ADMIN_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- [ ] `GET /api/health` returns 200
- [ ] CORS origin matches Vercel URL exactly (no trailing slash)
- [ ] Railway service is not sleeping (paid plan or keepalive cron active)
- [ ] Stripe webhook endpoint registered in Stripe dashboard: `POST https://relocation-hub-production.up.railway.app/api/billing/webhook`

### Vercel (frontend)
- [ ] All env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `RESEND_API_KEY`
- [ ] `NEXT_PUBLIC_API_URL` points to Railway URL (no trailing slash)
- [ ] Build passes without type errors
- [ ] `vercel.json` — leave as `{}` on Hobby; add cron config on Pro upgrade (see CLAUDE.md)

### Stripe
- [ ] Product created with price €19.99 (one-time, EUR)
- [ ] `STRIPE_PRICE_ID` matches the price ID in Railway env vars
- [ ] Webhook endpoint registered and `STRIPE_WEBHOOK_SECRET` set in Railway
- [ ] Test checkout flow end-to-end with Stripe test card `4242 4242 4242 4242`

### cron-job.org (all 4 jobs)
- [ ] Keepalive: `GET https://relocation-hub.vercel.app/api/keepalive` — every 5 min
- [ ] Send reminders: `GET https://relocation-hub.vercel.app/api/send-reminders` — daily
- [ ] Weekly digest: `GET https://relocation-hub.vercel.app/api/weekly-digest` — weekly (Monday 08:00)
- [ ] IND appointment reminders: `GET https://relocation-hub.vercel.app/api/ind-appointment-reminders` — daily

### GitHub Actions
- [ ] `RAILWAY_URL` secret set (used by `ind_monitor.yml`)
- [ ] `RESEND_API_KEY` secret set
- [ ] `ind_monitor.yml` runs every Monday 07:00 CET

### Resend
- [ ] Domain verified (or using Resend sandbox for testing)
- [ ] `RESEND_FROM_EMAIL` is a verified sender address

### End-to-end smoke test
- [ ] Sign up with Google OAuth → redirects to onboarding
- [ ] Complete 6-step onboarding (basics, employment, logistics+school-stage, permit+situation, move-date, HR-contact) → checklist generated
- [ ] EU citizen path: `employer_arranges_permit = 'eu_citizen'` skips IND/visa hardcoded tasks
- [ ] Partner set → `[Partner]` prefixed tasks appear with violet Partner badge on dashboard
- [ ] Add a custom task via "+ Add a task" → appears with `×` delete button; only custom tasks are deletable
- [ ] Mark a task complete without document → confirmation dialog appears; critical task says IND warning
- [ ] Mark a task complete → HR contact email sent (if configured); partner email also notified for `[Partner]` tasks
- [ ] Upload a document → date extraction runs automatically; extracted date appears in timeline milestones
- [ ] AI validation returns result (paid user / trial)
- [ ] Compute risk score → result displayed on dashboard
- [ ] IND monitor subscribe → confirmation shown; "I checked — no slots" flips flag
- [ ] iCal feed URL opens in calendar app
- [ ] Edit profile → save → changes reflected
- [ ] Edit profile → regenerate → new checklist generated; diff banner shown
- [ ] Container ship date set → arrival banner appears on dashboard
- [ ] Task search → filters correctly, clear button works
- [ ] Download document pack → merged PDF with cover page + all non-failed docs
- [ ] Allowance tracker → set amount → log expense → balance updates → PDF export downloads
- [ ] Shareable link → `/share/[token]` public page renders correctly (no auth)
- [ ] Stripe upgrade → `POST /api/billing/create-checkout` → Stripe Checkout → `/upgrade/success` → tier flipped to paid
- [ ] `/privacy`, `/terms`, `/refunds` pages load
- [ ] `/tools/30-ruling` loads and runs through all 4 gates
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
- Personal per-user flag system — optimistic default; user manually flips false after checking OAP
- Monday GitHub Actions cron (`ind_monitor.yml`) resets all flags + emails subscribers
- Exception period Nov 24–Jan 7 skips reset (IND holiday closure)
- `IndMonitorWidget.tsx` on dashboard; 6 states including appointment booking
- 7d/1d pre-appointment reminder emails

### Feature 3 ✅ — 30% Ruling eligibility calculator
- Public page `/tools/30-ruling` — no auth, no backend
- 4 hard gates: Dutch employer / distance / timing / salary
- Linked from nav, hero, tools banner, footer, dashboard

### Feature 4 ✅ — Resource links
- `destination_city`, `has_children`, `number_of_children` (migration 005)
- `ResourcesWidget.tsx` — Pararius deep-link, ExpatGuide schools, Marktplaats + IKEA when container

### Feature 5 ✅ — Container shipping improvements + task search
- Three shipping options: luggage only / full container / both
- `container_ship_date` profile field (migration 006)
- `ContainerArrivalBanner` on dashboard with origin-specific arrival estimates
- Task search bar: live filter by title/description/category

### Feature 6 ✅ — Document pack
- Cover PDF (fpdf2): applicant info, relocation overview, household, shipping, HR contact, document table
- Merged PDF download: `GET /api/docpack/{user_id}` streams cover page + all non-failed documents
- Send to HR: `POST /api/docpack/{user_id}/send-to-hr` uploads merged PDF, emails HR 7-day signed URL

### Feature 7 ✅ — Custom tasks + partner support
- Inline "+ Add a task" per category; `×` delete for source='custom' tasks only
- Partner fields on profile; `[Partner]` prefixed tasks; violet Partner badge on dashboard
- Partner email receives reminders + task completion notifications for partner tasks

### Feature 8 ✅ — Relocation allowance tracker
- Set total budget, log expenses per task, running balance
- HR email on each expense; PDF statement export
- `GET /api/allowance/{user_id}/export`

### Feature 9 ✅ — Shareable progress link
- `/share/[token]` public read-only one-pager for HR
- Overall %, per-category bars, risk score, doc count; print-friendly

### Feature 10 ✅ — Expanded onboarding (6 steps)
- Step 4 expanded: `employer_arranges_permit` (employer/self/eu_citizen/unsure), `employer_is_sponsor`, `already_in_netherlands`
- Step 3 expanded: `children_school_stage`, `has_driving_licence`, `driving_licence_country`
- Step 5 expanded: `expects_30_ruling`
- Migration 014 — 7 new profile columns
- EU citizen path: skips IND/visa hardcoded tasks; only passport validity check remains

### Feature 11 ✅ — Checklist improvements
- School-stage-specific tasks (preschool/primary/secondary/both)
- RDW driving-licence direct-exchange country check
- 30%-ruling 4-month deadline task when `expects_30_ruling = true`
- `employer_is_sponsor = false` → urgent blocker task in checklist
- Regenerate returns `{ tasks, diff: { added, removed } }` — diff banner on dashboard

### Feature 12 ✅ — Profile enrichment from documents
- `POST /api/documents/{id}/enrich-profile` — paid, no rate limit
- Extracts `salary_monthly_eur`, `job_title`, `permit_track`, `employer_name` from employment contracts via Claude
- Dismissible offer banner on dashboard

### Feature 13 ✅ — Dashboard Priority Actions widget
- Top-of-sidebar card showing up to 3 items: overdue tasks, due-within-7-days tasks, next critical task
- Colored left border per urgency; scroll-to-task arrow button

### Feature 14 ✅ — Document date extraction + Relocation Timeline
- `POST /api/documents/{id}/extract-date` — claude-haiku, no rate limit, all tiers
- Extracts single most important date (passport expiry, flight, employment start, tenancy begin)
- Persisted to `documents.extracted_date` + `documents.extracted_date_label` (migration 015)
- Auto-runs on every validatable upload
- `CountdownBanner` retained (days-until-move); extracted dates feed future timeline milestones
- Task completion confirmation dialog: critical tasks show IND warning; others prompt to attach a document

---

## Phase 4 — Monetisation ✅ COMPLETE

| Feature | Status |
|---|---|
| `POST /api/billing/create-checkout` | ✅ Live |
| `POST /api/billing/webhook` | ✅ Live |
| Stripe env vars on Railway | ✅ Set |
| Upgrade CTA in dashboard sidebar | ✅ Live |
| `/upgrade/success` redirect page | ✅ Live |
| Legal pages: `/privacy`, `/terms`, `/refunds` | ✅ Live |
| Landing page revamp | ✅ Live |

**Notes:**
- One-time €19.99 (Stripe Checkout, card only)
- Webhook: `checkout.session.completed` → `profiles.tier = 'paid'`
- Upgrade button handles three states: trial active (days remaining), trial expired, no trial
- Operator: Bitquanta, Pieter Calandlaan 765, 1069SC Amsterdam (KVK 97672920)
- Support: support@relocationhub.app

---

## Phase 5 — B2B HR Portal 🔲 ← NEXT

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
| Team completion dashboard | "14/20 employees on track · 3 at risk · 2 not started" |

### Architecture notes
- RLS policies: `hr_admin` read on `tasks`, `documents`, `document_validations` scoped to `company_users`
- All HR writes go through backend (audit trail)
- Design RLS before hooking into Stripe to avoid retrofitting after paying customers exist
- Pricing: per-employee seat fee via Stripe (separate product from individual one-time €19.99)
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
| Users | Paid (10%) | Revenue (one-time) | Infra/mo |
|---|---|---|---|
| 500 | 50 | €1,000 | ~€50 |
| 2,000 | 200 | €4,000 | ~€75 |
| 5,000 | 500 | €10,000 | ~€200 |
| 10,000 | 1,000 | €20,000 | ~€400 |
| 50 B2B cos. | — | €5,000+/mo | ~€400 |
