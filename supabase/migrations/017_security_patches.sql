-- Migration 017: Security patches
-- 1. RLS on ind_appointments (was missing — users could read/write any appointment)
-- 2. Atomic promo code increment RPC (eliminates TOCTOU race in uses_count)

BEGIN;

-- ── 1. RLS on ind_appointments ────────────────────────────────────────────────

ALTER TABLE ind_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own IND appointment"
  ON ind_appointments FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to IND appointments"
  ON ind_appointments FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. Atomic promo uses_count increment ─────────────────────────────────────
-- Called from billing webhook — prevents TOCTOU race where two simultaneous
-- checkouts with the same code could both pass the max_uses check.

CREATE OR REPLACE FUNCTION increment_promo_uses(promo_code_val text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE promo_codes
  SET uses_count = uses_count + 1
  WHERE code = promo_code_val;
$$;

COMMIT;
