import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SqlJsDatabase } from "@gym-erp/database";
import { hashPassword } from "@gym-erp/security";
import { loginUser, validateSession } from "./auth.js";

describe("authentication and RBAC", () => {
  it("logs a user in with a valid password and creates a session token", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-auth-"));
    const db = await SqlJsDatabase.open({ filePath: join(dir, "gym.db") });
    try {
      db.exec(`
        CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE gyms (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, currency_code TEXT NOT NULL DEFAULT 'PKR', timezone TEXT NOT NULL DEFAULT 'Asia/Karachi', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          gym_id TEXT NOT NULL REFERENCES gyms(id),
          organization_id TEXT NOT NULL REFERENCES organizations(id),
          full_name TEXT NOT NULL,
          username TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          last_login_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          UNIQUE (gym_id, username)
        );
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          gym_id TEXT NOT NULL,
          device_id TEXT,
          token_hash TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      const ts = new Date().toISOString();
      const orgId = "org-1";
      const gymId = "gym-1";
      db.run("INSERT INTO organizations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)", [orgId, "Test Gym", ts, ts]);
      db.run("INSERT INTO gyms (id, organization_id, name, currency_code, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [gymId, orgId, "Test Gym", "PKR", "Asia/Karachi", ts, ts]);
      const passwordHash = await hashPassword("GymOwner!2026");
      db.run("INSERT INTO users (id, gym_id, organization_id, full_name, username, email, phone, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'admin', 1, ?, ?)", ["user-1", gymId, orgId, "Owner", "owner", passwordHash, ts, ts]);

      const result = await loginUser(db, { gymId, username: "owner", password: "GymOwner!2026", deviceId: "desktop-1" });

      expect(result).not.toBeNull();
      expect(result?.user.username).toBe("owner");
      expect(result?.sessionToken.length).toBeGreaterThan(20);
      expect(validateSession(db, result!.sessionToken)).not.toBeNull();
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects invalid credentials and blocks permissionless roles", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-erp-auth-"));
    const db = await SqlJsDatabase.open({ filePath: join(dir, "gym.db") });
    try {
      db.exec(`
        CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE gyms (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, currency_code TEXT NOT NULL DEFAULT 'PKR', timezone TEXT NOT NULL DEFAULT 'Asia/Karachi', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          gym_id TEXT NOT NULL REFERENCES gyms(id),
          organization_id TEXT NOT NULL REFERENCES organizations(id),
          full_name TEXT NOT NULL,
          username TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          last_login_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          UNIQUE (gym_id, username)
        );
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          gym_id TEXT NOT NULL,
          device_id TEXT,
          token_hash TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      const ts = new Date().toISOString();
      db.run("INSERT INTO organizations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)", ["org-1", "Test", ts, ts]);
      db.run("INSERT INTO gyms (id, organization_id, name, currency_code, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", ["gym-1", "org-1", "Test", "PKR", "Asia/Karachi", ts, ts]);
      const hash = await hashPassword("StrongPass!1");
      db.run("INSERT INTO users (id, gym_id, organization_id, full_name, username, email, phone, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'staff', 1, ?, ?)", ["user-2", "gym-1", "org-1", "Staff user", "staff", hash, ts, ts]);

      await expect(loginUser(db, { gymId: "gym-1", username: "staff", password: "wrong", deviceId: "mobile-1" })).resolves.toBeNull();
      const result = await loginUser(db, { gymId: "gym-1", username: "staff", password: "StrongPass!1", deviceId: "mobile-1" });
      expect(result?.permissions).not.toContain("payments.write");
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
