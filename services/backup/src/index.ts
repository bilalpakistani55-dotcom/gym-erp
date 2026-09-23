import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SqlDatabase } from "@gym-erp/database";
import { DEFAULT_BACKUP_RETENTION } from "@gym-erp/shared-types";
import { randomUUID } from "node:crypto";

export function backupFileName(now = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `gym-erp-${stamp}.db`;
}

export interface BackupRecord {
  id: string;
  file_path: string;
  kind: string;
  status: string;
  created_at: string;
  size_bytes: number | null;
  checksum_sha256: string | null;
}

/**
 * Create a consistent backup: because SQLite here is a single file, we copy the
 * live file while no transaction is in flight, record it in the backups table,
 * and prune old files by retention.
 */
export function createBackup(
  db: SqlDatabase,
  databaseFile: string,
  backupDir: string,
  options: { now?: Date; kind?: string; skipPrune?: boolean } = {},
): { backupId: string; filePath: string } {
  mkdirSync(backupDir, { recursive: true });
  const now = options.now ?? new Date();
  const dest = join(backupDir, backupFileName(now));
  copyFileSync(databaseFile, dest);

  const bytes = readFileSync(dest);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const backupId = randomUUID();

  db.run(
    `INSERT INTO backups (id, gym_id, file_path, kind, status, created_at, size_bytes, checksum_sha256, completed_at)
     SELECT ?, id, ?, ?, 'healthy', ?, ?, ?, ?
     FROM gyms ORDER BY created_at ASC LIMIT 1`,
    [backupId, dest, options.kind ?? "manual", now.toISOString(), bytes.length, checksum, now.toISOString()],
  );

  if (!options.skipPrune) {
    pruneBackups(backupDir, DEFAULT_BACKUP_RETENTION.daily * 4);
  }
  return { backupId, filePath: dest };
}

export function listBackups(backupDir: string): Array<{
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}> {
  mkdirSync(backupDir, { recursive: true });
  const files = readdirSync(backupDir)
    .filter((name) => name.startsWith("gym-erp-") && name.endsWith(".db"))
    .sort()
    .reverse();
  return files.map((name) => {
    const filePath = join(backupDir, name);
    const stat = statSync(filePath);
    return {
      fileName: name,
      filePath,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  });
}

export interface RestoreResult {
  restoredFrom: string;
  preRestoreBackupPath: string | null;
}

/**
 * Restore the database file from a backup. The caller must close the database
 * connection first; this function only swaps files on disk and returns the path
 * of the safety copy it made of the current database (when one exists).
 */
export function restoreBackup(
  databaseFile: string,
  backupFilePath: string,
  options: { makeSafetyCopy?: boolean } = {},
): RestoreResult {
  const stat = statSync(backupFilePath);
  if (!stat.isFile()) throw new Error("Backup file not found.");

  let preRestoreBackupPath: string | null = null;
  if (options.makeSafetyCopy !== false) {
    try {
      const safetyName = `gym-erp-pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
      const backupDir = join(backupFilePath, "..");
      preRestoreBackupPath = join(backupDir, safetyName);
      copyFileSync(databaseFile, preRestoreBackupPath);
    } catch {
      // Current database may not exist yet on a fresh install — nothing to copy.
      preRestoreBackupPath = null;
    }
  }

  copyFileSync(backupFilePath, databaseFile);
  return { restoredFrom: backupFilePath, preRestoreBackupPath };
}

/** Keep only the newest `keep` backup files, deleting older ones. */
export function pruneBackups(backupDir: string, keep: number): { kept: number; removed: number } {
  mkdirSync(backupDir, { recursive: true });
  const files = readdirSync(backupDir)
    .filter((name) => name.startsWith("gym-erp-") && name.endsWith(".db"))
    .sort()
    .reverse();
  let kept = 0;
  let removed = 0;
  for (const name of files) {
    if (kept < keep) {
      kept += 1;
      continue;
    }
    rmSync(join(backupDir, name));
    removed += 1;
  }
  return { kept, removed };
}

export { DEFAULT_BACKUP_RETENTION };
