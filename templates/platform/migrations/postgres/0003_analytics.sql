CREATE TABLE IF NOT EXISTS analytics_event (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  session_id TEXT,
  path TEXT,
  referrer TEXT,
  properties_json TEXT NOT NULL,
  occurred_at BIGINT NOT NULL,
  received_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name_time ON analytics_event(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_time ON analytics_event(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_anon_time ON analytics_event(anonymous_id, occurred_at DESC);
