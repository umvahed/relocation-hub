-- Migration 016: Promo codes + referral tracking
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  type text NOT NULL DEFAULT 'manual' CHECK (type IN ('referral', 'influencer', 'manual')),
  referred_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uses_count integer NOT NULL DEFAULT 0,
  max_uses integer,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Track which promo code a user used at checkout
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_code text;

-- RLS: only service role can read/write promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON promo_codes
  FOR ALL USING (auth.role() = 'service_role');
