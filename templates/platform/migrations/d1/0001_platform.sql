PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_user (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email
  ON app_user(lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS oauth_attempt (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'kakao')),
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_attempt_expiry ON oauth_attempt(expires_at);

CREATE TABLE IF NOT EXISTS oauth_identity (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS idx_oauth_identity_user ON oauth_identity(user_id);

CREATE TABLE IF NOT EXISTS app_session (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_session_user ON app_session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expiry ON app_session(expires_at);

CREATE TABLE IF NOT EXISTS plan_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('one-time', 'subscription', 'credits')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  credit_amount INTEGER NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  stripe_price_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plan_catalog_active ON plan_catalog(active, billing_mode);

CREATE TABLE IF NOT EXISTS app_order (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  plan_id TEXT NOT NULL REFERENCES plan_catalog(id),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  idempotency_key TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'failed', 'canceled', 'refunded', 'disputed')),
  provider_payment_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
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
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  refunded_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0),
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
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
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription_record(user_id, status);

CREATE TABLE IF NOT EXISTS entitlement (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'grace', 'revoked')),
  expires_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, entitlement_key)
);

CREATE TABLE IF NOT EXISTS credit_account (
  user_id TEXT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES credit_account(user_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  actor_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS credit_ledger_require_account
BEFORE INSERT ON credit_ledger
WHEN NOT EXISTS (SELECT 1 FROM credit_account WHERE user_id = NEW.user_id)
BEGIN
  SELECT RAISE(ABORT, 'credit account not found');
END;

CREATE TRIGGER IF NOT EXISTS credit_ledger_prevent_overdraft
BEFORE INSERT ON credit_ledger
WHEN NEW.delta < 0
  AND (SELECT balance + NEW.delta FROM credit_account WHERE user_id = NEW.user_id) < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient credits');
END;

CREATE TRIGGER IF NOT EXISTS credit_ledger_apply_balance
AFTER INSERT ON credit_ledger
BEGIN
  UPDATE credit_account
  SET balance = balance + NEW.delta, updated_at = NEW.created_at
  WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS credit_ledger_no_update
BEFORE UPDATE ON credit_ledger BEGIN
  SELECT RAISE(ABORT, 'credit_ledger is append-only');
END;
CREATE TRIGGER IF NOT EXISTS credit_ledger_no_delete
BEFORE DELETE ON credit_ledger BEGIN
  SELECT RAISE(ABORT, 'credit_ledger is append-only');
END;

CREATE TABLE IF NOT EXISTS webhook_inbox (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1,
  lease_until INTEGER,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
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
  available_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox_event(status, available_at);

CREATE TABLE IF NOT EXISTS audit_event (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  subject_id TEXT,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_event(subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_event(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS privacy_request (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  kind TEXT NOT NULL CHECK (kind IN ('export', 'delete')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  requested_at INTEGER NOT NULL,
  completed_at INTEGER,
  payload_json TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_privacy_user ON privacy_request(user_id, requested_at DESC);
