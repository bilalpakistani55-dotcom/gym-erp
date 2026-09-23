-- Phase 3 schema hardening for production local SQLite installs.
-- This migration preserves the initial schema while adding operational tables
-- and metadata needed for imports, exports, files, restores, and idempotent sync.

ALTER TABLE documents ADD COLUMN entity_type TEXT;
ALTER TABLE documents ADD COLUMN entity_id TEXT;
ALTER TABLE documents ADD COLUMN original_file_name TEXT;
ALTER TABLE documents ADD COLUMN size_bytes INTEGER;
ALTER TABLE documents ADD COLUMN checksum_sha256 TEXT;

ALTER TABLE equipment ADD COLUMN photo_path TEXT;
ALTER TABLE equipment ADD COLUMN maintenance_interval_days INTEGER;
ALTER TABLE equipment ADD COLUMN next_maintenance_at TEXT;

ALTER TABLE biometric_templates ADD COLUMN disabled_at TEXT;
ALTER TABLE biometric_templates ADD COLUMN liveness_json TEXT;
ALTER TABLE biometric_templates ADD COLUMN threshold REAL;

ALTER TABLE biometric_devices ADD COLUMN last_connected_at TEXT;
ALTER TABLE biometric_devices ADD COLUMN last_error TEXT;

ALTER TABLE sync_records ADD COLUMN idempotency_key TEXT;
ALTER TABLE sync_queue ADD COLUMN locked_at TEXT;
ALTER TABLE sync_queue ADD COLUMN last_attempt_at TEXT;

ALTER TABLE devices ADD COLUMN sync_endpoint_url TEXT;
ALTER TABLE devices ADD COLUMN updated_at TEXT;

ALTER TABLE backups ADD COLUMN completed_at TEXT;
ALTER TABLE backups ADD COLUMN checksum_sha256 TEXT;
ALTER TABLE backups ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE backups ADD COLUMN error_message TEXT;

ALTER TABLE receipts ADD COLUMN printable_html_path TEXT;
ALTER TABLE receipts ADD COLUMN pdf_path TEXT;

ALTER TABLE payments ADD COLUMN external_reference TEXT;
ALTER TABLE expenses ADD COLUMN supplier_id TEXT REFERENCES suppliers(id);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_assets (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  owner_type TEXT NOT NULL,
  owner_id TEXT,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_file_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  checksum_sha256 TEXT,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  entity_type TEXT NOT NULL,
  source_file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  column_mapping_json TEXT NOT NULL,
  preview_json TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS import_job_errors (
  id TEXT PRIMARY KEY,
  import_job_id TEXT NOT NULL REFERENCES import_jobs(id),
  row_number INTEGER NOT NULL,
  field_name TEXT,
  message TEXT NOT NULL,
  raw_row_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  entity_type TEXT NOT NULL,
  format TEXT NOT NULL,
  filter_json TEXT,
  file_path TEXT,
  status TEXT NOT NULL,
  requested_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS backup_restore_events (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  backup_id TEXT REFERENCES backups(id),
  requested_by_user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT,
  pre_restore_backup_path TEXT
);

CREATE TABLE IF NOT EXISTS recurring_backup_policies (
  gym_id TEXT PRIMARY KEY REFERENCES gyms(id),
  enabled INTEGER NOT NULL DEFAULT 1,
  run_at_local_time TEXT NOT NULL DEFAULT '23:00',
  retain_daily INTEGER NOT NULL DEFAULT 7,
  retain_weekly INTEGER NOT NULL DEFAULT 4,
  retain_monthly INTEGER NOT NULL DEFAULT 3,
  encrypt_backups INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_receipt_unique ON payments(gym_id, receipt_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number_unique ON invoices(gym_id, invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_number_unique ON receipts(gym_id, receipt_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_idempotency ON sync_records(gym_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_assets_owner ON file_assets(gym_id, owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_file_assets_kind ON file_assets(gym_id, kind, created_at);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(gym_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(gym_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_backups_status_time ON backups(gym_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_due ON equipment(gym_id, next_maintenance_at);

INSERT OR REPLACE INTO app_metadata (key, value, updated_at)
VALUES ('schema_phase', '3', datetime('now'));
