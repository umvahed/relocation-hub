-- Migration 018: Feedback table
-- Stores user feedback submissions from /feedback page.
-- Service role only — admin use.

BEGIN;

CREATE TABLE feedback (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
    email       text,
    name        text,
    source      text,
    most_useful text,
    missing     text,
    nps_score   smallint CHECK (nps_score BETWEEN 0 AND 10),
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to feedback"
    ON feedback FOR ALL
    USING (auth.role() = 'service_role');

COMMIT;
