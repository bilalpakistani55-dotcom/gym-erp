import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SqlJsDatabase, applyMigrations } from "@gym-erp/database";
import { completeFirstRun, createMemberOffline } from "@gym-erp/business-logic";
import { createSyncRecord } from "../src/index.js";
import {
  applyIncomingRecords,
  listConflicts,
  processSyncQueue,
  pullRecordsSince,
  resolveConflict,
  type SyncRecordDTO,
} from "../src/sync-queue.js";

function toDto(record: ReturnType<typeof createSyncRecord>): SyncRecordDTO {
  return {
    id: record.id,
    gymId: record.gymId,
    entityType: record.entityType,
    entityId: record.entityId,
    operation: record.operation,
    deviceId: record.deviceId,
    version: record.version,
    payloadJson: record.payloadJson,
    timestamp: record.timestamp,
  };
}

async function makeDb(): Promise<{ db: SqlJsDatabase; gymId: string; organizationId: string; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "gym-erp-sync-"));
  const db = (await SqlJsDatabase.open({ filePath: join(dir, "gym.db") })) as SqlJsDatabase;
  applyMigrations(db);
  const setup = await completeFirstRun(db, "hub-device", {
    gymName: "Sync Gym",
    ownerName: "Owner",
    username: "owner",
    password: "Password1",
    currencyCode: "PKR",
  });
  const organizationId = db.get<{ id: string }>(`SELECT id FROM organizations LIMIT 1`)?.id as string;
  return { db, gymId: setup.gymId, organizationId, dir };
}

describe("sync round trip", () => {
  it("pushes a member from device to hub and pulls it back to a second device", async () => {
    const { db, gymId, organizationId, dir } = await makeDb();
    try {
      // Device A creates a member locally (on its own copy) and pushes the
      // record to the hub — the hub does not have this member yet.
      const record = createSyncRecord({
        id: "device-record-1",
        gymId,
        entityType: "members",
        entityId: "member-from-device",
        operation: "create",
        deviceId: "device-a",
        version: 1,
        payload: {
          id: "member-from-device",
          gymId,
          organizationId,
          memberCode: "MEMBER-000009",
          fullName: "Round Trip",
          joinDate: "2026-02-01",
          gender: "male",
        },
      });
      const wire = JSON.parse(JSON.stringify([toDto(record)])) as SyncRecordDTO[];

      const applied = applyIncomingRecords(db, wire);
      expect(applied.applied).toBe(1);
      expect(applied.conflicts).toBe(0);

      const stored = db.get<{ full_name: string; member_code: string }>(
        `SELECT full_name, member_code FROM members WHERE id = ?`,
        ["member-from-device"],
      );
      expect(stored?.full_name).toBe("Round Trip");
      expect(stored?.member_code).toBe("MEMBER-000009");

      // Device B pulls everything except its own writes.
      const pull = pullRecordsSince(db, { since: "1970-01-01T00:00:00.000Z", excludeDeviceId: "device-b" });
      expect(pull.records.length).toBeGreaterThanOrEqual(1);
      expect(pull.records.some((r) => r.entityId === "member-from-device")).toBe(true);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parks equal-version conflicting payloads for an admin and resolves them", async () => {
    const { db, gymId, organizationId, dir } = await makeDb();
    try {
      createMemberOffline(
        db,
        { gymId, organizationId, userId: "u", deviceId: "device-a" },
        { fullName: "Conflict Case", joinDate: "2026-02-01" },
      );
      const memberId = db.get<{ id: string }>(`SELECT id FROM members LIMIT 1`)?.id as string;

      const payload = {
        id: memberId,
        gymId,
        organizationId,
        memberCode: "MEMBER-000001",
        fullName: "Conflict Case EDITED",
        joinDate: "2026-02-01",
        gender: "unspecified",
      };
      const incoming = toDto(
        createSyncRecord({
          id: "conflict-record-1",
          gymId,
          entityType: "members",
          entityId: memberId,
          operation: "update",
          deviceId: "device-b",
          version: 1, // same version as local, different payload -> needs admin
          payload,
        }),
      );

      const result = applyIncomingRecords(db, [incoming]);
      expect(result.conflicts).toBe(1);
      const conflicts = listConflicts(db, gymId);
      expect(conflicts.length).toBe(1);

      resolveConflict(db, { conflictId: conflicts[0]!.id as string, resolution: "remote", userId: "admin" });
      const renamed = db.get<{ full_name: string }>(`SELECT full_name FROM members WHERE id = ?`, [memberId]);
      expect(renamed?.full_name).toBe("Conflict Case EDITED");
      expect(listConflicts(db, gymId).length).toBe(1); // still listed, now resolved=1
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("marks records synced when no transport is configured (hub is authoritative)", async () => {
    const { db, gymId, organizationId, dir } = await makeDb();
    try {
      createMemberOffline(
        db,
        { gymId, organizationId, userId: "u", deviceId: "hub-device" },
        { fullName: "Local Only", joinDate: "2026-02-01" },
      );
      const stats = await processSyncQueue(db);
      expect(stats.synced).toBeGreaterThan(0);
      const left = db.get<{ c: number }>(`SELECT COUNT(*) as c FROM sync_records WHERE status = 'pending'`);
      expect(left?.c).toBe(0);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
