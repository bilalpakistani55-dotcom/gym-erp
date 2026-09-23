export const PRODUCT_NAME = "GYM ERP";
export const PRODUCT_SLUG = "gym-erp";
export const DEFAULT_CURRENCY = "PKR";
export const DEFAULT_SYNC_PORT = 47821;
export const APP_DATA_FOLDER = "GymERP";

export const PATHS = {
  database: "data/database/gym.db",
  members: "data/members",
  documents: "data/documents",
  receipts: "data/receipts",
  backups: "data/backups",
  biometrics: "data/biometrics",
  logs: "data/logs",
} as const;

export const DEFAULT_BACKUP_RETENTION = {
  daily: 7,
  weekly: 4,
  monthly: 3,
} as const;

export const DEFAULT_PAYMENT_METHODS = [
  { code: "cash", name: "Cash" },
  { code: "bank_transfer", name: "Bank transfer" },
  { code: "card", name: "Card" },
  { code: "jazzcash", name: "JazzCash" },
  { code: "easypaisa", name: "Easypaisa" },
  { code: "other", name: "Other" },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { code: "rent", name: "Rent" },
  { code: "electricity", name: "Electricity" },
  { code: "salaries", name: "Salaries" },
  { code: "maintenance", name: "Maintenance" },
  { code: "marketing", name: "Marketing" },
  { code: "supplies", name: "Supplies" },
  { code: "equipment", name: "Equipment" },
  { code: "other", name: "Other" },
] as const;
