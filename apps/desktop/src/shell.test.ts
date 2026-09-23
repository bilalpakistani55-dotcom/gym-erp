import { describe, expect, it } from "vitest";
import { createDesktopShellState, getDesktopShellStatusMessage, navigateDesktopShell } from "./shell.js";

describe("desktop shell", () => {
  it("starts with a default desktop layout and first-run state", () => {
    const state = createDesktopShellState();

    expect(state.activeView).toBe("dashboard");
    expect(state.sidebarOpen).toBe(true);
    expect(state.firstRunComplete).toBe(false);
    expect(state.theme).toBe("light");
  });

  it("switches views and keeps the shell state consistent", () => {
    const state = createDesktopShellState();
    const updated = navigateDesktopShell(state, "members");

    expect(updated.activeView).toBe("members");
    expect(updated.sidebarOpen).toBe(true);
    expect(updated.lastUpdatedAt).toBeTruthy();
  });

  it("presents a user-friendly sync and connectivity message", () => {
    expect(getDesktopShellStatusMessage({ synced: true, offline: false, pendingChanges: 0 })).toBe(
      "All changes are saved on this device and synchronized.",
    );
    expect(getDesktopShellStatusMessage({ synced: false, offline: true, pendingChanges: 7 })).toBe(
      "7 changes waiting to synchronize",
    );
  });
});
