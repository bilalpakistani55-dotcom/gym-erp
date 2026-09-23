import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqlJsDatabase } from "@gym-erp/database";
import { applyMigrations } from "@gym-erp/database";
import { completeFirstRun } from "./setup.js";
import {
  listExpenseCategories,
  listExpenses,
  listIncome,
  recordExpenseOffline,
  recordIncomeOffline,
} from "./expenses.js";

describe("expense and income workflows", () => {
  it("records an expense entry", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-expense-"));
    const db = await SqlJsDatabase.open({ filePath: join(dir, "gym.db") });
    try {
      applyMigrations(db);
      const setup = await completeFirstRun(db, "device-pc", {
        gymName: "Test Gym",
        ownerName: "Test Owner",
        username: "owner",
        password: "Password123",
        currencyCode: "PKR",
      });

      // Get the first default category ID (completeFirstRun already seeded expense_categories)
      const categories = listExpenseCategories(db, setup.gymId);
      const firstCat = categories[0];
      if (!firstCat) throw new Error("No expense categories seeded");

      const result = recordExpenseOffline(db, { gymId: setup.gymId, userId: setup.userId, deviceId: "device-pc", currencyCode: "PKR" }, {
        amountMinor: 50000,
        categoryId: firstCat.id,
        description: "Office supplies",
        vendor: "Office Depot",
        incurredAt: "2026-01-01T10:00:00.000Z",
      });

      expect(result.expenseId).toBeTruthy();

      const expense = db.get<{ id: string; amount_minor: number; description: string }>(
        "SELECT id, amount_minor, description FROM expenses WHERE gym_id = ?",
        [setup.gymId],
      );
      expect(expense?.description).toBe("Office supplies");
      expect(expense?.amount_minor).toBe(50000);

      const rows = listExpenses(db, setup.gymId);
      expect(rows.length).toBe(1);
      expect(rows[0]?.category_name).toBe(firstCat.name);

      // Invalid category is rejected with a staff-friendly error.
      expect(() =>
        recordExpenseOffline(db, { gymId: setup.gymId, userId: setup.userId, deviceId: "device-pc", currencyCode: "PKR" }, {
          amountMinor: 100,
          categoryId: "missing-category",
          description: "Ghost expense",
          incurredAt: "2026-01-02T10:00:00.000Z",
        }),
      ).toThrow(/category was not found|not found/i);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records income entry", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-income-"));
    const db = await SqlJsDatabase.open({ filePath: join(dir, "gym.db") });
    try {
      applyMigrations(db);
      const setup = await completeFirstRun(db, "device-pc", {
        gymName: "Test Gym",
        ownerName: "Test Owner",
        username: "owner",
        password: "Password123",
        currencyCode: "PKR",
      });

      const result = recordIncomeOffline(db, { gymId: setup.gymId, userId: setup.userId, deviceId: "device-pc", currencyCode: "PKR" }, {
        source: "Membership renewal",
        amountMinor: 25000,
        notes: "Monthly membership",
        receivedAt: "2026-01-01T10:00:00.000Z",
      });

      expect(result.incomeId).toBeTruthy();

      const income = db.get<{ id: string; source: string; amount_minor: number }>(
        "SELECT id, source, amount_minor FROM income WHERE gym_id = ?",
        [setup.gymId],
      );
      expect(income?.source).toBe("Membership renewal");
      expect(income?.amount_minor).toBe(25000);

      const rows = listIncome(db, setup.gymId);
      expect(rows.length).toBe(1);
      expect(rows[0]?.amount_minor).toBe(25000);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
