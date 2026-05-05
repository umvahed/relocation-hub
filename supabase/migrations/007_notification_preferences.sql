-- Migration 007: email notification preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN NOT NULL DEFAULT TRUE;
