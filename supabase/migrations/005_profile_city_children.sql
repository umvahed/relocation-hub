BEGIN;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS destination_city   text,
    ADD COLUMN IF NOT EXISTS has_children       boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS number_of_children integer;

COMMIT;
