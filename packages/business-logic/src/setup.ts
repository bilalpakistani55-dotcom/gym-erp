import { randomUUID } from "node:crypto";
import type { SqlDatabase } from "@gym-erp/database";
import { createSyncRecord } from "@gym-erp/sync-engine";
import { DEFAULT_CURRENCY, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PAYMENT_METHODS } from "@gym-erp/shared-types";
import { hashPassword } from "@gym-erp/security";
import { firstRunSchema, friendlyParse } from "@gym-erp/validation";

function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return randomUUID();
}

export function enqueueSync(
  db: SqlDatabase,
  input: {
    gymId: string;
    entityType: string;
    entityId: string;
    operation: "create" | "update" | "delete";
    deviceId: string;
    version: number;
    payload: unknown;
  },
): void {
  const record = createSyncRecord({ id: newId(), ...input });
  db.run(
    `INSERT INTO sync_records (
      id, gym_id, entity_type, entity_id, operation, device_id, version, payload_json,
      timestamp, created_at, updated_at, status, retry_count, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.gymId,
      record.entityType,
      record.entityId,
      record.operation,
      record.deviceId,
      record.version,
      record.payloadJson,
      record.timestamp,
      record.createdAt,
      record.updatedAt,
      record.status,
      record.retryCount,
      record.errorMessage,
    ],
  );
  db.run(
    `INSERT INTO sync_queue (id, sync_record_id, priority, available_at, created_at) VALUES (?, ?, 100, ?, ?)`,
    [newId(), record.id, record.createdAt, record.createdAt],
  );
}

export function writeAudit(
  db: SqlDatabase,
  input: {
    gymId: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    deviceId?: string | null;
    before?: unknown;
    after?: unknown;
  },
): void {
  db.run(
    `INSERT INTO audit_logs (id, gym_id, user_id, action, entity_type, entity_id, device_id, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      input.gymId,
      input.userId,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.deviceId ?? null,
      input.before ? JSON.stringify(input.before) : null,
      input.after ? JSON.stringify(input.after) : null,
      nowIso(),
    ],
  );
}

export async function completeFirstRun(
  db: SqlDatabase,
  deviceId: string,
  input: unknown,
): Promise<{ gymId: string; organizationId: string; userId: string }> {
  const data = friendlyParse(firstRunSchema, input);
  const organizationId = newId();
  const gymId = newId();
  const userId = newId();
  const ts = nowIso();
  const passwordHash = await hashPassword(data.password);

  db.transaction(() => {
    db.run(
      `INSERT INTO organizations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [organizationId, data.gymName, ts, ts],
    );
    db.run(
      `INSERT INTO gyms (id, organization_id, name, logo_path, currency_code, timezone, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, 'Asia/Karachi', ?, ?)`,
      [gymId, organizationId, data.gymName, data.currencyCode ?? DEFAULT_CURRENCY, ts, ts],
    );
    db.run(
      `INSERT INTO users (id, gym_id, organization_id, full_name, username, email, phone, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'admin', 1, ?, ?)`,
      [userId, gymId, organizationId, data.ownerName, data.username, passwordHash, ts, ts],
    );
    db.run(
      `INSERT INTO devices (id, gym_id, name, platform, is_hub, last_seen_at, created_at) VALUES (?, ?, ?, 'desktop', 1, ?, ?)`,
      [deviceId, gymId, "Gym PC", ts, ts],
    );
    for (const method of DEFAULT_PAYMENT_METHODS) {
      db.run(
        `INSERT INTO payment_methods (id, gym_id, code, name, is_active) VALUES (?, ?, ?, ?, 1)`,
        [newId(), gymId, method.code, method.name],
      );
    }
    for (const category of DEFAULT_EXPENSE_CATEGORIES) {
      db.run(
        `INSERT INTO expense_categories (id, gym_id, name, code, is_active) VALUES (?, ?, ?, ?, 1)`,
        [newId(), gymId, category.name, category.code],
      );
    }
    db.run(
      `INSERT INTO application_settings (gym_id, key, value_json, updated_at) VALUES (?, 'setup_complete', 'true', ?)`,
      [gymId, ts],
    );
    db.run(
      `INSERT INTO biometric_devices (id, gym_id, kind, name, adapter_id, is_active, status_json, created_at, updated_at)
       VALUES (?, ?, 'face', 'Python local face recognition', 'face.python-yunet-sface', 1, '{}', ?, ?)`,
      [newId(), gymId, ts, ts],
    );
    db.run(
      `INSERT INTO biometric_devices (id, gym_id, kind, name, adapter_id, is_active, status_json, created_at, updated_at)
       VALUES (?, ?, 'fingerprint', 'Fingerprint (waiting for scanner)', 'fingerprint.unplugged', 0, '{}', ?, ?)`,
      [newId(), gymId, ts, ts],
    );
    writeAudit(db, {
      gymId,
      userId,
      action: "Completed first-time setup",
      entityType: "gyms",
      entityId: gymId,
      deviceId,
    });
  });

  return { gymId, organizationId, userId };
}

export function isSetupComplete(db: SqlDatabase): boolean {
  const row = db.get<{ value_json: string }>(
    `SELECT value_json FROM application_settings WHERE key = 'setup_complete' LIMIT 1`,
  );
  return row?.value_json === "true";
}

export function nextMemberCode(db: SqlDatabase, gymId: string): string {
  const row = db.get<{ c: number }>(`SELECT COUNT(*) as c FROM members WHERE gym_id = ?`, [gymId]);
  const n = (row?.c ?? 0) + 1;
  return `MEMBER-${String(n).padStart(6, "0")}`;
}
