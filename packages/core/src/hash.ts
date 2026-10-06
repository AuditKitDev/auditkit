import { createHash, randomBytes } from "node:crypto";

export type Hex = string;

export function sha256Hex(data: string | Uint8Array): Hex {
  return createHash("sha256").update(data).digest("hex");
}

export function randomSalt(): Hex {
  return randomBytes(16).toString("hex");
}

export const GENESIS: Hex = "0".repeat(64);
