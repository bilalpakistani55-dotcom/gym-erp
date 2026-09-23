import { describe, expect, it } from "vitest";
import { createSyncRecord, resolveIncoming, shouldRetry, markSyncFailure, syncIndicator } from "./index.js";

function rec(partial: Partial<Parameters<typeof createSyncRecord>[0]> & { id: string; version: number }) {
  return createSyncRecord({
    gymId: "gym-1",
    entityType: "members",
    entityId: "m-1",
    operation: "update",
    deviceId: "phone",
    payload: { name: partial.id },
    ...partial,
  });
}

describe("sync engine", () => {
  it("keeps failed items in the retry queue", () => {
    const failed = markSyncFailure(rec({ id: "s1", version: 1 }), "network");
    expect(failed.status).toBe("error");
    expect(shouldRetry(failed)).toBe(true);
  });

  it("does not silently overwrite member conflicts", () => {
    const local = rec({ id: "s1", version: 3, deviceId: "pc", payload: { name: "A" } });
    const remote = rec({ id: "s2", version: 3, deviceId: "phone", payload: { name: "B" } });
    const decision = resolveIncoming(local, remote);
    expect(decision.kind).toBe("needs-admin");
  });

  it("explains pending work without technical wording", () => {
    const ui = syncIndicator({
      pending: 7,
      errors: 0,
      conflicts: 0,
      online: false,
      inFlight: false,
      lastSuccessAt: null,
    });
    expect(ui.userMessage).toBe("7 changes waiting to synchronize");
  });
});
