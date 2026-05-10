-- Store per-desk slot data from OAP API in the monitor cache
ALTER TABLE ind_monitor_cache ADD COLUMN IF NOT EXISTS slot_data JSONB DEFAULT '[]';
