import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_DATA_FOLDER, PATHS } from "@gym-erp/shared-types";

export function gymErpRoot(baseDir: string): string {
  return join(baseDir, APP_DATA_FOLDER);
}

export function ensureDataLayout(root: string): {
  root: string;
  databaseFile: string;
} {
  const databaseFile = join(root, PATHS.database);
  mkdirSync(dirname(databaseFile), { recursive: true });
  mkdirSync(join(root, PATHS.members), { recursive: true });
  mkdirSync(join(root, PATHS.documents), { recursive: true });
  mkdirSync(join(root, PATHS.receipts), { recursive: true });
  mkdirSync(join(root, PATHS.backups), { recursive: true });
  mkdirSync(join(root, PATHS.biometrics), { recursive: true });
  mkdirSync(join(root, PATHS.logs), { recursive: true });
  return { root, databaseFile };
}

export function memberPhotoDir(root: string, memberCode: string): string {
  return join(root, PATHS.members, memberCode);
}
