CREATE TABLE IF NOT EXISTS app_user (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email
  ON app_user(lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS oauth_attempt (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'kakao')),
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_attempt_expiry ON oauth_attempt(expires_at);

CREATE TABLE IF NOT EXISTS oauth_identity (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS idx_oauth_identity_user ON oauth_identity(user_id);

CREATE TABLE IF NOT EXISTS app_session (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  revoked_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_session_user ON app_session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expiry ON app_session(expires_at);

CREATE TABLE IF NOT EXISTS plan_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('one-time', 'subscription', 'credits')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  credit_amount BIGINT NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plan_catalog_active ON plan_catalog(active, billing_mode);

CREATE TABLE IF NOT EXISTS app_order (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  plan_id TEXT NOT NULL REFERENCES plan_catalog(id),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  idempotency_key TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'failed', 'canceled', 'refunded', 'disputed')),
  provider_payment_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_provider_payment
  ON app_order(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_user ON app_order(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_record (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES app_order(id),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  provider_payment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  refunded_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0),
  payload_json TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(provider, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_order ON payment_record(order_id);

CREATE TABLE IF NOT EXISTS subscription_record (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  plan_id TEXT NOT NULL REFERENCES plan_catalog(id),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  provider_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(provider, provider_subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription_record(user_id, status);

CREATE TABLE IF NOT EXISTS entitlement (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'grace', 'revoked')),
  expires_at BIGINT,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, entitlement_key)
);

CREATE TABLE IF NOT EXISTS credit_account (
  user_id TEXT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES credit_account(user_id) ON DELETE CASCADE,
  delta BIGINT NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  actor_id TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION reject_credit_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS credit_ledger_no_update ON credit_ledger;
CREATE TRIGGER credit_ledger_no_update
BEFORE UPDATE ON credit_ledger FOR EACH ROW EXECUTE FUNCTION reject_credit_ledger_mutation();
DROP TRIGGER IF EXISTS credit_ledger_no_delete ON credit_ledger;
CREATE TRIGGER credit_ledger_no_delete
BEFORE DELETE ON credit_ledger FOR EACH ROW EXECUTE FUNCTION reject_credit_ledger_mutation();

CREATE TABLE IF NOT EXISTS webhook_inbox (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1,
  lease_until BIGINT,
  received_at BIGINT NOT NULL,
  processed_at BIGINT,
  error TEXT,
  PRIMARY KEY (provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_retry ON webhook_inbox(status, lease_until, received_at);

CREATE TABLE IF NOT EXISTS outbox_event (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  processed_at BIGINT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox_event(status, available_at);

CREATE TABLE IF NOT EXISTS audit_event (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  subject_id TEXT,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_event(subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_event(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS privacy_request (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  kind TEXT NOT NULL CHECK (kind IN ('export', 'delete')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  requested_at BIGINT NOT NULL,
  completed_at BIGINT,
  payload_json TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_privacy_user ON privacy_request(user_id, requested_at DESC);
