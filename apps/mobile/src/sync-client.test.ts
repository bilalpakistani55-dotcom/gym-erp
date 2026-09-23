import { describe, expect, it } from "vitest";
import { MemoryMobileStorage, MobileSyncClient } from "./sync-client.js";

describe("mobile offline sync client", () => {
  it("queues records, pushes them, and advances the pull cursor", async () => {
    const storage = new MemoryMobileStorage();
    const requests: string[] = [];
    const client = new MobileSyncClient({
      baseUrl: "http://hub.test",
      deviceId: "android-1",
      storage,
      fetcher: async (input) => {
        requests.push(String(input));
        if (String(input).includes("/sync/push")) {
          return new Response(JSON.stringify({ applied: 1, skipped: 0, conflicts: 0, rejected: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({ records: [], serverTime: "2026-09-23T00:00:00.000Z" }), { status: 200 });
      },
    });

    client.queue({
      id: "record-1",
      gymId: "gym-1",
      entityType: "members",
      entityId: "member-1",
      operation: "create",
      deviceId: "android-1",
      version: 1,
      payloadJson: "{}",
      timestamp: "2026-09-23T00:00:00.000Z",
    });

    const status = await client.synchronize();
    expect(status.online).toBe(true);
    expect(status.pending).toBe(0);
    expect(requests).toHaveLength(2);
  });

  it("keeps queued changes when the hub is offline", async () => {
    const client = new MobileSyncClient({
      baseUrl: "http://hub.test",
      deviceId: "android-1",
      fetcher: async () => {
        throw new Error("Hub offline");
      },
    });
    client.queue({
      id: "record-1",
      gymId: "gym-1",
      entityType: "members",
      entityId: "member-1",
      operation: "update",
      deviceId: "android-1",
      version: 2,
      payloadJson: "{}",
      timestamp: "2026-09-23T00:00:00.000Z",
    });

    const status = await client.synchronize();
    expect(status.online).toBe(false);
    expect(status.pending).toBe(1);
  });
});
