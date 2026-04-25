# RelocationHub — Implementation Plan
## Document AI Validation + Relocation Risk Score

> Generated: 2026-04-25. Use this file as context when working in Claude terminal (`claude` CLI).

---

## What we're building

Two paid-tier features that build directly on the existing Claude API integration:

1. **Document AI Validation** — users upload immigration documents (passport, employment contract, degree certificate, police clearance, birth certificate); Claude validates them against IND 2025 requirements and flags specific issues with actionable fixes.
2. **Relocation Risk Score** — a 0–100 score across 4 weighted dimensions with a top-5 risk items list. Python calculates the numbers; Claude writes the human-readable risk items.

Both are gated behind a `paid` tier (manually granted pre-Stripe via an admin endpoint).

---

## Ideas evaluated (for future reference)

| Idea | Decision |
|---|---|
| Document AI Validation | **Build now** |
| Relocation Risk Score | **Build now** |
| IND Processing Time Intelligence | Future milestone |
| HR/Company Portal (B2B flip — companies pay per employee) | Future B2B phase |
| WhatsApp nudge bot | Future engagement feature |

---

## GDPR Compliance (non-negotiable)

Lawful basis: **Article 6(1)(b)** — contract performance.

Rules:
- Document bytes fetched from Supabase Storage into Railway RAM → sent to Claude → **immediately discarded**. Never written to disk, never logged.
- Only validation results (JSON) stored in DB — no raw content.
- Anthropic API does not train on API data — reference their DPA in privacy policy.
- **Explicit consent required** before first AI call. Stored as `profiles.ai_validation_consent` (bool) + `ai_validation_consent_at` (timestamp).
- Consent withdrawable from settings menu.
- `document_validations` has `ON DELETE CASCADE` on `documents.id` — deleting a doc auto-deletes its validation result.
- `delete_account` must explicitly delete `risk_scores` row.
- Exception handlers log only `document_id`, never file content.
- Word/DOCX → return 422: "upload a PDF or image scan".

---

## DB Migration

**New file:** `supabase/migrations/002_document_validation_risk_score.sql`

```sql
BEGIN;

-- 1. document_validations
CREATE TABLE IF NOT EXISTS document_validations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL,
    status          text NOT NULL CHECK (status IN ('pass', 'warn', 'fail')),
    summary         text NOT NULL,
    issues          jsonb NOT NULL DEFAULT '[]',
    model_version   text NOT NULL,
    validated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_validations_document_id ON document_validations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_validations_user_id ON document_validations(user_id);

-- 2. risk_scores (UNIQUE on user_id → upsert pattern)
CREATE TABLE IF NOT EXISTS risk_scores (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL UNIQUE,
    score            integer NOT NULL CHECK (score BETWEEN 0 AND 100),
    risk_level       text NOT NULL CHECK (risk_level IN ('low', 'med', 'high')),
    risk_items       jsonb NOT NULL DEFAULT '[]',
    dimension_scores jsonb NOT NULL DEFAULT '{}',
    computed_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_scores_user_id ON risk_scores(user_id);

-- 3. profiles: GDPR consent + paywall tier
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS ai_validation_consent     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_validation_consent_at  timestamptz,
    ADD COLUMN IF NOT EXISTS tier                      text NOT NULL DEFAULT 'free'
                                                          CHECK (tier IN ('free', 'paid')),
    ADD COLUMN IF NOT EXISTS tier_granted_at           timestamptz;

-- 4. api_usage: separate rate limits per call type
ALTER TABLE api_usage
    ADD COLUMN IF NOT EXISTS call_type text NOT NULL DEFAULT 'checklist';

-- 5. RLS
ALTER TABLE document_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own validations"
    ON document_validations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to validations"
    ON document_validations FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own risk score"
    ON risk_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to risk scores"
    ON risk_scores FOR ALL USING (auth.role() = 'service_role');

COMMIT;
```

---

## New API Endpoints

### Document Validation

```
POST /api/documents/{document_id}/validate
Body: { "user_id": str }

GET  /api/documents/{document_id}/validation
Query: user_id
```

**Guard order:** ownership check → `tier == 'paid'` (402) → `ai_validation_consent == true` (400) → mime_type in supported list (422) → file_size ≤ 20MB (422) → rate limit check (call_type="validation", limit=10/day, 429)

**Supported mime types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`

**Success response (201):**
```json
{
  "validation_id": "uuid",
  "document_id": "uuid",
  "status": "pass|warn|fail",
  "summary": "one sentence, no PII",
  "issues": [
    { "severity": "error|warning|info", "field": "...", "message": "...", "action": "..." }
  ],
  "validated_at": "ISO 8601"
}
```

**Error responses:**
- `402` → `{"detail": "paid_tier_required", "upgrade_url": "..."}`
- `400` → `{"detail": "consent_required"}`
- `422` → `{"detail": "Word documents cannot be validated — please upload a PDF or image scan"}`

---

### Risk Score

```
POST /api/risk-score/compute
Body: { "user_id": str }

GET  /api/risk-score/{user_id}
```

**Guard order:** `tier == 'paid'` (402) → `ai_validation_consent == true` (400) → rate limit (call_type="risk_score", limit=3/day)

**Dimension score formulas (computed in Python — not Claude):**

| Dimension | Formula | Weight |
|---|---|---|
| `critical_completion` | `(completed_critical / total_critical) * 100` | 40% |
| `timeline_feasibility` | Start 100; subtract for overdue + urgent tasks vs. days_until_move | 30% |
| `document_readiness` | Upload rate (30%) + validation pass rate (70%) blended | 20% |
| `profile_completeness` | 50pts move_date set + 50pts contact added | 10% |

Risk level: score ≥70 = `low`, 40–69 = `med`, <40 = `high`

**Success response (200):**
```json
{
  "score": 72,
  "risk_level": "med",
  "risk_items": [
    { "rank": 1, "category": "timeline", "title": "...", "detail": "...", "action": "..." }
  ],
  "dimension_scores": {
    "critical_completion": 85,
    "timeline_feasibility": 60,
    "document_readiness": 75,
    "profile_completeness": 100
  },
  "computed_at": "ISO 8601"
}
```

---

### Consent + Admin

```
PATCH /api/auth/profile/{user_id}/consent
Body: { "ai_validation_consent": bool }

POST  /api/admin/grant-paid-tier
Header: X-Admin-Secret: {ADMIN_SECRET env var}
Body: { "user_id": str }
```

Admin endpoint manually grants paid tier until Stripe is wired. When Stripe is built, a webhook handler sets `tier` on `checkout.session.completed` — the endpoint guards and frontend 402 handling need no changes.

---

### Updated Usage Endpoint

`GET /api/usage/{user_id}` — update to return per-type breakdown:
```json
{
  "checklist_calls": 1,   "checklist_limit": 5,
  "validation_calls": 3,  "validation_limit": 10,
  "risk_score_calls": 1,  "risk_score_limit": 3,
  "date": "2026-04-25"
}
```

---

## Claude Prompt Design

### Validation prompt

**System message:** Return only JSON. Never log, quote, or reproduce personal data fields (names, passport numbers, dates of birth). Describe issues in general terms only.

**User message** includes:
- Document type (inferred from task title + category)
- Employment type + age bracket (`under_30` / `30_plus` — affects IND salary thresholds)
- Rules block injected per document type (see below)
- Instruction to return exactly the JSON schema

**Document type inference map:**
- `category=visa` + title contains "passport" → `passport`
- `category=critical` + title contains "birth certificate" → `birth_certificate`
- `category=critical` + title contains "police clearance" → `police_clearance`
- `category=critical` + title contains "qualifications" → `degree_certificate`
- `category=employment` + title contains "contract" → `employment_contract`
- fallback → `general_document`

**Rules per document type:**
- **passport**: expiry ≥6 months past permit end date, 2+ blank visa pages, photo page visible
- **employment_contract**: gross salary vs IND 2025 HSM thresholds (€4,171/mo under-30, €5,688/mo 30+), signed, not purely probationary
- **degree_certificate**: apostille stamp visible, institution identifiable, certified translation if not Dutch/EN/DE/FR
- **police_clearance**: issue date within 6 months of today (`{today_iso}` injected), correct jurisdiction
- **birth_certificate**: apostille visible, certified translation if non-EU language

**File passing:** base64 inline — image block for images, document block for PDFs. Never use a URL — Anthropic vision API requires base64 for arbitrary files.

**Fallback on unreadable doc:**
```json
{"status": "fail", "summary": "Document unreadable — reupload a clearer scan", "issues": [...]}
```

---

### Risk score prompt

Sends only structured metadata — **no document content, no PII**. Claude's only job is writing the human-readable `risk_items` text. All numeric dimension scores are pre-calculated in Python and passed in the prompt for Claude to reference.

---

## Backend Files

### New files to create
| File | Purpose |
|---|---|
| `backend/app/routes/validation.py` | Full Feature 1: validate + get-validation endpoints |
| `backend/app/routes/risk_score.py` | Full Feature 2: compute + get-risk-score endpoints |

### Files to modify
| File | Change |
|---|---|
| `backend/app/config.py` | Add `DAILY_VALIDATION_LIMIT=10`, `DAILY_RISK_SCORE_LIMIT=3`, `ADMIN_SECRET`, `MAX_VALIDATION_FILE_SIZE` |
| `backend/app/main.py` | `include_router` for both new routers |
| `backend/app/routes/checklist.py` | Add `call_type: str = "checklist"` param to `_check_and_increment_usage`; update usage endpoint return shape |
| `backend/app/routes/auth.py` | Add consent PATCH endpoint; add admin tier-grant endpoint; add `risk_scores` deletion to `delete_account` |

### New Railway env var
Add `ADMIN_SECRET` to Railway environment (any strong random string).

---

## Frontend Files

### New components to create
| File | Purpose |
|---|---|
| `frontend/app/components/AiConsentModal.tsx` | GDPR consent modal — not dismissable via Escape/backdrop; shows loading state during PATCH |
| `frontend/app/components/ValidationBadge.tsx` | Pill badge (grey/green/amber/red) + expandable issues list |
| `frontend/app/components/RiskScoreWidget.tsx` | Score card: progress bar + risk level + top risk items + Refresh button |

### Files to modify
| File | Change |
|---|---|
| `frontend/lib/api.ts` | Add `validateDocument`, `getDocumentValidation`, `computeRiskScore`, `getRiskScore`, `updateConsent` |
| `frontend/app/documents/page.tsx` | Fetch validations on mount; render `<ValidationBadge>`; consent gate; Validate button per doc |
| `frontend/app/dashboard/page.tsx` | Add `<RiskScoreWidget>` between CountdownBanner and Progress card; Validate button in task expanded panel |

### Consent flow
1. User clicks "Validate" or "Compute risk score"
2. Check `profile.ai_validation_consent` — if false, render `<AiConsentModal>`
3. On confirm → `PATCH /api/auth/profile/{user_id}/consent` → update local profile state → proceed
4. On decline → dismiss, do nothing
5. Withdrawal via settings menu → same PATCH with `false` → Validate buttons hidden

### Paywall UI
- Check `profile.tier === 'paid'` before rendering Validate/Compute buttons
- On 402 from backend → show upgrade card: "Unlock with paid plan — coming soon" + waitlist link
- No changes needed when Stripe is wired later

---

## Implementation Sequence

| Phase | Work | Ship independently? |
|---|---|---|
| **A** | Run DB migration in Supabase SQL editor | ✓ non-breaking |
| **B** | `config.py` + update `_check_and_increment_usage` + usage endpoint | ✓ |
| **C** | Consent PATCH + admin tier endpoint + `delete_account` fix | ✓ |
| **D** | `validation.py` + wire into `main.py` | ✓ |
| **E** | `risk_score.py` + wire into `main.py` | ✓ |
| **F** | `lib/api.ts` TypeScript functions + types | ✓ |
| **G** | `AiConsentModal.tsx` | ✓ |
| **H** | `ValidationBadge.tsx` + documents page update | ✓ |
| **I** | `RiskScoreWidget.tsx` + dashboard update | ✓ |
| **J** | Use admin endpoint to grant paid tier to beta users → end-to-end test | ✓ |

---

## Verification Checklist

- [ ] Migration run → new tables visible in Supabase Table Editor
- [ ] Deploy backend → `GET /api/health` returns 200
- [ ] Admin endpoint grants paid tier to test user
- [ ] Upload a passport PDF → click Validate → `document_validations` row created with correct status
- [ ] Compute risk score → `risk_scores` row upserted
- [ ] Delete the document → `document_validations` row auto-deleted (CASCADE)
- [ ] Delete account → `risk_scores` row deleted, no orphan data
- [ ] Free-tier account → Validate button shows upgrade prompt (402 handled)
- [ ] Withdraw consent → Validate buttons hidden; re-consent → available again
- [ ] 11th validation call in one day → 429 response
