import { type BadgeTone } from "./components";

export type SyncIndicatorState = "synced" | "offline" | "syncing" | "error" | "pending";
export type MembershipVisualStatus = "active" | "expired" | "suspended" | "pending" | "cancelled";
export type PaymentVisualStatus = "paid" | "partial" | "pending" | "refunded" | "failed";

export type StatusVisual = Readonly<{
  label: string;
  tone: BadgeTone;
  icon: string;
  employeeMessage: string;
}>;

export const syncStatusVisuals = {
  synced: {
    label: "Synced",
    tone: "success",
    icon: "check-circle-2",
    employeeMessage: "All changes are saved on this device and synchronized.",
  },
  offline: {
    label: "Offline",
    tone: "warning",
    icon: "wifi-off",
    employeeMessage: "Changes will stay saved here and synchronize when the connection returns.",
  },
  syncing: {
    label: "Synchronizing",
    tone: "info",
    icon: "refresh-cw",
    employeeMessage: "Recent changes are being synchronized.",
  },
  error: {
    label: "Sync error",
    tone: "danger",
    icon: "circle-alert",
    employeeMessage: "Your data is saved locally. GYM ERP will retry synchronization automatically.",
  },
  pending: {
    label: "Pending",
    tone: "accent",
    icon: "clock",
    employeeMessage: "Changes are waiting to synchronize.",
  },
} as const satisfies Record<SyncIndicatorState, StatusVisual>;

export const membershipStatusVisuals = {
  active: { label: "Active", tone: "success", icon: "check-circle-2", employeeMessage: "Membership is active." },
  expired: { label: "Expired", tone: "warning", icon: "calendar-x", employeeMessage: "Membership has expired." },
  suspended: { label: "Suspended", tone: "danger", icon: "pause-circle", employeeMessage: "Membership is suspended." },
  pending: { label: "Pending", tone: "info", icon: "clock", employeeMessage: "Membership is pending." },
  cancelled: { label: "Cancelled", tone: "neutral", icon: "x-circle", employeeMessage: "Membership is cancelled." },
} as const satisfies Record<MembershipVisualStatus, StatusVisual>;

export const paymentStatusVisuals = {
  paid: { label: "Paid", tone: "success", icon: "check-circle-2", employeeMessage: "Payment is complete." },
  partial: { label: "Partial", tone: "warning", icon: "circle-dollar-sign", employeeMessage: "Payment is partially complete." },
  pending: { label: "Pending", tone: "info", icon: "clock", employeeMessage: "Payment is pending." },
  refunded: { label: "Refunded", tone: "neutral", icon: "undo-2", employeeMessage: "Payment has been refunded." },
  failed: { label: "Failed", tone: "danger", icon: "circle-alert", employeeMessage: "Payment could not be completed." },
} as const satisfies Record<PaymentVisualStatus, StatusVisual>;

export function formatPendingSyncMessage(pendingChanges: number): string {
  if (pendingChanges <= 0) {
    return syncStatusVisuals.synced.employeeMessage;
  }

  return `${pendingChanges} ${pendingChanges === 1 ? "change" : "changes"} waiting to synchronize`;
}
