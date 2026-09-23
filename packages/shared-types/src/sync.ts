import type { SyncOperation, SyncStatus } from "./domain.js";

export interface SyncRecord {
  id: string;
  gymId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  deviceId: string;
  version: number;
  payloadJson: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  status: SyncStatus;
  retryCount: number;
  errorMessage: string | null;
}

export interface SyncConflict {
  id: string;
  gymId: string;
  entityType: string;
  entityId: string;
  localVersion: number;
  remoteVersion: number;
  localPayloadJson: string;
  remotePayloadJson: string;
  localDeviceId: string;
  remoteDeviceId: string;
  resolved: boolean;
  resolution: "local" | "remote" | "merged" | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
}

export interface SyncHealth {
  pendingCount: number;
  errorCount: number;
  conflictCount: number;
  lastSuccessfulSyncAt: string | null;
  indicator: "synced" | "offline" | "synchronizing" | "error";
  userMessage: string;
}
