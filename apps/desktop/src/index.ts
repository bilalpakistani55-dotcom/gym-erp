import { navDesktop } from "@gym-erp/ui";

export type DesktopRuntime = "tauri";

export interface DesktopArchitecture {
  runtime: DesktopRuntime;
  localHub: true;
  localDatabase: "sqlite";
  localFileStorage: true;
  startsLocalSyncService: true;
  supportsWindowsInstaller: true;
  navigation: typeof navDesktop;
}

export const desktopArchitecture: DesktopArchitecture = {
  runtime: "tauri",
  localHub: true,
  localDatabase: "sqlite",
  localFileStorage: true,
  startsLocalSyncService: true,
  supportsWindowsInstaller: true,
  navigation: navDesktop,
};

export const desktopPhaseOrder = [
  "desktop-shell",
  "first-run-setup",
  "auth-rbac",
  "member-management",
  "attendance",
  "payments-expenses",
  "reports-diagnostics",
  "installer-updates",
] as const;
