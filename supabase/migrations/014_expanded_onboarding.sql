-- Migration 014: Expanded onboarding profile fields
-- Adds permit arrangement context, driving licence, school stage, and situational flags
-- All columns are nullable so existing rows are unaffected

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employer_arranges_permit TEXT,      -- 'employer' | 'self' | 'eu_citizen' | 'unsure'
  ADD COLUMN IF NOT EXISTS employer_is_sponsor     BOOLEAN,    -- null = not answered
  ADD COLUMN IF NOT EXISTS has_driving_licence     BOOLEAN,    -- null = not answered
  ADD COLUMN IF NOT EXISTS driving_licence_country TEXT,       -- country that issued the licence
  ADD COLUMN IF NOT EXISTS children_school_stage   TEXT,       -- 'primary' | 'secondary' | 'both' | 'preschool' | 'not_sure'
  ADD COLUMN IF NOT EXISTS expects_30_ruling       BOOLEAN,    -- null = not answered
  ADD COLUMN IF NOT EXISTS already_in_netherlands  BOOLEAN;    -- null = not answered
