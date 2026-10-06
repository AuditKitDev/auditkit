import { randomBytes } from "node:crypto";
import type { Anchor, AnchorReceipt, Hex } from "@auditkit/core";
import { CalendarError, RemoteCalendar, urlInWhitelist, type FetchLike } from "./calendar.js";
import {
  OpTag,
  addOp,
  allAttestations,
  bytesEqual,
  hexToBytes,
  mergeTimestamp,
  parseDetached,
  serializeDetached,
  type Timestamp,
} from "./ots.js";

/**
 * Public aggregators, as listed in opentimestamps-client (otsclient/cmds.py) and
 * javascript-opentimestamps (src/calendar.js DEFAULT_AGGREGATORS), fetched 2026-10-05.
 */
export const DEFAULT_CALENDARS: readonly string[] = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
  "https://ots.btc.catallaxy.com",
];

/** Calendars an upgrade may contact, from the same sources (DEFAULT_CALENDAR_WHITELIST). */
export const DEFAULT_CALENDAR_WHITELIST: readonly string[] = [
  "https://*.calendar.opentimestamps.org",
  "https://*.calendar.eternitywall.com",
  "https://*.calendar.catallaxy.com",
];

export interface BlockHeader {
  /** Merkle root as block explorers print it (big-endian hex, 64 chars). */
  merkleroot: string;
  /** Block time, unix seconds. Used for `attested_at` when present. */
  time?: number;
}

export type GetBlockHeader = (height: number) => Promise<BlockHeader>;

export interface OtsAnchorOptions {
  /** Aggregators to stamp with. */
  calendars?: string[];
  /** Calendar URL globs `upgrade` may contact, in addition to `calendars`. */
  whitelist?: string[];
  /** How many calendars must accept the digest for `anchor` to succeed. Default 1. */
  minCalendars?: number;
  /** Allow `verify` to fetch Bitcoin block headers from a public explorer when no `getBlockHeader` is given. Default false. */
  online?: boolean;
  /** Bitcoin block header source for `verify`. Takes precedence over `online`. */
  getBlockHeader?: GetBlockHeader;
  fetch?: FetchLike;
  timeoutMs?: number;
}

export type OtsVerifyResult =
  | { ok: true; level: "bitcoin"; attested_at: string; block_height: number }
  | {
      ok: true;
      level: "calendar";
      attested_at: string;
      calendars: string[];
      /** Bitcoin attestations present in the proof that were not checked (no block header source). */
      unchecked_bitcoin_heights: number[];
    }
  | { ok: false; reason: string };

const ESPLORA_BASES = ["https://mempool.space/api", "https://blockstream.info/api"];

/** Default online header source: Esplora-compatible public explorers, first one that answers wins. */
export function esploraBlockHeader(fetchFn: FetchLike = fetch, timeoutMs = 10_000): GetBlockHeader {
  return async (height) => {
    let lastErr: unknown;
    for (const base of ESPLORA_BASES) {
      try {
        const get = (url: string) => fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
        const hashRes = await get(`${base}/block-height/${height}`);
        if (!hashRes.ok) throw new Error(`HTTP ${hashRes.status} for block-height/${height}`);
        const hash = (await hashRes.text()).trim();
        const blockRes = await get(`${base}/block/${hash}`);
        if (!blockRes.ok) throw new Error(`HTTP ${blockRes.status} for block/${hash}`);
        const j = (await blockRes.json()) as { merkle_root?: unknown; timestamp?: unknown };
        if (typeof j.merkle_root !== "string") throw new Error("response has no merkle_root");
        return typeof j.timestamp === "number" ? { merkleroot: j.merkle_root, time: j.timestamp } : { merkleroot: j.merkle_root };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  };
}

export class OtsAnchor implements Anchor {
  readonly kind = "ots" as const;
  private readonly calendars: string[];
  private readonly whitelist: string[];
  private readonly minCalendars: number;
  private readonly getBlockHeader: GetBlockHeader | undefined;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(opts: OtsAnchorOptions = {}) {
    this.calendars = opts.calendars ?? [...DEFAULT_CALENDARS];
    if (this.calendars.length === 0) throw new Error("OtsAnchor needs at least one calendar");
    this.whitelist = [...(opts.whitelist ?? DEFAULT_CALENDAR_WHITELIST), ...this.calendars];
    this.minCalendars = opts.minCalendars ?? 1;
    this.fetchFn = opts.fetch ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.getBlockHeader = opts.getBlockHeader ?? (opts.online ? esploraBlockHeader(this.fetchFn, this.timeoutMs) : undefined);
  }

  private calendar(url: string): RemoteCalendar {
    return new RemoteCalendar(url, this.fetchFn, this.timeoutMs);
  }

  async anchor(root: Hex): Promise<AnchorReceipt> {
    const digest = parseRoot(root);
    const file: Timestamp = { msg: digest, attestations: [], ops: [] };
    // Nonce so the calendars never see the root itself, as the reference client does.
    const tip = addOp(addOp(file, { tag: OpTag.APPEND, arg: Uint8Array.from(randomBytes(16)) }), { tag: OpTag.SHA256 });

    const results = await Promise.allSettled(this.calendars.map((url) => this.calendar(url).submit(tip.msg)));
    const accepted: string[] = [];
    const failures: string[] = [];
    results.forEach((r, i) => {
      const url = this.calendars[i]!;
      if (r.status === "fulfilled") {
        mergeTimestamp(tip, r.value);
        accepted.push(url);
      } else {
        failures.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      }
    });
    if (accepted.length < this.minCalendars) {
      throw new Error(`only ${accepted.length}/${this.minCalendars} calendars accepted the digest: ${failures.join("; ")}`);
    }
    return {
      kind: "ots",
      ref: accepted.join(","),
      proof: Buffer.from(serializeDetached({ hashOpTag: OpTag.SHA256, digest, timestamp: file })).toString("base64"),
      anchored_at: new Date().toISOString(),
      status: "pending",
    };
  }

  async upgrade(receipt: AnchorReceipt): Promise<AnchorReceipt> {
    if (receipt.kind !== "ots" || receipt.status === "final") return receipt;
    const detached = parseDetached(Buffer.from(receipt.proof, "base64"));
    const pending = allAttestations(detached.timestamp).filter(
      (a): a is { stamp: Timestamp; attestation: { type: "pending"; uri: string } } => a.attestation.type === "pending",
    );
    const results = await Promise.allSettled(
      pending.map(async ({ stamp, attestation }) => {
        if (!urlInWhitelist(attestation.uri, this.whitelist)) return false;
        const upgraded = await this.calendar(attestation.uri).getTimestamp(stamp.msg);
        if (upgraded === null) return false;
        mergeTimestamp(stamp, upgraded);
        return true;
      }),
    );
    const merged = results.some((r) => r.status === "fulfilled" && r.value);
    if (!merged) return receipt;
    const hasBitcoin = allAttestations(detached.timestamp).some((a) => a.attestation.type === "bitcoin");
    if (!hasBitcoin) return receipt;
    return { ...receipt, proof: Buffer.from(serializeDetached(detached)).toString("base64"), status: "final" };
  }

  async verify(root: Hex, receipt: AnchorReceipt): Promise<OtsVerifyResult> {
    if (receipt.kind !== "ots") return { ok: false, reason: `receipt kind is ${receipt.kind}, not ots` };
    let digest: Uint8Array;
    let detached: ReturnType<typeof parseDetached>;
    try {
      digest = parseRoot(root);
      detached = parseDetached(Buffer.from(receipt.proof, "base64"));
    } catch (e) {
      return { ok: false, reason: `proof does not parse: ${e instanceof Error ? e.message : String(e)}` };
    }
    if (detached.hashOpTag !== OpTag.SHA256) return { ok: false, reason: "proof is not over a sha256 digest" };
    if (!bytesEqual(detached.digest, digest)) return { ok: false, reason: "proof is for a different digest than root" };
    // Parsing recomputed every op from `digest` down to each attestation, so the hash path holds.

    const atts = allAttestations(detached.timestamp);
    const bitcoin = atts
      .flatMap(({ stamp, attestation }) => (attestation.type === "bitcoin" ? [{ msg: stamp.msg, height: attestation.height }] : []))
      .sort((a, b) => a.height - b.height);
    const calendars = atts.flatMap(({ attestation }) => (attestation.type === "pending" ? [attestation.uri] : []));
    if (bitcoin.length === 0 && calendars.length === 0) return { ok: false, reason: "proof has no attestations" };

    if (bitcoin.length > 0 && this.getBlockHeader) {
      for (const { msg, height } of bitcoin) {
        if (msg.length !== 32) return { ok: false, reason: `bitcoin attestation at height ${height} is over ${msg.length} bytes, not 32` };
        let header: BlockHeader;
        try {
          header = await this.getBlockHeader(height);
        } catch (e) {
          return { ok: false, reason: `could not fetch block header ${height}: ${e instanceof Error ? e.message : String(e)}` };
        }
        // Explorers print the merkle root byte-reversed relative to the header bytes OTS commits to.
        let expected: Uint8Array;
        try {
          expected = hexToBytes(header.merkleroot).reverse();
        } catch {
          return { ok: false, reason: `block header ${height} has a malformed merkleroot` };
        }
        if (!bytesEqual(msg, expected)) return { ok: false, reason: `merkle root mismatch at bitcoin block ${height}` };
        return {
          ok: true,
          level: "bitcoin",
          block_height: height,
          attested_at: header.time !== undefined ? new Date(header.time * 1000).toISOString() : receipt.anchored_at,
        };
      }
    }
    if (receipt.status === "final" && bitcoin.length === 0) {
      return { ok: false, reason: "receipt says final but the proof has no Bitcoin attestation" };
    }
    if (calendars.length === 0) {
      return {
        ok: false,
        reason: `proof has a Bitcoin attestation at height ${bitcoin[0]!.height} but no block header source; pass getBlockHeader or online: true`,
      };
    }
    return {
      ok: true,
      level: "calendar",
      attested_at: receipt.anchored_at,
      calendars,
      unchecked_bitcoin_heights: bitcoin.map((b) => b.height),
    };
  }
}

function parseRoot(root: Hex): Uint8Array {
  const digest = hexToBytes(root);
  if (digest.length !== 32) throw new Error(`root must be a 32-byte sha256 hex digest, got ${digest.length} bytes`);
  return digest;
}

export { CalendarError };
