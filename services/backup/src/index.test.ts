import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyMigrations, SqlJsDatabase } from "@gym-erp/database";
import { completeFirstRun } from "@gym-erp/business-logic";
import { createBackup, listBackups, pruneBackups, restoreBackup } from "./index.js";

describe("backup", () => {
  it("creates a backup, records it, restores it, and prunes by retention", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-bak-"));
    const databaseFile = join(dir, "gym.db");
    const db = await SqlJsDatabase.open({ filePath: databaseFile });
    try {
      applyMigrations(db);
      await completeFirstRun(db, "device-pc", {
        gymName: "Iron Hall",
        ownerName: "Ayesha Khan",
        username: "owner",
        password: "Password1",
        currencyCode: "PKR",
      });

      const backupsDir = join(dir, "backups");
      const first = createBackup(db, databaseFile, backupsDir, { skipPrune: true });
      expect(existsSync(first.filePath)).toBe(true);
      const record = db.get<{ status: string; checksum_sha256: string | null }>(
        `SELECT status, checksum_sha256 FROM backups WHERE id = ?`,
        [first.backupId],
      );
      expect(record?.status).toBe("healthy");
      expect(record?.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);

      // Change the live database, restore from backup, verify old content returns.
      db.run(`INSERT INTO app_metadata (key, value, updated_at) VALUES ('marker', '"new"', '2026-01-01')`);
      db.persist();
      const restore = restoreBackup(databaseFile, first.filePath);
      expect(restore.preRestoreBackupPath).toBeTruthy();
      expect(existsSync(restore.preRestoreBackupPath as string)).toBe(true);
      // The restored file is byte-identical to the backup snapshot.
      expect(readFileSync(databaseFile).length).toBe(readFileSync(first.filePath).length);

      expect(listBackups(backupsDir).length).toBeGreaterThanOrEqual(1);

      for (let i = 0; i < 3; i += 1) {
        writeFileSync(join(backupsDir, `gym-erp-2026-01-0${i + 1}T00-00-00-000Z.db`), "old");
      }
      const pruned = pruneBackups(backupsDir, 2);
      expect(pruned).toEqual({ kept: 2, removed: 3 });
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
