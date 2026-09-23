import { describe, expect, it } from "vitest";
import { LocalFaceRecognitionProvider, LocalHashFaceEngine } from "./face.js";
import { createDefaultHardwareRegistry } from "./registry.js";
import { FingerprintNotEnabledError } from "./fingerprint.js";

function frameFromSeed(seed: number): { width: number; height: number; rgba: Uint8Array } {
  const rgba = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < rgba.length; i += 1) rgba[i] = (seed * 17 + i) % 256;
  return { width: 64, height: 64, rgba };
}

describe("face recognition (active biometric)", () => {
  it("enrolls and matches the same local frame above threshold", async () => {
    const provider = new LocalFaceRecognitionProvider(new LocalHashFaceEngine(), 0.15);
    const secret = "test-secret";
    const frame = frameFromSeed(9);
    const stored = await provider.enroll("member-1", frame, secret);
    const match = await provider.identify(frame, [stored], secret);
    expect(match.memberId).toBe("member-1");
    expect(match.aboveThreshold).toBe(true);
  });

  it("does not match a clearly different frame", async () => {
    const provider = new LocalFaceRecognitionProvider(new LocalHashFaceEngine(), 0.05);
    const secret = "test-secret";
    const stored = await provider.enroll("member-1", frameFromSeed(1), secret);
    const match = await provider.identify(frameFromSeed(200), [stored], secret);
    expect(match.memberId).toBeNull();
    expect(match.aboveThreshold).toBe(false);
  });
});

describe("fingerprint hardware (inactive until SDK)", () => {
  it("defaults to face and leaves fingerprint unplugged", async () => {
    const registry = createDefaultHardwareRegistry();
    expect(registry.activeAttendanceBiometric).toBe("face");
    await expect(registry.fingerprint.connect()).rejects.toBeInstanceOf(FingerprintNotEnabledError);
    expect(await registry.fingerprint.getStatus()).toBe("unsupported");
  });
});
