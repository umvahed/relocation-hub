BEGIN;

-- 1. document_validations
CREATE TABLE IF NOT EXISTS document_validations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL,
    status          text NOT NULL CHECK (status IN ('pass', 'warn', 'fail')),
    summary         text NOT NULL,
    issues          jsonb NOT NULL DEFAULT '[]',
    model_version   text NOT NULL,
    validated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_validations_document_id ON document_validations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_validations_user_id ON document_validations(user_id);

-- 2. risk_scores (UNIQUE on user_id → upsert pattern)
CREATE TABLE IF NOT EXISTS risk_scores (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL UNIQUE,
    score            integer NOT NULL CHECK (score BETWEEN 0 AND 100),
    risk_level       text NOT NULL CHECK (risk_level IN ('low', 'med', 'high')),
    risk_items       jsonb NOT NULL DEFAULT '[]',
    dimension_scores jsonb NOT NULL DEFAULT '{}',
    computed_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_scores_user_id ON risk_scores(user_id);

-- 3. profiles: GDPR consent + paywall tier
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS ai_validation_consent     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_validation_consent_at  timestamptz,
    ADD COLUMN IF NOT EXISTS tier                      text NOT NULL DEFAULT 'free'
                                                          CHECK (tier IN ('free', 'paid')),
    ADD COLUMN IF NOT EXISTS tier_granted_at           timestamptz;

-- 4. api_usage: separate rate limits per call type
-- Add call_type column first (existing rows get default 'checklist')
ALTER TABLE api_usage
    ADD COLUMN IF NOT EXISTS call_type text NOT NULL DEFAULT 'checklist';
-- Drop the old (user_id, date) unique constraint and replace with (user_id, date, call_type)
ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS api_usage_user_id_date_key;
ALTER TABLE api_usage ADD CONSTRAINT api_usage_user_id_date_call_type_key UNIQUE (user_id, date, call_type);

-- 5. RLS
ALTER TABLE document_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own validations"
    ON document_validations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to validations"
    ON document_validations FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own risk score"
    ON risk_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to risk scores"
    ON risk_scores FOR ALL USING (auth.role() = 'service_role');

COMMIT;
