import type { DesktopNavId } from "@gym-erp/ui";

export type DesktopThemeMode = "light" | "dark";

export type DesktopShellState = Readonly<{
  activeView: DesktopNavId;
  sidebarOpen: boolean;
  firstRunComplete: boolean;
  theme: DesktopThemeMode;
  lastUpdatedAt: string;
}>;

export type DesktopSyncStatus = Readonly<{
  synced: boolean;
  offline: boolean;
  pendingChanges: number;
}>;

export function createDesktopShellState(): DesktopShellState {
  return {
    activeView: "dashboard",
    sidebarOpen: true,
    firstRunComplete: false,
    theme: "light",
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function navigateDesktopShell(
  state: DesktopShellState,
  nextView: DesktopNavId,
): DesktopShellState {
  return {
    ...state,
    activeView: nextView,
    sidebarOpen: true,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function getDesktopShellStatusMessage(status: DesktopSyncStatus): string {
  if (status.synced || (!status.offline && status.pendingChanges === 0)) {
    return "All changes are saved on this device and synchronized.";
  }

  if (status.pendingChanges > 0) {
    return `${status.pendingChanges} change${status.pendingChanges === 1 ? "" : "s"} waiting to synchronize`;
  }

  return "Offline — changes will sync when connection is restored.";
}
