INSERT OR IGNORE INTO roles (id, code, name) VALUES
  ('role-admin', 'admin', 'Administrator'),
  ('role-manager', 'manager', 'Manager'),
  ('role-receptionist', 'receptionist', 'Receptionist'),
  ('role-staff', 'staff', 'Staff');

INSERT OR IGNORE INTO permissions (id, code, name) VALUES
  ('p-members-read', 'members.read', 'View members'),
  ('p-members-write', 'members.write', 'Create and edit members'),
  ('p-members-delete', 'members.delete', 'Archive members'),
  ('p-memberships-write', 'memberships.write', 'Manage memberships'),
  ('p-payments-write', 'payments.write', 'Record payments'),
  ('p-expenses-write', 'expenses.write', 'Record expenses'),
  ('p-attendance-write', 'attendance.write', 'Record attendance'),
  ('p-reports-read', 'reports.read', 'View reports'),
  ('p-staff-manage', 'staff.manage', 'Manage staff'),
  ('p-settings-manage', 'settings.manage', 'Change settings'),
  ('p-backups-manage', 'backups.manage', 'Backups and restore'),
  ('p-devices-manage', 'devices.manage', 'Manage devices'),
  ('p-biometrics-manage', 'biometrics.manage', 'Manage face and fingerprint templates'),
  ('p-audit-read', 'audit.read', 'View activity history'),
  ('p-diagnostics-read', 'diagnostics.read', 'View diagnostics'),
  ('p-conflicts-resolve', 'conflicts.resolve', 'Resolve sync conflicts'),
  ('p-demo-load', 'demo.load', 'Load demonstration data');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role-admin', id FROM permissions;

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role-manager', id FROM permissions WHERE code NOT IN ('demo.load');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role-receptionist', id FROM permissions WHERE code IN (
  'members.read', 'members.write', 'memberships.write', 'payments.write',
  'attendance.write', 'reports.read'
);

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role-staff', id FROM permissions WHERE code IN (
  'members.read', 'attendance.write'
);

INSERT OR IGNORE INTO attendance_methods (id, code, name, is_active) VALUES
  ('am-manual', 'manual', 'Manual', 1),
  ('am-search', 'search', 'Search', 1),
  ('am-qr', 'qr', 'QR code', 1),
  ('am-barcode', 'barcode', 'Barcode', 1),
  ('am-face', 'face', 'Face recognition', 1),
  ('am-fingerprint', 'fingerprint', 'Fingerprint', 0);
