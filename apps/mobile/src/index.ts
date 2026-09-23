import { navMobile } from "@gym-erp/ui";

export type MobileRuntime = "react-native";

export interface MobileArchitecture {
  runtime: MobileRuntime;
  targetPlatform: "android";
  localDatabase: "sqlite";
  secureStorage: true;
  cameraCapture: true;
  offlineQueue: true;
  backgroundSync: "best-effort";
  navigation: typeof navMobile;
}

export const mobileArchitecture: MobileArchitecture = {
  runtime: "react-native",
  targetPlatform: "android",
  localDatabase: "sqlite",
  secureStorage: true,
  cameraCapture: true,
  offlineQueue: true,
  backgroundSync: "best-effort",
  navigation: navMobile,
};

export const criticalMobileWorkflows = [
  "add-member-with-photo",
  "renew-membership",
  "record-payment",
  "record-attendance",
  "capture-expense",
  "sync-with-desktop-hub",
] as const;

export * from "./sync-client.js";
