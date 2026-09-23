import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { OpenDatabaseOptions, SqlDatabase } from "./sql-database.js";

export class NodeSqliteDatabase implements SqlDatabase {
  private readonly db: DatabaseSync;

  constructor(options: OpenDatabaseOptions) {
    this.db = new DatabaseSync(options.filePath, { readOnly: options.readOnly ?? false });
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params: unknown[] = []): void {
    this.db.prepare(sql).run(...(params as SQLInputValue[]));
  }

  get<T>(sql: string, params: unknown[] = []): T | undefined {
    const row = this.db.prepare(sql).get(...(params as SQLInputValue[]));
    return row as T | undefined;
  }

  all<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
  }

  transaction<T>(fn: () => T): T {
    this.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.exec("COMMIT");
      return result;
    } catch (error) {
      this.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
