import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlDatabase } from "./sql-database.js";

const here = dirname(fileURLToPath(import.meta.url));

export function defaultMigrationsDir(): string {
  return join(here, "..", "migrations");
}

export function applyMigrations(db: SqlDatabase, migrationsDir = defaultMigrationsDir()): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const applied: string[] = [];
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const existing = db.get<{ version: string }>(
      "SELECT version FROM schema_migrations WHERE version = ?",
      [version],
    );
    if (existing) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [
        version,
        new Date().toISOString(),
      ]);
    });
    applied.push(version);
  }
  return applied;
}

export function listAppliedMigrations(db: SqlDatabase): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  return db
    .all<{ version: string }>("SELECT version FROM schema_migrations ORDER BY version")
    .map((row) => row.version);
}
