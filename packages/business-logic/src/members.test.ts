import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyMigrations, SqlJsDatabase } from "@gym-erp/database";
import { completeFirstRun } from "./setup.js";
import { createMemberOffline, recordAttendance, recordPaymentAndActivateMembership } from "./members.js";

describe("offline member journeys", () => {
  it("creates a member, payment, membership, and face attendance in one local database", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-bl-"));
    const db = await SqlJsDatabase.open({ filePath: join(dir, "gym.db") });
    try {
      applyMigrations(db);
      const setup = await completeFirstRun(db, "device-pc", {
        gymName: "Iron Hall",
        ownerName: "Ayesha Khan",
        username: "owner",
        password: "Password1",
        currencyCode: "PKR",
      });
      const member = createMemberOffline(
        db,
        { ...setup, deviceId: "device-pc" },
        { fullName: "Ali Raza", joinDate: "2026-01-01", gender: "male" },
      );
      expect(member.memberCode).toBe("MEMBER-000001");

      db.run(
        `INSERT INTO membership_plans (id, gym_id, name, duration_days, price_minor, currency_code, is_active, created_at, updated_at)
         VALUES ('plan-1', ?, 'Monthly', 30, 500000, 'PKR', 1, ?, ?)`,
        [setup.gymId, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
      );

      const paid = recordPaymentAndActivateMembership(
        db,
        { gymId: setup.gymId, userId: setup.userId, deviceId: "device-pc", currencyCode: "PKR" },
        {
          memberId: member.id,
          planId: "plan-1",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
          payment: { amountMinor: 500000, methodCode: "cash", paidAt: "2026-01-01T10:00:00.000Z" },
        },
      );
      expect(paid.paymentId).toBeTruthy();

      const att = recordAttendance(
        db,
        { gymId: setup.gymId, userId: setup.userId, deviceId: "device-pc" },
        {
          memberId: member.id,
          direction: "check_in",
          method: "face",
          occurredAt: "2026-01-01T18:00:00.000Z",
        },
      );
      expect(att.id).toBeTruthy();

      const pending = db.get<{ c: number }>("SELECT COUNT(*) as c FROM sync_records WHERE status = 'pending'");
      expect((pending?.c ?? 0) > 0).toBe(true);

      expect(() =>
        recordAttendance(
          db,
          { gymId: setup.gymId, userId: setup.userId, deviceId: "device-pc" },
          {
            memberId: member.id,
            direction: "check_in",
            method: "fingerprint",
            occurredAt: "2026-01-01T18:01:00.000Z",
          },
        ),
      ).toThrow(/Fingerprint check-in is not enabled/);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rolls back membership if payment insert would fail mid-transaction", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-bl-"));
    const db = await SqlJsDatabase.open({ filePath: join(dir, "gym.db") });
    try {
      applyMigrations(db);
      const setup = await completeFirstRun(db, "device-pc", {
        gymName: "Iron Hall",
        ownerName: "Ayesha Khan",
        username: "owner",
        password: "Password1",
        currencyCode: "PKR",
      });
      expect(() =>
        db.transaction(() => {
          db.run(
            `INSERT INTO memberships (id, gym_id, member_id, plan_id, start_date, end_date, status, payment_status, version, created_at, updated_at)
             VALUES ('m1', ?, 'missing', 'p1', '2026-01-01', '2026-01-31', 'active', 'paid', 1, ?, ?)`,
            [setup.gymId, "t", "t"],
          );
          throw new Error("simulate payment insert failure");
        }),
      ).toThrow("simulate payment insert failure");
      const count = db.get<{ c: number }>("SELECT COUNT(*) as c FROM memberships");
      expect(count?.c).toBe(0);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
