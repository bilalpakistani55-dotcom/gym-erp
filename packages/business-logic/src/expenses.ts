import type { SqlDatabase } from "@gym-erp/database";
import { expenseInputSchema, friendlyParse, incomeInputSchema } from "@gym-erp/validation";
import { enqueueSync, newId, writeAudit } from "./setup.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function recordExpenseOffline(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string; currencyCode: string },
  input: unknown,
): { expenseId: string } {
  const data = friendlyParse(expenseInputSchema, input);
  const category = db.get<{ id: string }>(
    `SELECT id FROM expense_categories WHERE id = ? AND gym_id = ?`,
    [data.categoryId, ctx.gymId],
  );
  if (!category) throw new Error("Expense category not found.");

  const expenseId = newId();
  const ts = nowIso();

  db.transaction(() => {
    db.run(
      `INSERT INTO expenses (
        id, gym_id, category_id, amount_minor, currency_code, description, vendor,
        recorded_by_user_id, incurred_at, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        expenseId,
        ctx.gymId,
        data.categoryId,
        data.amountMinor,
        ctx.currencyCode,
        data.description,
        data.vendor ?? null,
        ctx.userId,
        data.incurredAt,
        ts,
        ts,
      ],
    );
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "expenses",
      entityId: expenseId,
      operation: "create",
      deviceId: ctx.deviceId,
      version: 1,
      payload: {
        id: expenseId,
        gymId: ctx.gymId,
        categoryId: data.categoryId,
        amountMinor: data.amountMinor,
        methodCode: null,
        description: data.description,
        vendor: data.vendor ?? null,
        incurredAt: data.incurredAt,
        recordedByUserId: ctx.userId,
      },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      action: "Recorded expense",
      entityType: "expenses",
      entityId: expenseId,
      deviceId: ctx.deviceId,
      after: data,
    });
  });

  return { expenseId };
}

export function recordIncomeOffline(
  db: SqlDatabase,
  ctx: { gymId: string; userId: string; deviceId: string; currencyCode: string },
  input: unknown,
): { incomeId: string } {
  const data = friendlyParse(incomeInputSchema, input);
  const incomeId = newId();
  const ts = nowIso();

  db.transaction(() => {
    db.run(
      `INSERT INTO income (
        id, gym_id, source, amount_minor, currency_code, notes, received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incomeId,
        ctx.gymId,
        data.source,
        data.amountMinor,
        ctx.currencyCode,
        data.notes ?? null,
        data.receivedAt,
        ts,
      ],
    );
    enqueueSync(db, {
      gymId: ctx.gymId,
      entityType: "income",
      entityId: incomeId,
      operation: "create",
      deviceId: ctx.deviceId,
      version: 1,
      payload: {
        id: incomeId,
        gymId: ctx.gymId,
        source: data.source,
        amountMinor: data.amountMinor,
        notes: data.notes ?? null,
        receivedAt: data.receivedAt,
      },
    });
    writeAudit(db, {
      gymId: ctx.gymId,
      userId: ctx.userId,
      action: "Recorded other income",
      entityType: "income",
      entityId: incomeId,
      deviceId: ctx.deviceId,
      after: data,
    });
  });

  return { incomeId };
}

export interface ExpenseListRow {
  id: string;
  category_name: string;
  amount_minor: number;
  currency_code: string;
  description: string;
  vendor: string | null;
  incurred_at: string;
  recorded_by: string | null;
}

export function listExpenses(
  db: SqlDatabase,
  gymId: string,
  filter: { from?: string; to?: string; limit?: number } = {},
): ExpenseListRow[] {
  const limit = filter.limit ?? 200;
  const conditions = ["e.gym_id = ?", "e.deleted_at IS NULL"];
  const params: unknown[] = [gymId];
  if (filter.from) {
    conditions.push("date(e.incurred_at) >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("date(e.incurred_at) <= ?");
    params.push(filter.to);
  }
  return db.all<ExpenseListRow>(
    `SELECT e.id, ec.name as category_name, e.amount_minor, e.currency_code, e.description,
            e.vendor, e.incurred_at, u.full_name as recorded_by
     FROM expenses e
     JOIN expense_categories ec ON ec.id = e.category_id
     LEFT JOIN users u ON u.id = e.recorded_by_user_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY e.incurred_at DESC LIMIT ?`,
    [...params, limit],
  );
}

export function listExpenseCategories(
  db: SqlDatabase,
  gymId: string,
): Array<{ id: string; name: string; code: string; is_active: number }> {
  return db.all(
    `SELECT id, name, code, is_active FROM expense_categories WHERE gym_id = ? ORDER BY name ASC`,
    [gymId],
  );
}

export interface IncomeListRow {
  id: string;
  source: string;
  amount_minor: number;
  currency_code: string;
  notes: string | null;
  received_at: string;
}

export function listIncome(
  db: SqlDatabase,
  gymId: string,
  filter: { from?: string; to?: string; limit?: number } = {},
): IncomeListRow[] {
  const limit = filter.limit ?? 200;
  const conditions = ["gym_id = ?"];
  const params: unknown[] = [gymId];
  if (filter.from) {
    conditions.push("date(received_at) >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("date(received_at) <= ?");
    params.push(filter.to);
  }
  return db.all<IncomeListRow>(
    `SELECT id, source, amount_minor, currency_code, notes, received_at
     FROM income WHERE ${conditions.join(" AND ")}
     ORDER BY received_at DESC LIMIT ?`,
    [...params, limit],
  );
}
