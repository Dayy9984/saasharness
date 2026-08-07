CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  flow_id TEXT NOT NULL,
  flow_version TEXT NOT NULL,
  current_step_id TEXT,
  context_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')),
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  PRIMARY KEY (user_id, flow_id)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_progress(status, updated_at);
