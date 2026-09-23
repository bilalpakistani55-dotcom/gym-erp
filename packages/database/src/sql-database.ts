export interface SqlDatabase {
  exec(sql: string): void;
  run(sql: string, params?: unknown[]): void;
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
  transaction<T>(fn: () => T): T;
  close(): void;
}

export interface OpenDatabaseOptions {
  filePath: string;
  readOnly?: boolean;
}
