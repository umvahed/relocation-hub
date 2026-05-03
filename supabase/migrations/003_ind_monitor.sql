BEGIN;

-- 1. Subscriptions: one row per user
CREATE TABLE IF NOT EXISTS ind_monitor_subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    email           text NOT NULL,
    active          boolean NOT NULL DEFAULT true,
    last_notified_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ind_subs_user_id ON ind_monitor_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_ind_subs_active ON ind_monitor_subscriptions(active);

-- 2. Cache: append-only log of each check result (keep last N rows via cron cleanup)
CREATE TABLE IF NOT EXISTS ind_monitor_cache (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at      timestamptz NOT NULL DEFAULT now(),
    slots_available boolean NOT NULL,
    status_text     text
);
CREATE INDEX IF NOT EXISTS idx_ind_cache_checked_at ON ind_monitor_cache(checked_at DESC);

-- 3. RLS
ALTER TABLE ind_monitor_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own IND subscription"
    ON ind_monitor_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to IND subscriptions"
    ON ind_monitor_subscriptions FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE ind_monitor_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to IND cache"
    ON ind_monitor_cache FOR ALL USING (auth.role() = 'service_role');

COMMIT;
