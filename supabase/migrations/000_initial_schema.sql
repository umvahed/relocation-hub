-- Base schema for profiles, tasks, and documents tables.
-- Created from production schema export on 2026-05-03.
-- Run this BEFORE migrations 001–005.
-- Migrations 001–005 ALTER these tables; this file only creates their initial form.

BEGIN;

CREATE TABLE IF NOT EXISTS profiles (
  id                      uuid NOT NULL,
  email                   text NOT NULL,
  full_name               text,
  origin_country          text,
  destination_country     text DEFAULT 'Netherlands'::text,
  move_date               date,
  is_paid                 boolean DEFAULT false,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamp with time zone DEFAULT now(),
  updated_at              timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid,
  title         text NOT NULL,
  description   text,
  category      text NOT NULL,
  status        text DEFAULT 'pending'::text,
  priority      integer DEFAULT 0,
  depends_on    text[],
  due_date      date,
  external_link text,
  created_at    timestamp with time zone DEFAULT now(),
  updated_at    timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS documents (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid,
  task_id               uuid,
  file_name             text NOT NULL,
  file_path             text NOT NULL,
  file_size             integer,
  mime_type             text,
  category              text,
  ai_validation_status  text DEFAULT 'pending'::text,
  ai_validation_notes   text,
  created_at            timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Foreign keys
ALTER TABLE tasks     ADD CONSTRAINT IF NOT EXISTS tasks_user_id_fkey     FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT IF NOT EXISTS documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- RLS
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

COMMIT;
