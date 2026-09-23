import type { SyncRecordDTO } from "@gym-erp/sync-engine";

export interface MobileStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export class MemoryMobileStorage implements MobileStorage {
  private readonly values = new Map<string, unknown>();

  get<T>(key: string): T | null {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  set<T>(key: string, value: T): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

export interface MobileSyncClientOptions {
  baseUrl: string;
  deviceId: string;
  storage?: MobileStorage;
  fetcher?: typeof fetch;
}

export interface MobileSyncStatus {
  online: boolean;
  pending: number;
  conflicts: number;
  lastSuccessAt: string | null;
  message: string;
}

type QueuedRecord = SyncRecordDTO & { retryCount: number; lastError: string | null };

const QUEUE_KEY = "gym-erp.mobile.sync-queue";
const LAST_SYNC_KEY = "gym-erp.mobile.last-sync";

export class MobileSyncClient {
  private readonly fetcher: typeof fetch;
  private readonly storage: MobileStorage;

  constructor(private readonly options: MobileSyncClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.storage = options.storage ?? new MemoryMobileStorage();
  }

  queue(record: SyncRecordDTO): void {
    const queue = this.readQueue();
    if (!queue.some((item) => item.id === record.id)) {
      queue.push({ ...record, retryCount: 0, lastError: null });
      this.storage.set(QUEUE_KEY, queue);
    }
  }

  pendingCount(): number {
    return this.readQueue().length;
  }

  async synchronize(): Promise<MobileSyncStatus> {
    const queue = this.readQueue();
    let conflicts = 0;
    try {
      if (queue.length > 0) {
        const push = await this.request<{ applied: number; skipped: number; conflicts: number; rejected?: Array<{ syncRecordId: string; reason: string }> }>(
          "/sync/push",
          {
            method: "POST",
            body: JSON.stringify({ records: queue }),
          },
        );
        conflicts = push.conflicts;
        const rejected = new Map((push.rejected ?? []).map((item) => [item.syncRecordId, item.reason]));
        this.storage.set(
          QUEUE_KEY,
          queue
            .filter((item) => rejected.has(item.id))
            .map((item) => ({
              ...item,
              retryCount: item.retryCount + 1,
              lastError: rejected.get(item.id) ?? "Rejected by hub",
            })),
        );
      }

      const since = this.storage.get<string>(LAST_SYNC_KEY) ?? "1970-01-01T00:00:00.000Z";
      const pull = await this.request<{ records: SyncRecordDTO[]; serverTime: string }>(
        `/sync/pull?since=${encodeURIComponent(since)}`,
      );
      this.storage.set(LAST_SYNC_KEY, pull.serverTime);
      return {
        online: true,
        pending: this.pendingCount(),
        conflicts,
        lastSuccessAt: pull.serverTime,
        message: this.pendingCount() === 0 ? "All changes are synchronized." : `${this.pendingCount()} changes are waiting to synchronize.`,
      };
    } catch (error) {
      return {
        online: false,
        pending: this.pendingCount(),
        conflicts,
        lastSuccessAt: this.storage.get<string>(LAST_SYNC_KEY),
        message: error instanceof Error ? error.message : "The desktop hub is unavailable. Changes remain saved on this device.",
      };
    }
  }

  private readQueue(): QueuedRecord[] {
    return this.storage.get<QueuedRecord[]>(QUEUE_KEY) ?? [];
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Gym-Device": this.options.deviceId,
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) throw new Error(body.message ?? `Sync request failed (${response.status}).`);
    return body as T;
  }
}
