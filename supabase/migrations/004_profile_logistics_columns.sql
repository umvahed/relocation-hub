BEGIN;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS employment_type        text NOT NULL DEFAULT 'employed',
    ADD COLUMN IF NOT EXISTS has_pets               boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS shipping_type          text NOT NULL DEFAULT 'luggage_only',
    ADD COLUMN IF NOT EXISTS has_relocation_allowance boolean NOT NULL DEFAULT false;

COMMIT;
