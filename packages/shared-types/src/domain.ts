export type RoleCode = "admin" | "manager" | "receptionist" | "staff";

export type PermissionCode =
  | "members.read"
  | "members.write"
  | "members.delete"
  | "memberships.write"
  | "payments.read"
  | "payments.write"
  | "expenses.read"
  | "expenses.write"
  | "attendance.write"
  | "reports.read"
  | "staff.manage"
  | "settings.manage"
  | "backups.manage"
  | "devices.manage"
  | "biometrics.manage"
  | "audit.read"
  | "diagnostics.read"
  | "conflicts.resolve"
  | "demo.load";

export type MemberStatus = "active" | "expired" | "suspended" | "pending" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "partial" | "overdue" | "refunded";
export type EquipmentStatus = "working" | "maintenance" | "damaged" | "retired";
export type SyncStatus = "pending" | "in_progress" | "synced" | "error" | "conflict";
export type SyncOperation = "create" | "update" | "delete";
export type AttendanceDirection = "check_in" | "check_out";
export type AttendanceMethod =
  | "manual"
  | "search"
  | "qr"
  | "barcode"
  | "face"
  | "fingerprint";
export type BiometricKind = "face" | "fingerprint";
export type BackupStatus = "healthy" | "warning" | "failed" | "never";
export type ThemeMode = "light" | "dark" | "system";

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gym {
  id: string;
  organizationId: string;
  name: string;
  logoPath: string | null;
  currencyCode: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  gymId: string;
  organizationId: string;
  fullName: string;
  username: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  role: RoleCode;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Member {
  id: string;
  gymId: string;
  organizationId: string;
  memberCode: string;
  fullName: string;
  fatherName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | "unspecified";
  emergencyContact: string | null;
  bloodGroup: string | null;
  joinDate: string;
  status: MemberStatus;
  notes: string | null;
  fingerprintTemplateId: string | null;
  faceTemplateId: string | null;
  profilePhotoPath: string | null;
  profilePhotoThumbPath: string | null;
  version: number;
  lastModifiedByDeviceId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MemberPhoto {
  id: string;
  gymId: string;
  memberId: string;
  filePath: string;
  thumbPath: string | null;
  originalPath: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  gymId: string;
  name: string;
  durationDays: number;
  priceMinor: number;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  gymId: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: MemberStatus;
  paymentStatus: PaymentStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Renewal {
  id: string;
  gymId: string;
  membershipId: string;
  memberId: string;
  paymentId: string | null;
  previousEndDate: string;
  newEndDate: string;
  createdByUserId: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  gymId: string;
  memberId: string;
  direction: AttendanceDirection;
  method: AttendanceMethod;
  occurredAt: string;
  deviceId: string;
  confidence: number | null;
  notes: string | null;
  version: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface Payment {
  id: string;
  gymId: string;
  memberId: string | null;
  membershipId: string | null;
  amountMinor: number;
  currencyCode: string;
  methodCode: string;
  receivedByUserId: string;
  receiptNumber: string;
  notes: string | null;
  paidAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaymentMethod {
  id: string;
  gymId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  gymId: string;
  categoryId: string;
  amountMinor: number;
  currencyCode: string;
  description: string;
  vendor: string | null;
  receiptPath: string | null;
  recordedByUserId: string;
  incurredAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExpenseCategory {
  id: string;
  gymId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Income {
  id: string;
  gymId: string;
  source: string;
  amountMinor: number;
  currencyCode: string;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  gymId: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCostMinor: number | null;
  warrantyUntil: string | null;
  status: EquipmentStatus;
  location: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Employee {
  id: string;
  gymId: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  role: RoleCode;
  salaryMinor: number | null;
  hiredAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NotificationItem {
  id: string;
  gymId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  gymId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  deviceId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}

export interface DeviceRecord {
  id: string;
  gymId: string;
  name: string;
  platform: "desktop" | "android";
  isHub: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface ApplicationSettings {
  gymId: string;
  key: string;
  valueJson: string;
  updatedAt: string;
}
