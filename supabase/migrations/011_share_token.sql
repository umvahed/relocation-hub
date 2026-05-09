-- Add share_token to profiles for public read-only progress sharing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();

-- Backfill any rows that got NULL (shouldn't happen with DEFAULT, but belt-and-suspenders)
UPDATE profiles SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Now enforce NOT NULL
ALTER TABLE profiles ALTER COLUMN share_token SET NOT NULL;

-- Unique index so we can look up by token efficiently
CREATE UNIQUE INDEX IF NOT EXISTS profiles_share_token_idx ON profiles (share_token);
