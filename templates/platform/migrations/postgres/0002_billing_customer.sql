CREATE TABLE IF NOT EXISTS billing_customer (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  provider_customer_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, provider),
  UNIQUE(provider, provider_customer_id)
);
