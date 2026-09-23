import { describe, expect, it } from "vitest";
import { can, permissionsFor } from "./rbac.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { decryptBytes, encryptBytes } from "./crypto.js";

describe("security", () => {
  it("never stores a plaintext password", async () => {
    const hash = await hashPassword("GymOwner!2026");
    expect(hash).not.toContain("GymOwner!2026");
    expect(await verifyPassword("GymOwner!2026", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("enforces least-privilege roles", () => {
    expect(can("staff", "payments.write")).toBe(false);
    expect(can("receptionist", "backups.manage")).toBe(false);
    expect(can("admin", "biometrics.manage")).toBe(true);
    expect(permissionsFor("manager")).not.toContain("demo.load");
  });

  it("round-trips encrypted biometric payloads", () => {
    const secret = "local-device-secret";
    const original = Buffer.from("face-embedding-bytes");
    const sealed = encryptBytes(original, secret);
    expect(sealed.equals(original)).toBe(false);
    expect(decryptBytes(sealed, secret).equals(original)).toBe(true);
  });
});
