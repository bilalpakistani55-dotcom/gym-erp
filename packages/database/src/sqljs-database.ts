import { existsSync, readFileSync, writeFileSync } from "node:fs";
import initSqlJs, { type Database as SqlJsDb } from "sql.js";
import type { OpenDatabaseOptions, SqlDatabase } from "./sql-database.js";

export class SqlJsDatabase implements SqlDatabase {
  private transactionDepth = 0;

  private constructor(
    private readonly db: SqlJsDb,
    private readonly filePath: string,
  ) {}

  static async open(options: OpenDatabaseOptions): Promise<SqlJsDatabase> {
    const SQL = await initSqlJs();
    const file = options.filePath === ":memory:" ? null : options.filePath;
    const db = file && existsSync(file) ? new SQL.Database(readFileSync(file)) : new SQL.Database();
    const instance = new SqlJsDatabase(db, options.filePath);
    instance.exec("PRAGMA foreign_keys = ON;");
    return instance;
  }

  exec(sql: string): void {
    this.db.exec(sql);
    this.persist();
  }

  run(sql: string, params: unknown[] = []): void {
    this.db.run(sql, params as never);
    this.persist();
  }

  get<T>(sql: string, params: unknown[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    stmt.bind(params as never);
    const row = stmt.step() ? (stmt.getAsObject() as T) : undefined;
    stmt.free();
    return row;
  }

  all<T>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params as never);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  }

  transaction<T>(fn: () => T): T {
    this.db.run("BEGIN IMMEDIATE");
    this.transactionDepth += 1;
    try {
      const result = fn();
      this.db.run("COMMIT");
      this.transactionDepth -= 1;
      this.persist();
      return result;
    } catch (error) {
      try {
        this.db.run("ROLLBACK");
      } catch {
        // SQL.js may auto-close a transaction after a failed multi-statement exec.
      }
      this.transactionDepth -= 1;
      throw error;
    }
  }

  persist(): void {
    if (this.transactionDepth > 0) return;
    if (this.filePath === ":memory:") return;
    writeFileSync(this.filePath, Buffer.from(this.db.export()));
  }

  close(): void {
    this.persist();
    this.db.close();
  }
}
