import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { applyMigrations, listAppliedMigrations } from "./migrate.js";
import { SqlJsDatabase } from "./sqljs-database.js";

function parseDatabasePath(argv: string[]): string {
  const flagIndex = argv.findIndex((arg) => arg === "--db" || arg === "--database");
  const value = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;

  return resolve(value ?? process.env.GYM_ERP_DB_PATH ?? "GymERP/data/database/gym.db");
}

async function main(): Promise<void> {
  const databasePath = parseDatabasePath(process.argv.slice(2));
  mkdirSync(dirname(databasePath), { recursive: true });

  const db = await SqlJsDatabase.open({ filePath: databasePath });
  try {
    const applied = applyMigrations(db);
    const all = listAppliedMigrations(db);
    const appliedText = applied.length > 0 ? applied.join(", ") : "none";
    console.log(`GYM ERP database: ${databasePath}`);
    console.log(`Applied migrations: ${appliedText}`);
    console.log(`Current schema version: ${all.at(-1) ?? "none"}`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown migration error";
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
});
