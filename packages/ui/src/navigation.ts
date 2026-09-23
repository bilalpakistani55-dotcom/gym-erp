export type NavItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  requiredPermission?: string;
}>;

export const desktopNavigation = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "members", label: "Members", icon: "users", requiredPermission: "members.read" },
  { id: "attendance", label: "Attendance", icon: "clipboard-check", requiredPermission: "attendance.read" },
  { id: "memberships", label: "Memberships", icon: "badge-check", requiredPermission: "memberships.read" },
  { id: "payments", label: "Payments", icon: "banknote", requiredPermission: "payments.read" },
  { id: "expenses", label: "Expenses", icon: "receipt", requiredPermission: "expenses.read" },
  { id: "income", label: "Income", icon: "trending-up", requiredPermission: "income.read" },
  { id: "equipment", label: "Equipment", icon: "dumbbell", requiredPermission: "equipment.read" },
  { id: "staff", label: "Staff", icon: "id-card", requiredPermission: "staff.read" },
  { id: "reports", label: "Reports", icon: "chart-column", requiredPermission: "reports.read" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "devices", label: "Devices", icon: "scan-face", requiredPermission: "devices.read" },
  { id: "backups", label: "Backups", icon: "database-backup", requiredPermission: "backups.read" },
  { id: "settings", label: "Settings", icon: "settings", requiredPermission: "settings.read" },
] as const satisfies readonly NavItem[];

export const mobileNavigation = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "members", label: "Members", icon: "users", requiredPermission: "members.read" },
  { id: "attendance", label: "Attendance", icon: "clipboard-check", requiredPermission: "attendance.read" },
  { id: "payments", label: "Payments", icon: "banknote", requiredPermission: "payments.read" },
  { id: "renewals", label: "Renewals", icon: "badge-check", requiredPermission: "memberships.write" },
  { id: "expenses", label: "Expenses", icon: "receipt", requiredPermission: "expenses.read" },
  { id: "sync", label: "Sync", icon: "refresh-cw" },
  { id: "settings", label: "Settings", icon: "settings", requiredPermission: "settings.read" },
] as const satisfies readonly NavItem[];

export const navDesktop = desktopNavigation;
export const navMobile = mobileNavigation;

export type DesktopNavId = (typeof desktopNavigation)[number]["id"];
export type MobileNavId = (typeof mobileNavigation)[number]["id"];
