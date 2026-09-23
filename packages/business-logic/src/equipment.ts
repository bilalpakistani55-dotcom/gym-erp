import { randomUUID } from "node:crypto";
import type { SqlDatabase } from "@gym-erp/database";
import { enqueueSync, writeAudit } from "./setup.js";

export interface EquipmentContext {
  gymId: string;
  userId: string;
  deviceId: string;
}

export function listEquipment(db: SqlDatabase, gymId: string): Array<Record<string, unknown>> {
  return db.all(
    `SELECT e.id, e.name, e.category, e.brand, e.model, e.serial_number, e.purchase_date,
            e.purchase_cost_minor, e.warranty_until, e.status, e.location, e.notes,
            e.next_maintenance_at, e.created_at, e.updated_at,
            (SELECT MAX(performed_at) FROM equipment_maintenance em WHERE em.equipment_id = e.id) AS last_maintenance_at
     FROM equipment e
     WHERE e.gym_id = ? AND e.deleted_at IS NULL
     ORDER BY e.name COLLATE NOCASE`,
    [gymId],
  );
}

export function createEquipment(
  db: SqlDatabase,
  ctx: EquipmentContext,
  input: Record<string, unknown>,
): { id: string } {
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Equipment name is required.");
  const id = randomUUID();
  const now = new Date().toISOString();
  db.transaction(() => {
    db.run(
      `INSERT INTO equipment (
        id, gym_id, name, category, brand, model, serial_number, purchase_date,
        purchase_cost_minor, warranty_until, status, location, notes, maintenance_interval_days,
        next_maintenance_at, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        ctx.gymId,
        name,
        input.category ?? null,
        input.brand ?? null,
        input.model ?? null,
        input.serialNumber ?? null,
        input.purchaseDate ?? null,
        input.purchaseCostMinor ?? null,
        input.warrantyUntil ?? null,
        input.status ?? "working",
        input.location ?? null,
        input.notes ?? null,
        input.maintenanceIntervalDays ?? null,
        input.nextMaintenanceAt ?? null,
        now,
        now,
      ],
    );
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "equipment",
      entityId: id,
      operation: "create",
      deviceId: ctx.deviceId,
      version: 1,
      payload: { id, gymId: ctx.gymId, ...input, name },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      deviceId: ctx.deviceId,
      action: "Added equipment",
      entityType: "equipment",
      entityId: id,
      after: { name, status: input.status ?? "working" },
    });
  });
  return { id };
}

export function updateEquipment(
  db: SqlDatabase,
  ctx: EquipmentContext,
  id: string,
  input: Record<string, unknown>,
): void {
  const existing = db.get<Record<string, unknown>>(
    `SELECT * FROM equipment WHERE id = ? AND gym_id = ? AND deleted_at IS NULL`,
    [id, ctx.gymId],
  );
  if (!existing) throw new Error("Equipment not found.");
  const fields: Array<[string, unknown]> = [
    ["name", input.name],
    ["category", input.category ?? null],
    ["brand", input.brand ?? null],
    ["model", input.model ?? null],
    ["serial_number", input.serialNumber ?? null],
    ["purchase_date", input.purchaseDate ?? null],
    ["purchase_cost_minor", input.purchaseCostMinor ?? null],
    ["warranty_until", input.warrantyUntil ?? null],
    ["status", input.status ?? "working"],
    ["location", input.location ?? null],
    ["notes", input.notes ?? null],
    ["maintenance_interval_days", input.maintenanceIntervalDays ?? null],
    ["next_maintenance_at", input.nextMaintenanceAt ?? null],
  ].filter((field): field is [string, unknown] => field[1] !== undefined);
  if (!fields.length) return;
  const now = new Date().toISOString();
  db.transaction(() => {
    db.run(
      `UPDATE equipment SET ${fields.map(([field]) => `${field} = ?`).join(", ")},
       version = version + 1, updated_at = ? WHERE id = ? AND gym_id = ?`,
      [...fields.map(([, value]) => value), now, id, ctx.gymId],
    );
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "equipment",
      entityId: id,
      operation: "update",
      deviceId: ctx.deviceId,
      version: Number(existing.version ?? 1) + 1,
      payload: { id, gymId: ctx.gymId, ...input },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      deviceId: ctx.deviceId,
      action: "Updated equipment",
      entityType: "equipment",
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: input,
    });
  });
}

export function archiveEquipment(db: SqlDatabase, ctx: EquipmentContext, id: string): void {
  const now = new Date().toISOString();
  db.run(`UPDATE equipment SET deleted_at = ?, updated_at = ? WHERE id = ? AND gym_id = ?`, [now, now, id, ctx.gymId]);
  writeAudit(db, {
    gymId: ctx.gymId,
    userId: ctx.userId,
    deviceId: ctx.deviceId,
    action: "Archived equipment",
    entityType: "equipment",
    entityId: id,
  });
}

export function listAuditLogs(db: SqlDatabase, gymId: string, limit = 200): Array<Record<string, unknown>> {
  return db.all(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.device_id, a.created_at,
            u.full_name AS user_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.gym_id = ? ORDER BY a.created_at DESC LIMIT ?`,
    [gymId, Math.min(Math.max(limit, 1), 500)],
  );
}
