import { readFileSync } from "node:fs";
import type { AnchorReceipt } from "@auditkit/core";

export interface LiveFixture {
  root: string;
  publicKeyPem: string;
  receipt: AnchorReceipt;
}

/** Real entries written to the public logs on 2026-10-05 (see fixtures/*.json). */
export function loadFixture(api: 1 | 2): LiveFixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/live-v${api}.json`, import.meta.url), "utf8")) as LiveFixture;
}
