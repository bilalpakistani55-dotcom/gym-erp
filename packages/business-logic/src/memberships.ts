import type { SqlDatabase } from "@gym-erp/database";
import { friendlyParse, planInputSchema, planUpdateSchema, renewMembershipSchema } from "@gym-erp/validation";
import { enqueueSync, newId, writeAudit } from "./setup.js";
import { insertReceiptRow, nextDocumentNumber } from "./receipts.js";

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Membership plans
// ---------------------------------------------------------------------------

export interface PlanRow {
  id: string;
  name: string;
  duration_days: number;
  price_minor: number;
  currency_code: string;
  is_active: number;
}

export function listPlans(db: SqlDatabase, gymId: string, includeInactive = false): PlanRow[] {
  const filter = includeInactive ? "" : " AND is_active = 1";
  return db.all<PlanRow>(
    `SELECT id, name, duration_days, price_minor, currency_code, is_active
     FROM membership_plans WHERE gym_id = ?${filter} ORDER BY duration_days ASC`,
    [gymId],
  );
}

export function createPlan(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string; currencyCode: string },
  input: unknown,
): { planId: string } {
  const data = friendlyParse(planInputSchema, input);
  const id = newId();
  const ts = nowIso();
  db.transaction(() => {
    db.run(
      `INSERT INTO membership_plans (id, gym_id, name, duration_days, price_minor, currency_code, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, ctx.gymId, data.name, data.durationDays, data.priceMinor, ctx.currencyCode, ts, ts],
    );
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "membership_plans",
      entityId: id,
      operation: "create",
      deviceId: ctx.deviceId,
      version: 1,
      payload: { id, ...data },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      action: "Created membership plan",
      entityType: "membership_plans",
      entityId: id,
      deviceId: ctx.deviceId,
      after: data,
    });
  });
  return { planId: id };
}

export function updatePlan(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string },
  planId: string,
  input: unknown,
): void {
  const data = friendlyParse(planUpdateSchema, input);
  const existing = db.get<PlanRow>(
    `SELECT * FROM membership_plans WHERE id = ? AND gym_id = ?`,
    [planId, ctx.gymId],
  );
  if (!existing) throw new Error("Plan not found.");

  const fields: Array<[string, unknown]> = [];
  if (data.name !== undefined) fields.push(["name", data.name]);
  if (data.durationDays !== undefined) fields.push(["duration_days", data.durationDays]);
  if (data.priceMinor !== undefined) fields.push(["price_minor", data.priceMinor]);
  if (fields.length === 0) return;

  const ts = nowIso();
  db.transaction(() => {
    db.run(
      `UPDATE membership_plans SET ${fields.map(([column]) => `${column} = ?`).join(", ")}, updated_at = ? WHERE id = ? AND gym_id = ?`,
      [...fields.map(([, value]) => value), ts, planId, ctx.gymId],
    );
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "membership_plans",
      entityId: planId,
      operation: "update",
      deviceId: ctx.deviceId,
      version: 2,
      payload: { id: planId, ...data },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      action: "Updated membership plan",
      entityType: "membership_plans",
      entityId: planId,
      deviceId: ctx.deviceId,
    });
  });
}

export function setPlanActive(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string },
  planId: string,
  isActive: boolean,
): void {
  const existing = db.get<PlanRow>(`SELECT * FROM membership_plans WHERE id = ? AND gym_id = ?`, [planId, ctx.gymId]);
  if (!existing) throw new Error("Plan not found.");
  db.run(`UPDATE membership_plans SET is_active = ?, updated_at = ? WHERE id = ? AND gym_id = ?`, [
    isActive ? 1 : 0,
    nowIso(),
    planId,
    ctx.gymId,
  ]);
  writeAudit(db, {
    gymId: ctx.gymId,
    userId: ctx.userId,
    action: isActive ? "Activated membership plan" : "Deactivated membership plan",
    entityType: "membership_plans",
    entityId: planId,
    deviceId: ctx.deviceId,
  });
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export interface MembershipListRow {
  id: string;
  member_id: string;
  member_name: string;
  member_code: string;
  member_phone: string | null;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  days_left: number | null;
}

const MEMBERSHIP_SELECT = `
  SELECT ms.id, ms.member_id, m.full_name as member_name, m.member_code, m.phone as member_phone,
         p.name as plan_name, ms.start_date, ms.end_date, ms.status, ms.payment_status,
         CAST(julianday(ms.end_date) - julianday(date('now')) AS INTEGER) as days_left
  FROM memberships ms
  JOIN members m ON m.id = ms.member_id
  JOIN membership_plans p ON p.id = ms.plan_id
  WHERE ms.gym_id = ? AND ms.deleted_at IS NULL`;

export function listMemberships(
  db: SqlDatabase,
  gymId: string,
  filter: { expiringWithinDays?: number; limit?: number } = {},
): MembershipListRow[] {
  const limit = filter.limit ?? 200;
  if (typeof filter.expiringWithinDays === "number") {
    return db.all<MembershipListRow>(
      `${MEMBERSHIP_SELECT}
       AND ms.status = 'active' AND ms.end_date >= date('now')
       AND ms.end_date <= date('now', '+' || ? || ' days')
       ORDER BY ms.end_date ASC LIMIT ?`,
      [gymId, filter.expiringWithinDays, limit],
    );
  }
  return db.all<MembershipListRow>(
    `${MEMBERSHIP_SELECT} ORDER BY ms.end_date DESC LIMIT ?`,
    [gymId, limit],
  );
}

/**
 * Renew (or extend) an existing membership: extends from the current end date when
 * it is still in the future, or from today when it already expired. Records the
 * renewal row and its payment atomically.
 */
export function renewMembership(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string; currencyCode: string },
  input: unknown,
): { paymentId: string; renewalId: string; newEndDate: string; receiptNumber: string } {
  const data = friendlyParse(renewMembershipSchema, input);
  const membership = db.get<{
    id: string;
    member_id: string;
    end_date: string;
    status: string;
    version: number;
  }>(
    `SELECT id, member_id, end_date, status, version FROM memberships
     WHERE id = ? AND gym_id = ? AND deleted_at IS NULL`,
    [data.membershipId, ctx.gymId],
  );
  if (!membership) throw new Error("Membership not found.");
  const plan = db.get<{ id: string; duration_days: number }>(
    `SELECT id, duration_days FROM membership_plans WHERE id = ? AND gym_id = ? AND is_active = 1`,
    [data.planId, ctx.gymId],
  );
  if (!plan) throw new Error("The selected plan was not found.");

  const today = todayIso();
  const baseDate = data.startDate ?? (membership.end_date > today ? membership.end_date : today);
  const newEndDate = addDays(baseDate, plan.duration_days);

  const paymentId = newId();
  const renewalId = newId();
  const ts = nowIso();
  const newVersion = membership.version + 1;

  const result = db.transaction(() => {
    const receiptNumber = nextDocumentNumber(db, ctx.gymId, "RCPT");
    const previousEndDate = membership.end_date;
    db.run(
      `UPDATE memberships SET end_date = ?, status = 'active', payment_status = 'paid', version = ?, updated_at = ?
       WHERE id = ? AND gym_id = ?`,
      [newEndDate, newVersion, ts, data.membershipId, ctx.gymId],
    );
    db.run(
      `INSERT INTO payments (id, gym_id, member_id, membership_id, amount_minor, currency_code, method_code, received_by_user_id, receipt_number, notes, paid_at, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        paymentId,
        ctx.gymId,
        membership.member_id,
        data.membershipId,
        data.payment.amountMinor,
        ctx.currencyCode,
        data.payment.methodCode,
        ctx.userId,
        receiptNumber,
        data.payment.notes ?? null,
        data.payment.paidAt,
        ts,
        ts,
      ],
    );
    insertReceiptRow(db, { gymId: ctx.gymId, paymentId, receiptNumber, printableHtmlPath: null });
    db.run(
      `INSERT INTO renewals (id, gym_id, membership_id, member_id, payment_id, previous_end_date, new_end_date, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [renewalId, ctx.gymId, data.membershipId, membership.member_id, paymentId, previousEndDate, newEndDate, ctx.userId, ts],
    );
    db.run(`UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`, [ts, membership.member_id]);
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "memberships",
      entityId: data.membershipId,
      operation: "update",
      deviceId: ctx.deviceId,
      version: newVersion,
      payload: {
        id: data.membershipId,
        gymId: ctx.gymId,
        memberId: membership.member_id,
        planId: data.planId,
        startDate: baseDate,
        endDate: newEndDate,
        status: "active",
        paymentStatus: "paid",
      },
    });
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "payments",
      entityId: paymentId,
      operation: "create",
      deviceId: ctx.deviceId,
      version: 1,
      payload: {
        id: paymentId,
        gymId: ctx.gymId,
        memberId: membership.member_id,
        membershipId: data.membershipId,
        amountMinor: data.payment.amountMinor,
        methodCode: data.payment.methodCode,
        receiptNumber,
        notes: data.payment.notes ?? null,
        paidAt: data.payment.paidAt,
        receivedByUserId: ctx.userId,
      },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      action: "Renewed membership",
      entityType: "memberships",
      entityId: data.membershipId,
      deviceId: ctx.deviceId,
      after: { previousEndDate, newEndDate, planId: data.planId },
    });
    return { receiptNumber };
  });

  return { paymentId, renewalId, newEndDate, receiptNumber: result.receiptNumber };
}

/**
 * Mark memberships whose end date has passed as expired and reflect that on the
 * member record. Safe to run repeatedly; returns how many rows changed.
 */
export function expireOverdueMemberships(db: SqlDatabase, gymId: string): { memberships: number; members: number } {
  const ts = nowIso();
  return db.transaction(() => {
    const expired = db.all<{ id: string; member_id: string }>(
      `SELECT id, member_id FROM memberships
       WHERE gym_id = ? AND deleted_at IS NULL AND status = 'active' AND end_date < date('now')`,
      [gymId],
    );
    for (const row of expired) {
      db.run(`UPDATE memberships SET status = 'expired', updated_at = ? WHERE id = ?`, [ts, row.id]);
      // Only mark the member expired when they hold no other active membership.
      const activeLeft = db.get<{ c: number }>(
        `SELECT COUNT(*) as c FROM memberships WHERE member_id = ? AND gym_id = ? AND deleted_at IS NULL AND status = 'active' AND end_date >= date('now')`,
        [row.member_id, gymId],
      );
      if ((activeLeft?.c ?? 0) === 0) {
        db.run(`UPDATE members SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'active'`, [ts, row.member_id]);
      }
    }
    return { memberships: expired.length, members: expired.length };
  });
}
