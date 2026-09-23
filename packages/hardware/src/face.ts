import { decryptBytes, encryptBytes } from "@gym-erp/security";
import { createInterface } from "node:readline";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";
import type { DeviceInfo, HardwareStatus } from "./devices.js";

export interface FaceFrame {
  width: number;
  height: number;
  rgba: Uint8Array;
}

export interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  landmarks?: number[][];
}

export interface FaceEmbedding {
  algorithm: string;
  vector: Float32Array;
}

export interface FaceMatchResult {
  memberId: string | null;
  templateId: string | null;
  distance: number;
  confidence: number;
  aboveThreshold: boolean;
}

export interface FaceEngine {
  readonly engineId: string;
  load(): Promise<void>;
  detect(frame: FaceFrame): Promise<FaceDetection[]>;
  embed(frame: FaceFrame, detection: FaceDetection): Promise<FaceEmbedding>;
  getStatus(): Promise<HardwareStatus>;
}

export interface StoredFaceTemplate {
  templateId: string;
  memberId: string;
  algorithm: string;
  encryptedPayload: Buffer;
}

export interface FaceRecognitionProvider {
  enroll(memberId: string, frame: FaceFrame, secret: string): Promise<StoredFaceTemplate>;
  identify(frame: FaceFrame, gallery: StoredFaceTemplate[], secret: string): Promise<FaceMatchResult>;
  disable(templateId: string): Promise<void>;
  delete(templateId: string): Promise<void>;
  setThreshold(distance: number): void;
  getThreshold(): number;
  deviceInfo(): DeviceInfo;
}

function cosineDistance(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

function embeddingToBytes(embedding: FaceEmbedding): Buffer {
  return Buffer.from(embedding.vector.buffer, embedding.vector.byteOffset, embedding.vector.byteLength);
}

function bytesToEmbedding(algorithm: string, bytes: Buffer): FaceEmbedding {
  const copy = Buffer.from(bytes);
  const vector = new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4);
  return { algorithm, vector };
}

/**
 * Development/local engine. Produces a deterministic embedding from the frame
 * so enrollment and matching can be tested without a cloud API.
 * Production will swap this for a local ONNX / TFLite model of the same interface.
 */
export class LocalHashFaceEngine implements FaceEngine {
  readonly engineId = "face.local-hash";
  private loaded = false;

  async load(): Promise<void> {
    this.loaded = true;
  }

  async detect(frame: FaceFrame): Promise<FaceDetection[]> {
    if (frame.width < 32 || frame.height < 32) return [];
    return [{ box: { x: 0, y: 0, width: frame.width, height: frame.height } }];
  }

  async embed(frame: FaceFrame): Promise<FaceEmbedding> {
    const vector = new Float32Array(128);
    const step = Math.max(1, Math.floor(frame.rgba.length / 128));
    for (let i = 0; i < 128; i += 1) {
      let acc = 0;
      for (let j = 0; j < step; j += 1) {
        acc += frame.rgba[i * step + j] ?? 0;
      }
      vector[i] = (acc / (step * 255)) * 2 - 1;
    }
    let mag = 0;
    for (let i = 0; i < vector.length; i += 1) mag += (vector[i] ?? 0) ** 2;
    mag = Math.sqrt(mag) || 1;
    for (let i = 0; i < vector.length; i += 1) vector[i] = (vector[i] ?? 0) / mag;
    return { algorithm: this.engineId, vector };
  }

  async getStatus(): Promise<HardwareStatus> {
    return this.loaded ? "ready" : "disconnected";
  }
}

interface PythonResponse {
  ok: boolean;
  error?: string;
  engineId?: string;
  detections?: FaceDetection[];
  embedding?: number[];
}

export class PythonLocalFaceEngine implements FaceEngine {
  readonly engineId = "face.python-yunet-sface";
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending: Array<{ resolve: (value: PythonResponse) => void; reject: (error: Error) => void }> = [];

  constructor(
    scriptPath = resolve(process.cwd(), "scripts", "face_recognition_service.py"),
    modelDir = resolve(process.cwd(), "models", "face"),
  ) {
    const command = process.env.GYM_ERP_PYTHON ?? "py";
    const args = command === "py" ? ["-3", scriptPath, modelDir] : [scriptPath, modelDir];
    this.process = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    const output = createInterface({ input: this.process.stdout });
    output.on("line", (line) => {
      const item = this.pending.shift();
      if (!item) return;
      try {
        const response = JSON.parse(line) as PythonResponse;
        if (!response.ok) item.reject(new Error(response.error ?? "Python face worker failed."));
        else item.resolve(response);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error("Invalid Python face worker response."));
      }
    });
    this.process.on("error", (error) => this.rejectPending(error));
    this.process.on("exit", (code) => {
      if (code !== 0) this.rejectPending(new Error(`Python face worker exited with code ${code}.`));
    });
  }

  private rejectPending(error: Error): void {
    while (this.pending.length) this.pending.shift()?.reject(error);
  }

  private request(frame: FaceFrame | null, operation: "status" | "embed"): Promise<PythonResponse> {
    return new Promise((resolvePromise, reject) => {
      this.pending.push({ resolve: resolvePromise, reject });
      const request = frame
        ? { operation, width: frame.width, height: frame.height, rgbaBase64: Buffer.from(frame.rgba).toString("base64") }
        : { operation };
      this.process.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  async load(): Promise<void> {
    await this.request(null, "status");
  }

  async detect(frame: FaceFrame): Promise<FaceDetection[]> {
    const response = await this.request(frame, "embed");
    return response.detections ?? [];
  }

  async embed(frame: FaceFrame): Promise<FaceEmbedding> {
    const response = await this.request(frame, "embed");
    if (!response.embedding?.length) throw new Error("The local face model could not create an embedding.");
    return { algorithm: this.engineId, vector: new Float32Array(response.embedding) };
  }

  async getStatus(): Promise<HardwareStatus> {
    try {
      await this.load();
      return "ready";
    } catch {
      return "disconnected";
    }
  }
}

export class LocalFaceRecognitionProvider implements FaceRecognitionProvider {
  private threshold: number;
  private disabled = new Set<string>();

  constructor(
    private readonly engine: FaceEngine,
    threshold = 0.42,
  ) {
    this.threshold = threshold;
  }

  setThreshold(distance: number): void {
    this.threshold = distance;
  }

  getThreshold(): number {
    return this.threshold;
  }

  deviceInfo(): DeviceInfo {
    return {
      adapterId: this.engine.engineId,
      displayName: "Local face recognition",
      vendor: "GYM ERP",
      model: this.engine.engineId,
    };
  }

  async enroll(memberId: string, frame: FaceFrame, secret: string): Promise<StoredFaceTemplate> {
    await this.engine.load();
    const faces = await this.engine.detect(frame);
    const face = faces[0];
    if (!face) {
      throw new Error("No face was found. Ask the member to look at the camera and try again.");
    }
    const embedding = await this.engine.embed(frame, face);
    const templateId = `face-${memberId}-${Date.now()}`;
    const encryptedPayload = encryptBytes(embeddingToBytes(embedding), secret);
    return {
      templateId,
      memberId,
      algorithm: embedding.algorithm,
      encryptedPayload,
    };
  }

  async identify(
    frame: FaceFrame,
    gallery: StoredFaceTemplate[],
    secret: string,
  ): Promise<FaceMatchResult> {
    await this.engine.load();
    const faces = await this.engine.detect(frame);
    const face = faces[0];
    if (!face) {
      return { memberId: null, templateId: null, distance: 1, confidence: 0, aboveThreshold: false };
    }
    const probe = await this.engine.embed(frame, face);
    let best: FaceMatchResult = {
      memberId: null,
      templateId: null,
      distance: 1,
      confidence: 0,
      aboveThreshold: false,
    };
    for (const item of gallery) {
      if (this.disabled.has(item.templateId)) continue;
      const stored = bytesToEmbedding(item.algorithm, decryptBytes(item.encryptedPayload, secret));
      const distance = cosineDistance(probe.vector, stored.vector);
      if (distance < best.distance) {
        const confidence = Math.max(0, Math.min(1, 1 - distance));
        best = {
          memberId: item.memberId,
          templateId: item.templateId,
          distance,
          confidence,
          aboveThreshold: distance <= this.threshold,
        };
      }
    }
    if (!best.aboveThreshold) {
      return { ...best, memberId: null, aboveThreshold: false };
    }
    return best;
  }

  async disable(templateId: string): Promise<void> {
    this.disabled.add(templateId);
  }

  async delete(templateId: string): Promise<void> {
    this.disabled.add(templateId);
  }
}
