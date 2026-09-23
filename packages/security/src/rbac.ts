import { createHash, randomBytes } from "node:crypto";
import type { PermissionCode, RoleCode } from "@gym-erp/shared-types";

const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  admin: [
    "members.read",
    "members.write",
    "members.delete",
    "memberships.write",
    "payments.read",
    "payments.write",
    "expenses.read",
    "expenses.write",
    "attendance.write",
    "reports.read",
    "staff.manage",
    "settings.manage",
    "backups.manage",
    "devices.manage",
    "biometrics.manage",
    "audit.read",
    "diagnostics.read",
    "conflicts.resolve",
    "demo.load",
  ],
  manager: [
    "members.read",
    "members.write",
    "members.delete",
    "memberships.write",
    "payments.read",
    "payments.write",
    "expenses.read",
    "expenses.write",
    "attendance.write",
    "reports.read",
    "staff.manage",
    "settings.manage",
    "backups.manage",
    "devices.manage",
    "biometrics.manage",
    "audit.read",
    "diagnostics.read",
    "conflicts.resolve",
  ],
  receptionist: [
    "members.read",
    "members.write",
    "memberships.write",
    "payments.read",
    "payments.write",
    "expenses.read",
    "attendance.write",
    "reports.read",
  ],
  staff: ["members.read", "attendance.write", "payments.read", "expenses.read"],
};

export function permissionsFor(role: RoleCode): PermissionCode[] {
  return ROLE_PERMISSIONS[role];
}

export function can(role: RoleCode, permission: PermissionCode): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
