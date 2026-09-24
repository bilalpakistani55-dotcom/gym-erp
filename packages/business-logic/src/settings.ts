import type { SqlDatabase } from "@gym-erp/database";
import type { RoleCode } from "@gym-erp/shared-types";
import { hashSessionToken, hashPassword, verifyPassword } from "@gym-erp/security";
import { accountProfileSchema, changePasswordSchema, friendlyParse, gymProfileSchema } from "@gym-erp/validation";
import { writeAudit } from "./setup.js";

function nowIso(): string {
  return new Date().toISOString();
}

export interface GymProfile {
  gymId: string;
  organizationId: string;
  name: string;
  address: string | null;
  phone: string | null;
  currencyCode: string;
  timezone: string;
  setupComplete: boolean;
}

export function getGymProfile(db: SqlDatabase, gymId: string): GymProfile | null {
  const row = db.get<{
    id: string;
    organization_id: string;
    name: string;
    address: string | null;
    phone: string | null;
    currency_code: string;
    timezone: string;
  }>(
    `SELECT id, organization_id, name, address, phone, currency_code, timezone FROM gyms WHERE id = ?`,
    [gymId],
  );
  if (!row) return null;
  const setup = db.get<{ value_json: string }>(
    `SELECT value_json FROM application_settings WHERE gym_id = ? AND key = 'setup_complete'`,
    [gymId],
  );
  return {
    gymId: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    currencyCode: row.currency_code,
    timezone: row.timezone,
    setupComplete: setup?.value_json === "true",
  };
}

export function updateGymProfile(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string },
  input: unknown,
): void {
  const data = friendlyParse(gymProfileSchema, input);
  db.run(
    `UPDATE gyms SET name = ?, address = ?, phone = ?, currency_code = COALESCE(?, currency_code),
     timezone = COALESCE(?, timezone), updated_at = ? WHERE id = ?`,
    [
      data.name,
      data.address ?? null,
      data.phone ?? null,
      data.currencyCode ?? null,
      data.timezone ?? null,
      nowIso(),
      ctx.gymId,
    ],
  );
  writeAudit(db, {
    gymId: ctx.gymId,
    userId: ctx.userId,
    action: "Updated gym profile",
    entityType: "gyms",
    entityId: ctx.gymId,
    deviceId: ctx.deviceId,
    after: data,
  });
}

export interface UserRow {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: RoleCode;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

export function listUsers(db: SqlDatabase, gymId: string): UserRow[] {
  return db.all<UserRow>(
    `SELECT id, full_name, username, email, phone, role, is_active, last_login_at, created_at
     FROM users WHERE gym_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
    [gymId],
  );
}

export function updateAccountProfile(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string },
  input: unknown,
): string {
  const data = friendlyParse(accountProfileSchema, input);
  const existing = db.get<{ id: string }>(
    `SELECT id FROM users WHERE id = ? AND gym_id = ? AND deleted_at IS NULL`,
    [ctx.userId, ctx.gymId],
  );
  if (!existing) throw new Error("Account not found.");
  const duplicate = db.get<{ id: string }>(
    `SELECT id FROM users WHERE gym_id = ? AND username = ? AND id <> ? AND deleted_at IS NULL`,
    [ctx.gymId, data.username, ctx.userId],
  );
  if (duplicate) throw new Error("That login name is already in use.");
  db.run(`UPDATE users SET username = ?, updated_at = ? WHERE id = ? AND gym_id = ?`, [
    data.username,
    nowIso(),
    ctx.userId,
    ctx.gymId,
  ]);
  writeAudit(db, {
    gymId: ctx.gymId,
    userId: ctx.userId,
    action: "Updated login name",
    entityType: "users",
    entityId: ctx.userId,
    deviceId: ctx.deviceId,
    after: data,
  });
  return data.username;
}

export async function changePassword(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string },
  input: unknown,
): Promise<void> {
  const data = friendlyParse(changePasswordSchema, input);
  const row = db.get<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = ? AND gym_id = ? AND deleted_at IS NULL`,
    [ctx.userId, ctx.gymId],
  );
  if (!row) throw new Error("Account not found.");

  const ok = await verifyPassword(data.currentPassword, row.password_hash);
  if (!ok) throw new Error("Your current password is not correct.");

  const passwordHash = await hashPassword(data.newPassword);
  db.run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [passwordHash, nowIso(), ctx.userId]);
  writeAudit(db, {
    gymId: ctx.gymId,
    userId: ctx.userId,
    action: "Changed password",
    entityType: "users",
    entityId: ctx.userId,
  });
}

export function logoutUser(db: SqlDatabase, token: string): void {
  db.run(`DELETE FROM sessions WHERE token_hash = ?`, [hashSessionToken(token)]);
}

export function deleteExpiredSessions(db: SqlDatabase): void {
  db.run(`DELETE FROM sessions WHERE expires_at < ?`, [nowIso()]);
}
