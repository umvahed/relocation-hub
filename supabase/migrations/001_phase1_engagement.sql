-- Phase 1 engagement layer migrations
-- Run this once in the Supabase SQL editor

-- 1. API usage tracking (Claude rate limiting)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

-- 2. HR/consultant contact on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 3. Reminder tracking on tasks (already has due_date)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
