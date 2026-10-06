// Default anchor registry for the verifier. Each entry verifies a receipt with
// nothing but the root and the receipt; `online` adds a live cross-check
// (Rekor: entry/checkpoint re-fetch; OTS: Bitcoin block header from a public explorer).
import type { Anchor, AnchorKind, AnchorReceipt, Hex } from "@auditkit/core";
import { RekorAnchor } from "@auditkit/anchor-rekor";
import { OtsAnchor } from "@auditkit/anchor-ots";
import { createPublicKey } from "node:crypto";

export type AnchorRegistry = Partial<Record<AnchorKind, Anchor>>;

/**
 * `anchorPublicKey` (base64 P-256 SPKI from the manifest or a pin) binds Rekor receipts to the server
 * that claims them: Rekor is a public log, so without it anyone could write an entry for a forged root.
 */
export function defaultAnchors(online: boolean, anchorPublicKey?: string): AnchorRegistry {
  const rekor = new RekorAnchor(anchorPublicKey ? { publicKey: createPublicKey({ key: Buffer.from(anchorPublicKey, "base64"), format: "der", type: "spki" }) } : {});
  return {
    rekor: {
      kind: "rekor",
      anchor: (root: Hex) => rekor.anchor(root),
      upgrade: (r: AnchorReceipt) => rekor.upgrade(r),
      verify: (root: Hex, r: AnchorReceipt) => rekor.verify(root, r, { online }),
    },
    ots: new OtsAnchor({ online }),
  };
}
