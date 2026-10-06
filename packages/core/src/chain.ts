import { canonicalize } from "./jcs.js";
import { sha256Hex, GENESIS, type Hex } from "./hash.js";

/** The fields the chain commits to. The payload is committed by hash only, so it can be erased. */
export interface EventHeader {
  id: string;
  project_id: string;
  tenant_id: string;
  position: number;
  occurred_at: string; // ISO 8601
  actor: string;
  action: string;
  target: string | null;
  payload_commit: Hex;
  prev_hash: Hex;
}

export interface ChainedEvent extends EventHeader {
  event_hash: Hex;
}

/** payload_commit = sha256(salt || JCS(payload)). Deleting salt+payload makes the commit unrecoverable. */
export function commitPayload(salt: Hex, payload: unknown): Hex {
  // A fixed-width salt means salt||payload cannot be re-split: "ab"+"c…" and "abc"+"…" are different commitments.
  if (!/^[0-9a-f]{32}$/.test(salt)) throw new TypeError("commitPayload: salt must be 32 lowercase hex chars");
  return sha256Hex(salt + canonicalize(payload ?? null));
}

export function eventHash(header: EventHeader): Hex {
  return sha256Hex(canonicalize(header));
}

export function chainEvent(header: Omit<EventHeader, "prev_hash">, prev: ChainedEvent | null): ChainedEvent {
  const full: EventHeader = { ...header, prev_hash: prev ? prev.event_hash : GENESIS };
  if (prev && header.position !== prev.position + 1) {
    throw new Error(`chain: position ${header.position} does not follow ${prev.position}`);
  }
  if (!prev && header.position !== 0) throw new Error(`chain: first event must be position 0`);
  return { ...full, event_hash: eventHash(full) };
}

export type ChainVerdict =
  | { valid: true; count: number; head: Hex }
  | { valid: false; position: number; reason: string };

/**
 * Verify a contiguous run of one tenant's events.
 * `expectedPrev` is the event_hash before the run (GENESIS for a run starting at 0).
 */
export function verifyChain(events: ChainedEvent[], expectedPrev: Hex = GENESIS): ChainVerdict {
  let prev = expectedPrev;
  let position = events[0]?.position ?? 0;
  for (const ev of events) {
    if (ev.position !== position) {
      return { valid: false, position: ev.position, reason: `gap: expected position ${position}` };
    }
    if (ev.prev_hash !== prev) {
      return { valid: false, position, reason: "prev_hash does not match previous event" };
    }
    const { event_hash, ...header } = ev;
    if (eventHash(header) !== event_hash) {
      return { valid: false, position, reason: "event_hash does not match contents" };
    }
    prev = event_hash;
    position += 1;
  }
  return { valid: true, count: events.length, head: prev };
}

/**
 * What a customer-held key signs for `client_sig`. The server assigns id, position, prev_hash
 * and salt after the fact, so the client signs the fields it controls. `tenant` is the external id.
 * Signature: Ed25519 over the 32 raw digest bytes, base64.
 */
export function clientSignable(e: { tenant: string; actor: string; action: string; target?: string | null | undefined; occurred_at: string }): Hex {
  return sha256Hex(canonicalize({ tenant: e.tenant, actor: e.actor, action: e.action, target: e.target ?? null, occurred_at: e.occurred_at }));
}
