import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import type { DeviceInfo, HardwareStatus } from "./devices.js";

/**
 * Vendor-neutral fingerprint contract.
 * Attendance does not call this until a real scanner adapter is registered
 * and enabled. A simulator exists so the rest of the ERP can be developed.
 */
export interface FingerprintEnrollResult {
  templateId: string;
  templateBytes: Uint8Array;
}

export interface FingerprintMatchResult {
  memberTemplateId: string | null;
  score: number;
}

export interface FingerprintDeviceAdapter {
  readonly adapterId: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  deviceInfo(): Promise<DeviceInfo>;
  enroll(): Promise<FingerprintEnrollResult>;
  identify(): Promise<FingerprintMatchResult>;
  verify(templateId: string): Promise<FingerprintMatchResult>;
  deleteTemplate(templateId: string): Promise<void>;
  getStatus(): Promise<HardwareStatus>;
}

export class FingerprintNotEnabledError extends Error {
  constructor() {
    super("Fingerprint attendance is not enabled yet. Use face recognition or search.");
    this.name = "FingerprintNotEnabledError";
  }
}

export class UnpluggedFingerprintAdapter implements FingerprintDeviceAdapter {
  readonly adapterId = "fingerprint.unplugged";

  async connect(): Promise<void> {
    throw new FingerprintNotEnabledError();
  }
  async disconnect(): Promise<void> {}
  async deviceInfo(): Promise<DeviceInfo> {
    return {
      adapterId: this.adapterId,
      displayName: "Fingerprint scanner (not connected)",
      vendor: "none",
      model: "pending-sdk",
    };
  }
  async enroll(): Promise<FingerprintEnrollResult> {
    throw new FingerprintNotEnabledError();
  }
  async identify(): Promise<FingerprintMatchResult> {
    throw new FingerprintNotEnabledError();
  }
  async verify(): Promise<FingerprintMatchResult> {
    throw new FingerprintNotEnabledError();
  }
  async deleteTemplate(): Promise<void> {
    throw new FingerprintNotEnabledError();
  }
  async getStatus(): Promise<HardwareStatus> {
    return "unsupported";
  }
}

export class SimulatorFingerprintAdapter implements FingerprintDeviceAdapter {
  readonly adapterId = "fingerprint.simulator";
  private connected = false;
  private templates = new Map<string, Uint8Array>();

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
  async deviceInfo(): Promise<DeviceInfo> {
    return {
      adapterId: this.adapterId,
      displayName: "Fingerprint simulator",
      vendor: "GYM ERP",
      model: "dev-sim",
    };
  }
  async enroll(): Promise<FingerprintEnrollResult> {
    const templateId = `fp-sim-${this.templates.size + 1}`;
    const templateBytes = new Uint8Array([1, 2, 3, 4]);
    this.templates.set(templateId, templateBytes);
    return { templateId, templateBytes };
  }
  async identify(): Promise<FingerprintMatchResult> {
    const first = this.templates.keys().next().value as string | undefined;
    return { memberTemplateId: first ?? null, score: first ? 0.99 : 0 };
  }
  async verify(templateId: string): Promise<FingerprintMatchResult> {
    const found = this.templates.has(templateId);
    return { memberTemplateId: found ? templateId : null, score: found ? 1 : 0 };
  }
  async deleteTemplate(templateId: string): Promise<void> {
    this.templates.delete(templateId);
  }
  async getStatus(): Promise<HardwareStatus> {
    return this.connected ? "ready" : "disconnected";
  }
}

interface BridgeResponse {
  ok: boolean;
  error?: string;
  templateId?: string;
  templateBase64?: string;
  memberTemplateId?: string | null;
  score?: number;
  deviceInfo?: DeviceInfo;
  status?: HardwareStatus;
}

/**
 * Vendor bridge contract: one JSON request and one JSON response per line.
 * This keeps vendor SDKs out of the ERP process while allowing a client-specific
 * bridge executable to be installed later.
 */
export class JsonLineFingerprintAdapter implements FingerprintDeviceAdapter {
  readonly adapterId = "fingerprint.vendor-bridge";
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending: Array<{ resolve: (value: BridgeResponse) => void; reject: (error: Error) => void }> = [];

  constructor(command = process.env.GYM_ERP_FINGERPRINT_COMMAND) {
    if (!command) throw new Error("GYM_ERP_FINGERPRINT_COMMAND is not configured.");
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) ?? [];
    const executable = parts.shift();
    if (!executable) throw new Error("GYM_ERP_FINGERPRINT_COMMAND is empty.");
    this.process = spawn(executable, parts, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    createInterface({ input: this.process.stdout }).on("line", (line) => {
      const item = this.pending.shift();
      if (!item) return;
      try {
        const response = JSON.parse(line) as BridgeResponse;
        if (!response.ok) item.reject(new Error(response.error ?? "Fingerprint bridge failed."));
        else item.resolve(response);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error("Invalid fingerprint bridge response."));
      }
    });
    this.process.on("error", (error) => this.rejectPending(error));
    this.process.on("exit", (code) => {
      if (code !== 0) this.rejectPending(new Error(`Fingerprint bridge exited with code ${code}.`));
    });
  }

  private rejectPending(error: Error): void {
    while (this.pending.length) this.pending.shift()?.reject(error);
  }

  private request(operation: string, payload: Record<string, unknown> = {}): Promise<BridgeResponse> {
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.process.stdin.write(`${JSON.stringify({ operation, ...payload })}\n`);
    });
  }

  async connect(): Promise<void> {
    await this.request("connect");
  }
  async disconnect(): Promise<void> {
    await this.request("disconnect");
    this.process.kill();
  }
  async deviceInfo(): Promise<DeviceInfo> {
    const response = await this.request("deviceInfo");
    return response.deviceInfo ?? {
      adapterId: this.adapterId,
      displayName: "Fingerprint scanner (vendor bridge)",
      vendor: "Configured bridge",
      model: "unknown",
    };
  }
  async enroll(): Promise<FingerprintEnrollResult> {
    const response = await this.request("enroll");
    if (!response.templateId || !response.templateBase64) throw new Error("Fingerprint bridge returned no enrollment template.");
    return { templateId: response.templateId, templateBytes: Buffer.from(response.templateBase64, "base64") };
  }
  async identify(): Promise<FingerprintMatchResult> {
    const response = await this.request("identify");
    return { memberTemplateId: response.memberTemplateId ?? null, score: response.score ?? 0 };
  }
  async verify(templateId: string): Promise<FingerprintMatchResult> {
    const response = await this.request("verify", { templateId });
    return { memberTemplateId: response.memberTemplateId ?? null, score: response.score ?? 0 };
  }
  async deleteTemplate(templateId: string): Promise<void> {
    await this.request("deleteTemplate", { templateId });
  }
  async getStatus(): Promise<HardwareStatus> {
    try {
      const response = await this.request("status");
      return response.status ?? "ready";
    } catch {
      return "error";
    }
  }
}
