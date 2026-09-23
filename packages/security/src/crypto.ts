import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";

export function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32);
}

export function encryptBytes(plain: Buffer, secret: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(secret, salt);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]);
}

export function decryptBytes(payload: Buffer, secret: string): Buffer {
  const salt = payload.subarray(0, 16);
  const iv = payload.subarray(16, 28);
  const tag = payload.subarray(28, 44);
  const encrypted = payload.subarray(44);
  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
