// Contract every public anchor implements. The server calls `anchor` from the
// anchor loop; the offline verifier calls `verify` with no AuditKit server involved.
import type { Hex } from "./hash.js";
import type { ProofStep } from "./merkle.js";

export type AnchorKind = "rekor" | "ots";

export interface AnchorReceipt {
  kind: AnchorKind;
  /** Where the entry lives: Rekor log index / entry id, or the OTS calendar URL. */
  ref: string;
  /** Opaque proof bytes (base64). Rekor: entry + inclusion proof + checkpoint. OTS: the .ots file. */
  proof: string;
  /** ISO time the anchor accepted the root. For OTS this is calendar time, Bitcoin time comes later. */
  anchored_at: string;
  /** OTS proofs start pending and upgrade once the Bitcoin block is in. Rekor is final on write. */
  status: "pending" | "final";
}

export type AnchorVerdict =
  | { ok: true; level: "final"; attested_at?: string }
  | { ok: true; level: "pending"; reason: string }
  | { ok: false; reason: string };

export interface Anchor {
  kind: AnchorKind;
  anchor(root: Hex): Promise<AnchorReceipt>;
  /** For pending receipts, try to upgrade. Return the same receipt if still pending. */
  upgrade(receipt: AnchorReceipt): Promise<AnchorReceipt>;
  /**
   * Offline: given only the root and the receipt, is this root really in the public log?
   * `level: "final"` = a signed / consensus-backed proof held (Rekor inclusion + signed checkpoint, OTS Bitcoin block).
   * `level: "pending"` = only a promise held (OTS calendar attestation); it is unsigned and must not count as anchored.
   * `attested_at` is only present when the public log vouches for the time (OTS Bitcoin block time). Rekor gives none.
   */
  verify(root: Hex, receipt: AnchorReceipt): Promise<AnchorVerdict>;
}

/**
 * Export file format: one JSON object per line.
 * Line 1 is a `manifest`; then every event in position order; then roots and anchors.
 * The verifier needs nothing else, in particular no network access to AuditKit.
 */
export type ExportLine =
  | {
      type: "manifest";
      version: 1;
      /** Hostname that produced the export; lets a verifier pick a pinned key without being told. */
      server: string;
      project_id: string;
      tenant_id: string;
      /** The customer's own tenant identifier; part of what client_sig covers. */
      tenant: string;
      /** Requested range, widened to whole Merkle-root batches so every root can be rebuilt. */
      from_position: number;
      to_position: number;
      requested_from: number;
      requested_to: number;
      /** event_hash of the event just before from_position, or GENESIS. */
      prev_hash: Hex;
      server_public_key: string; // base64 Ed25519 SPKI; must match /.well-known/auditkit.json and the pinned key
      /** base64 P-256 SPKI the server signs Rekor entries with; a verifier accepts only Rekor entries by this key. */
      anchor_public_key?: string;
      exported_at: string;
    }
  | {
      type: "event";
      id: string;
      project_id: string;
      tenant_id: string;
      tenant: string;
      position: number;
      occurred_at: string;
      actor: string;
      action: string;
      target: string | null;
      payload_commit: Hex;
      prev_hash: Hex;
      event_hash: Hex;
      server_sig: string; // base64 Ed25519 over event_hash
      client_sig?: string; // base64, customer key, optional
      /** Present unless erased. Verifier recomputes payload_commit when present. */
      payload?: { salt: Hex; data: unknown };
    }
  | {
      type: "root";
      /** Tenant root covering [from_position, to_position]. */
      tenant_root: Hex;
      from_position: number;
      to_position: number;
      /** tenant_root is a leaf of the project tree; project_root is a leaf of the global tree. */
      path_to_project: ProofStep[];
      project_root: Hex;
      path_to_global: ProofStep[];
      global_root: Hex;
      anchors: AnchorReceipt[];
    };
