-- Per-user IND slot availability flag (personal, not community)
-- Resets every Monday via GitHub Actions cron → POST /api/ind-monitor/weekly-reset
-- Exception period: Nov 24 – Jan 7 (IND holiday, no reset)
ALTER TABLE ind_monitor_subscriptions
  ADD COLUMN IF NOT EXISTS user_slots_available BOOLEAN NOT NULL DEFAULT TRUE;

-- User IND biometrics appointments with reminder tracking
CREATE TABLE IF NOT EXISTS ind_appointments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  desk_code        TEXT        NOT NULL,
  desk_name        TEXT        NOT NULL,
  appointment_date DATE        NOT NULL,
  reminder_sent_7d BOOLEAN     NOT NULL DEFAULT FALSE,
  reminder_sent_1d BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
