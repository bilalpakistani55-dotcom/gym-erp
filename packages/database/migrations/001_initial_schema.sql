-- GYM ERP initial schema. Local SQLite. Multi-gym ready via organization_id / gym_id.
-- Connection pragmas are applied by the database driver, not this migration.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  logo_path TEXT,
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  address TEXT,
  phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id),
  permission_id TEXT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (gym_id, username)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  device_id TEXT,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  member_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  father_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  date_of_birth TEXT,
  gender TEXT NOT NULL DEFAULT 'unspecified',
  emergency_contact TEXT,
  blood_group TEXT,
  join_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  fingerprint_template_id TEXT,
  face_template_id TEXT,
  profile_photo_path TEXT,
  profile_photo_thumb_path TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  last_modified_by_device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (gym_id, member_code)
);

CREATE TABLE IF NOT EXISTS member_photos (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  file_path TEXT NOT NULL,
  thumb_path TEXT,
  original_path TEXT,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  plan_id TEXT NOT NULL REFERENCES membership_plans(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS renewals (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  membership_id TEXT NOT NULL REFERENCES memberships(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  payment_id TEXT,
  previous_end_date TEXT NOT NULL,
  new_end_date TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_methods (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  direction TEXT NOT NULL,
  method TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  confidence REAL,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (gym_id, code)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT,
  membership_id TEXT,
  amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  method_code TEXT NOT NULL,
  received_by_user_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  notes TEXT,
  paid_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT,
  payment_id TEXT,
  invoice_number TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  issued_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  payment_id TEXT NOT NULL,
  file_path TEXT,
  receipt_number TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (gym_id, code)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  description TEXT NOT NULL,
  vendor TEXT,
  receipt_path TEXT,
  recorded_by_user_id TEXT NOT NULL,
  incurred_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  source TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  notes TEXT,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date TEXT,
  purchase_cost_minor INTEGER,
  warranty_until TEXT,
  status TEXT NOT NULL DEFAULT 'working',
  location TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  performed_at TEXT NOT NULL,
  description TEXT NOT NULL,
  cost_minor INTEGER,
  next_due_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  user_id TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  salary_minor INTEGER,
  hired_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS employee_attendance (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  direction TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS salary_records (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  amount_minor INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT,
  equipment_id TEXT,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biometric_devices (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  status_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biometric_templates (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  kind TEXT NOT NULL,
  encrypted_payload BLOB NOT NULL,
  algorithm TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_hub INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_records (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  device_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  sync_record_id TEXT NOT NULL REFERENCES sync_records(id),
  priority INTEGER NOT NULL DEFAULT 100,
  available_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  local_version INTEGER NOT NULL,
  remote_version INTEGER NOT NULL,
  local_payload_json TEXT NOT NULL,
  remote_payload_json TEXT NOT NULL,
  local_device_id TEXT NOT NULL,
  remote_device_id TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolution TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by_user_id TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  device_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS application_settings (
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (gym_id, key)
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL REFERENCES gyms(id),
  file_path TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  size_bytes INTEGER
);

CREATE INDEX IF NOT EXISTS idx_members_gym_name ON members(gym_id, full_name);
CREATE INDEX IF NOT EXISTS idx_members_gym_phone ON members(gym_id, phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id, end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_member_time ON attendance(member_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_time ON attendance(gym_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_payments_gym_time ON payments(gym_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_expenses_gym_time ON expenses(gym_id, incurred_at);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_records(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_gym_time ON audit_logs(gym_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
