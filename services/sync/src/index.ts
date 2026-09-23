import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { DEFAULT_SYNC_PORT } from "@gym-erp/shared-types";
import type { SqlDatabase } from "@gym-erp/database";
import { applyIncomingRecords, countSyncItemsByStatus, pullRecordsSince, type SyncRecordDTO } from "@gym-erp/sync-engine";

export interface HubServer {
  port: number;
  close(): Promise<void>;
}

export interface SyncStatusResponse {
  online: boolean;
  pending: number;
  inProgress: number;
  synced: boolean;
  lastSuccessAt: string | null;
}

export interface HealthResponse {
  ok: boolean;
  product: string;
  role: "local-hub";
  version: string;
  databasePath: string;
}

export interface SyncCounts {
  pending: number;
  inProgress: number;
  synced: number;
  error: number;
  conflict: number;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage, maxBytes = 5 * 1024 * 1024): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new Error("Request body is too large.");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export interface HubServerOptions {
  /** Reject pushes/pulls from devices that are not registered in the devices table. */
  requireRegisteredDevice?: boolean;
}

export function startLocalHubServer(
  db: SqlDatabase,
  port = DEFAULT_SYNC_PORT,
  options: HubServerOptions = {},
): Promise<HubServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void handleRequest(req, res).catch((error) => {
      json(res, 500, { message: error instanceof Error ? error.message : "Hub error" });
    });
  });

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,HEAD",
        "Access-Control-Allow-Headers": "Content-Type, X-Gym-Device",
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const deviceId = req.headers["x-gym-device"];

    if (url.pathname === "/health") {
      const health: HealthResponse = {
        ok: true,
        product: "GYM ERP",
        role: "local-hub",
        version: "1.0.0",
        databasePath: "local-sqlite",
      };
      json(res, 200, health);
      return;
    }

    if (url.pathname === "/sync/status") {
      const counts = countSyncItemsByStatus(db);
      const status: SyncStatusResponse = {
        online: true,
        pending: counts.pending,
        inProgress: counts.inProgress,
        synced: counts.synced > 0 && counts.pending === 0,
        lastSuccessAt: new Date().toISOString(),
      };
      json(res, 200, status);
      return;
    }

    if (url.pathname === "/sync/counts" && req.method === "GET") {
      json(res, 200, countSyncItemsByStatus(db));
      return;
    }

    // Device enrollment: a mobile client registers once, then sends its id.
    if (url.pathname === "/devices/register" && req.method === "POST") {
      const body = (await readJsonBody(req)) as { name?: string; platform?: string; gymId?: string };
      const id = randomUUID();
      const ts = new Date().toISOString();
      const gymId = body.gymId ?? db.get<{ id: string }>(`SELECT id FROM gyms LIMIT 1`)?.id;
      if (!gymId) {
        json(res, 409, { message: "Hub is not set up yet. Complete setup on the desktop first." });
        return;
      }
      db.run(
        `INSERT INTO devices (id, gym_id, name, platform, is_hub, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [id, gymId, body.name ?? "Mobile device", body.platform === "desktop" ? "desktop" : "android", ts, ts],
      );
      json(res, 200, { deviceId: id, gymId });
      return;
    }

    if (typeof deviceId !== "string" || deviceId.length === 0) {
      json(res, 401, { message: "Missing X-Gym-Device header." });
      return;
    }
    if (options.requireRegisteredDevice) {
      const known = db.get<{ id: string }>(`SELECT id FROM devices WHERE id = ?`, [deviceId]);
      if (!known) {
        json(res, 401, { message: "Unknown device. Register first via /devices/register." });
        return;
      }
    }
    db.run(`UPDATE devices SET last_seen_at = ? WHERE id = ?`, [new Date().toISOString(), deviceId]);

    if (url.pathname === "/sync/push" && req.method === "POST") {
      const body = (await readJsonBody(req)) as { records?: SyncRecordDTO[] };
      const records = Array.isArray(body.records) ? body.records : [];
      if (records.length === 0) {
        json(res, 200, { accepted: [], rejected: [] });
        return;
      }
      const result = applyIncomingRecords(db, records);
      json(res, 200, result);
      return;
    }

    if (url.pathname === "/sync/pull" && req.method === "GET") {
      const since = url.searchParams.get("since") ?? "1970-01-01T00:00:00.000Z";
      const result = pullRecordsSince(db, { since, excludeDeviceId: deviceId });
      json(res, 200, result);
      return;
    }

    if (url.pathname === "/sync/ack" && req.method === "POST") {
      json(res, 200, { ok: true });
      return;
    }

    json(res, 404, { message: "Endpoint not found" });
  }

  return new Promise((resolve, reject) => {
    server.listen(port, "0.0.0.0", () => {
      resolve({
        port,
        close: () =>
          new Promise((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
    server.on("error", reject);
  });
}

export interface HubClient {
  getStatus(): Promise<SyncStatusResponse>;
  getCounts(): Promise<SyncCounts>;
  register(input: { name: string; platform: "desktop" | "android" }): Promise<{ deviceId: string; gymId: string }>;
  push(records: SyncRecordDTO[]): Promise<{ applied: number; skipped: number; conflicts: number }>;
  pull(since: string): Promise<{ records: SyncRecordDTO[]; serverTime: string }>;
}

export function createSyncClient(baseUrl: string, deviceId?: string): HubClient {
  const headers: Record<string, string> = deviceId ? { "X-Gym-Device": deviceId } : {};
  return {
    async getStatus(): Promise<SyncStatusResponse> {
      const res = await fetch(`${baseUrl}/sync/status`);
      if (!res.ok) throw new Error("Failed to get sync status");
      return res.json() as Promise<SyncStatusResponse>;
    },
    async getCounts(): Promise<SyncCounts> {
      const res = await fetch(`${baseUrl}/sync/counts`);
      if (!res.ok) throw new Error("Failed to get sync counts");
      return res.json() as Promise<SyncCounts>;
    },
    async register(input): Promise<{ deviceId: string; gymId: string }> {
      const res = await fetch(`${baseUrl}/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { message?: string }).message ?? "Registration failed");
      return res.json() as Promise<{ deviceId: string; gymId: string }>;
    },
    async push(records): Promise<{ applied: number; skipped: number; conflicts: number }> {
      const res = await fetch(`${baseUrl}/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ records }),
      });
      if (!res.ok) throw new Error("Push failed");
      return res.json() as Promise<{ applied: number; skipped: number; conflicts: number }>;
    },
    async pull(since): Promise<{ records: SyncRecordDTO[]; serverTime: string }> {
      const res = await fetch(`${baseUrl}/sync/pull?since=${encodeURIComponent(since)}`, { headers });
      if (!res.ok) throw new Error("Pull failed");
      return res.json() as Promise<{ records: SyncRecordDTO[]; serverTime: string }>;
    },
  };
}

/** Backwards-compatible status-only client. */
export function createSyncStatusClient(baseUrl: string): Pick<HubClient, "getStatus" | "getCounts"> {
  const client = createSyncClient(baseUrl);
  return { getStatus: () => client.getStatus(), getCounts: () => client.getCounts() };
}
