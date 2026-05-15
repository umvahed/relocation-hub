-- Migration 016: Promo codes + referral tracking
-- Enables influencer codes, discount codes, and referral attribution at checkout.

BEGIN;

CREATE TABLE IF NOT EXISTS promo_codes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text        UNIQUE NOT NULL,
  discount_percent      integer     NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  type                  text        NOT NULL DEFAULT 'manual' CHECK (type IN ('referral', 'influencer', 'manual')),
  referred_by_user_id   uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  uses_count            integer     NOT NULL DEFAULT 0,
  max_uses              integer,
  expires_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (code);

-- Track which promo code a user redeemed at checkout
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_code text;

-- RLS: promo_codes is admin-only — no direct client access
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to promo codes"
  ON promo_codes FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
