CREATE TABLE IF NOT EXISTS storage_object (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'ready', 'deleted', 'failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_storage_owner ON storage_object(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_status ON storage_object(status, updated_at);
