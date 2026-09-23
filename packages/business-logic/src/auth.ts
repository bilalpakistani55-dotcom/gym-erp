import { randomUUID } from "node:crypto";
import type { SqlDatabase } from "@gym-erp/database";
import type { PermissionCode, RoleCode, UserAccount } from "@gym-erp/shared-types";
import { can, createSessionToken, hashSessionToken, permissionsFor, SESSION_TTL_MS } from "@gym-erp/security";
import { verifyPassword } from "@gym-erp/security";

export type AuthenticatedUser = Readonly<{
  user: UserAccount;
  sessionToken: string;
  permissions: PermissionCode[];
}>;

export type LoginInput = Readonly<{
  gymId: string;
  username: string;
  password: string;
  deviceId?: string;
}>;

export async function loginUser(
  db: SqlDatabase,
  input: LoginInput,
): Promise<AuthenticatedUser | null> {
  const row = db.get<{
    id: string;
    gym_id: string;
    organization_id: string;
    full_name: string;
    username: string;
    email: string | null;
    phone: string | null;
    password_hash: string;
    role: RoleCode;
    is_active: number;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT * FROM users WHERE gym_id = ? AND username = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
    [input.gymId, input.username],
  );

  if (!row) return null;
  const passwordOk = await verifyPassword(input.password, row.password_hash);
  if (!passwordOk) return null;

  const { token, tokenHash } = createSessionToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.run(
    `INSERT INTO sessions (id, user_id, gym_id, device_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), row.id, row.gym_id, input.deviceId ?? null, tokenHash, expiresAt, now],
  );

  db.run(
    `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, row.id],
  );

  const user: UserAccount = {
    id: row.id,
    gymId: row.gym_id,
    organizationId: row.organization_id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active === 1,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };

  return {
    user,
    sessionToken: token,
    permissions: permissionsFor(row.role),
  };
}

export function validateSession(db: SqlDatabase, token: string): AuthenticatedUser | null {
  const tokenHash = hashSessionToken(token);
  const row = db.get<{
    user_id: string;
    gym_id: string;
    device_id: string | null;
    expires_at: string;
    updated_at?: string;
  }>(
    `SELECT user_id, gym_id, device_id, expires_at FROM sessions WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  const userRow = db.get<{
    id: string;
    gym_id: string;
    organization_id: string;
    full_name: string;
    username: string;
    email: string | null;
    phone: string | null;
    password_hash: string;
    role: RoleCode;
    is_active: number;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT * FROM users WHERE id = ? AND gym_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
    [row.user_id, row.gym_id],
  );

  if (!userRow) return null;

  const user: UserAccount = {
    id: userRow.id,
    gymId: userRow.gym_id,
    organizationId: userRow.organization_id,
    fullName: userRow.full_name,
    username: userRow.username,
    email: userRow.email,
    phone: userRow.phone,
    passwordHash: userRow.password_hash,
    role: userRow.role,
    isActive: userRow.is_active === 1,
    lastLoginAt: userRow.last_login_at,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
    deletedAt: userRow.deleted_at,
  };

  return {
    user,
    sessionToken: token,
    permissions: permissionsFor(user.role),
  };
}

export function hasPermission(user: { role: RoleCode }, permission: PermissionCode): boolean {
  return can(user.role, permission);
}
