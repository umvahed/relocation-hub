BEGIN;
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS container_ship_date date;
COMMIT;
