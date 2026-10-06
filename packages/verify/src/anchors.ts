// Default anchor registry for the verifier. Each entry verifies a receipt with
// nothing but the root and the receipt; `online` adds a live cross-check
// (Rekor: entry/checkpoint re-fetch; OTS: Bitcoin block header from a public explorer).
import type { Anchor, AnchorKind, AnchorReceipt, Hex } from "@auditkit/core";
import { RekorAnchor } from "@auditkit/anchor-rekor";
import { OtsAnchor } from "@auditkit/anchor-ots";

export type AnchorRegistry = Partial<Record<AnchorKind, Anchor>>;

export function defaultAnchors(online: boolean): AnchorRegistry {
  const rekor = new RekorAnchor();
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
