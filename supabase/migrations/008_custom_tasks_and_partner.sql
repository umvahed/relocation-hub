-- 008: Custom tasks + partner profile fields

-- Add source column to tasks to distinguish ai/hardcoded/custom
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai';

-- Backfill existing hardcoded tasks by priority (SA prereqs=100, SA docs=90, general=100)
UPDATE tasks SET source = 'hardcoded' WHERE priority >= 90;

-- Partner fields on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_partner BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_origin_country TEXT;
