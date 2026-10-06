// Ingest, query, export. One chain implementation: bulk is a loop in one transaction.
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  canonicalize,
  sha256Hex,
  chainEvent,
  commitPayload,
  randomSalt,
  GENESIS,
  verifyChain,
  type ChainedEvent,
  type ExportLine,
  type ProofStep,
  type AnchorReceipt,
} from "@auditkit/core";
import { now } from "./db.js";
import type { Signer } from "./signing.js";
import { checkClientSigs } from "./tenantKeys.js";

export interface EventInput {
  tenant: string;
  actor: string;
  action: string;
  target?: string | null | undefined;
  occurred_at?: string | undefined;
  payload?: unknown;
  idempotency_key?: string | undefined;
  client_sig?: string | undefined;
}

/** Enough for a client to recompute event_hash offline and check server_sig against the published key. */
export interface Receipt {
  id: string;
  tenant: string;
  tenant_id?: string;
  project_id?: string;
  position: number;
  occurred_at?: string;
  payload_commit?: string;
  event_hash: string;
  prev_hash: string;
  server_sig: string;
  duplicate?: true;
}

interface TenantRow { id: string; external_id: string; head_hash: string; head_position: number }

export function getOrCreateTenant(db: DatabaseSync, externalId: string): TenantRow {
  const existing = db.prepare("SELECT * FROM tenant WHERE external_id = ?").get(externalId) as TenantRow | undefined;
  if (existing) return existing;
  const id = "t_" + randomBytes(6).toString("hex");
  db.prepare("INSERT INTO tenant (id, external_id, created_at, head_hash, head_position) VALUES (?, ?, ?, ?, -1)").run(id, externalId, now(), GENESIS);
  return { id, external_id: externalId, head_hash: GENESIS, head_position: -1 };
}

export function listTenants(db: DatabaseSync): Array<{ id: string; external_id: string; events: number; created_at: string }> {
  return db
    .prepare("SELECT id, external_id, head_position + 1 AS events, created_at FROM tenant ORDER BY created_at")
    .all() as Array<{ id: string; external_id: string; events: number; created_at: string }>;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Appends events in order inside one transaction. Each one extends its tenant's chain. */
export function ingest(db: DatabaseSync, projectId: string, signer: Signer, inputs: EventInput[]): Receipt[] {
  const receipts: Receipt[] = [];
  checkClientSigs(db, inputs);
  // Callers already inside a transaction (erase, retention) get a savepoint instead of a nested BEGIN.
  const nested = db.isTransaction;
  db.exec(nested ? "SAVEPOINT ingest" : "BEGIN IMMEDIATE");
  try {
    for (const input of inputs) {
      const tenant = getOrCreateTenant(db, input.tenant);
      const bodyHash = input.idempotency_key ? sha256Hex(canonicalize({ actor: input.actor, action: input.action, target: input.target ?? null, occurred_at: input.occurred_at ?? null, payload: input.payload ?? null })) : null;
      if (input.idempotency_key) {
        const dup = db
          .prepare("SELECT id, position, event_hash, prev_hash, server_sig, idem_hash FROM event WHERE tenant_id = ? AND idempotency_key = ?")
          .get(tenant.id, input.idempotency_key) as (Omit<Receipt, "tenant"> & { idem_hash: string | null }) | undefined;
        if (dup) {
          if (dup.idem_hash && dup.idem_hash !== bodyHash) throw new IdempotencyConflict(input.idempotency_key);
          const { idem_hash: _h, ...rc } = dup;
          receipts.push({ ...rc, tenant: input.tenant, duplicate: true });
          continue;
        }
      }
      const occurredAt = input.occurred_at ?? now();
      if (!ISO.test(occurredAt)) throw new ValidationError("occurred_at must be ISO 8601");
      const salt = randomSalt();
      const id = "ev_" + randomBytes(8).toString("hex");
      const prev: ChainedEvent | null =
        tenant.head_position < 0
          ? null
          : ({ position: tenant.head_position, event_hash: tenant.head_hash } as ChainedEvent);
      const ev = chainEvent(
        {
          id,
          project_id: projectId,
          tenant_id: tenant.id,
          position: tenant.head_position + 1,
          occurred_at: occurredAt,
          actor: input.actor,
          action: input.action,
          target: input.target ?? null,
          payload_commit: commitPayload(salt, input.payload ?? null),
        },
        prev,
      );
      const serverSig = signer.sign(ev.event_hash);
      db.prepare(
        `INSERT INTO event (id, tenant_id, position, occurred_at, received_at, actor, action, target,
           payload_commit, prev_hash, event_hash, server_sig, client_sig, idempotency_key, idem_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id, tenant.id, ev.position, ev.occurred_at, now(), ev.actor, ev.action, ev.target,
        ev.payload_commit, ev.prev_hash, ev.event_hash, serverSig, input.client_sig ?? null, input.idempotency_key ?? null, bodyHash,
      );
      db.prepare("INSERT INTO payload (event_id, salt, data) VALUES (?, ?, ?)").run(id, salt, JSON.stringify(input.payload ?? null));
      db.prepare("UPDATE tenant SET head_hash = ?, head_position = ? WHERE id = ?").run(ev.event_hash, ev.position, tenant.id);
      tenant.head_hash = ev.event_hash;
      tenant.head_position = ev.position;
      receipts.push({ id, tenant: input.tenant, tenant_id: tenant.id, project_id: projectId, position: ev.position, occurred_at: ev.occurred_at, payload_commit: ev.payload_commit, event_hash: ev.event_hash, prev_hash: ev.prev_hash, server_sig: serverSig });
    }
    db.exec(nested ? "RELEASE ingest" : "COMMIT");
  } catch (e) {
    db.exec(nested ? "ROLLBACK TO ingest; RELEASE ingest" : "ROLLBACK");
    throw e;
  }
  return receipts;
}

export class ValidationError extends Error {}
export class IdempotencyConflict extends Error { constructor(key: string) { super(`idempotency key ${key} was used with a different body`); } }

export interface EventRecord {
  id: string;
  tenant: string;
  position: number;
  occurred_at: string;
  actor: string;
  action: string;
  target: string | null;
  payload: unknown; // null when erased
  erased: boolean;
  event_hash: string;
  prev_hash: string;
  anchored: boolean;
}

const EVENT_SELECT = `
  SELECT e.id, t.external_id AS tenant, e.position, e.occurred_at, e.actor, e.action, e.target,
         e.payload_commit, e.prev_hash, e.event_hash, e.server_sig, e.client_sig, e.root_id,
         p.salt AS payload_salt, p.data AS payload_data
  FROM event e JOIN tenant t ON t.id = e.tenant_id LEFT JOIN payload p ON p.event_id = e.id`;

type Row = {
  id: string; tenant: string; position: number; occurred_at: string; actor: string; action: string; target: string | null;
  payload_commit: string; prev_hash: string; event_hash: string; server_sig: string; client_sig: string | null;
  root_id: string | null; payload_salt: string | null; payload_data: string | null;
};

function toRecord(r: Row): EventRecord {
  return {
    id: r.id, tenant: r.tenant, position: r.position, occurred_at: r.occurred_at, actor: r.actor, action: r.action,
    target: r.target, payload: r.payload_data === null ? null : JSON.parse(r.payload_data), erased: r.payload_data === null,
    event_hash: r.event_hash, prev_hash: r.prev_hash, anchored: r.root_id !== null,
  };
}

export interface Query {
  tenant?: string;
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string; // event id to continue after (by occurred_at, id)
}

export function search(db: DatabaseSync, q: Query): { events: EventRecord[]; next_cursor: string | null } {
  const where: string[] = [];
  const args: Array<string | number> = [];
  if (q.tenant) { where.push("t.external_id = ?"); args.push(q.tenant); }
  if (q.actor) { where.push("e.actor = ?"); args.push(q.actor); }
  if (q.action) {
    if (q.action.endsWith("*")) { where.push("e.action LIKE ? ESCAPE '\\'"); args.push(q.action.slice(0, -1).replace(/[\\%_]/g, "\\$&") + "%"); }
    else { where.push("e.action = ?"); args.push(q.action); }
  }
  if (q.from) { where.push("e.occurred_at >= ?"); args.push(q.from); }
  if (q.to) { where.push("e.occurred_at < ?"); args.push(q.to); }
  if (q.cursor) {
    const c = (q.tenant
      ? db.prepare("SELECT e.occurred_at, e.id FROM event e JOIN tenant t ON t.id = e.tenant_id WHERE e.id = ? AND t.external_id = ?").get(q.cursor, q.tenant)
      : db.prepare("SELECT occurred_at, id FROM event WHERE id = ?").get(q.cursor)) as { occurred_at: string; id: string } | undefined;
    if (c) { where.push("(e.occurred_at < ? OR (e.occurred_at = ? AND e.id < ?))"); args.push(c.occurred_at, c.occurred_at, c.id); }
  }
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  const rows = db
    .prepare(`${EVENT_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY e.occurred_at DESC, e.id DESC LIMIT ?`)
    .all(...args, limit + 1) as Row[];
  const page = rows.slice(0, limit).map(toRecord);
  return { events: page, next_cursor: rows.length > limit ? page[page.length - 1]!.id : null };
}

export function getEvent(db: DatabaseSync, id: string): EventRecord | null {
  const r = db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).get(id) as Row | undefined;
  return r ? toRecord(r) : null;
}

/**
 * Crypto-shredding: the payload and its salt go away; the chain's commitment stays. The erasure itself is
 * appended to the same tenant chain (`payload.erased`), so a silent shred is impossible.
 */
export function erase(db: DatabaseSync, projectId: string, signer: Signer, id: string, actor: string): Receipt | null {
  const ev = db.prepare("SELECT e.id, t.external_id AS tenant FROM event e JOIN tenant t ON t.id = e.tenant_id WHERE e.id = ?").get(id) as { id: string; tenant: string } | undefined;
  if (!ev) return null;
  if (db.prepare("SELECT 1 FROM payload WHERE event_id = ?").get(id) === undefined) return null;
  db.exec("SAVEPOINT erase");
  try {
    db.prepare("DELETE FROM payload WHERE event_id = ?").run(id);
    const [rc] = ingest(db, projectId, signer, [{ tenant: ev.tenant, actor, action: "payload.erased", target: ev.id, payload: { erased_event: ev.id } }]);
    db.exec("RELEASE erase");
    return rc!;
  } catch (e) { db.exec("ROLLBACK TO erase"); db.exec("RELEASE erase"); throw e; }
}

function chainRows(db: DatabaseSync, tenantId: string, from: number, to: number): Row[] {
  return db.prepare(`${EVENT_SELECT} WHERE e.tenant_id = ? AND e.position BETWEEN ? AND ? ORDER BY e.position`).all(tenantId, from, to) as Row[];
}

export function verifyRange(db: DatabaseSync, projectId: string, tenantExt: string, from = 0, to?: number, hasAnchor: (globalRootId: string) => boolean = () => false, rootCheck?: (tenantId: string, from: number, to: number) => { roots_checked: number; roots_ok: boolean; failed?: { from_position: number; to_position: number; reason: string } }) {
  const tenant = db.prepare("SELECT * FROM tenant WHERE external_id = ?").get(tenantExt) as TenantRow | undefined;
  if (!tenant) return { valid: false as const, position: -1, reason: "unknown tenant" };
  const end = to ?? tenant.head_position;
  const rows = chainRows(db, tenant.id, from, end);
  const prev = from === 0 ? GENESIS : (db.prepare("SELECT event_hash FROM event WHERE tenant_id = ? AND position = ?").get(tenant.id, from - 1) as { event_hash: string } | undefined)?.event_hash;
  if (prev === undefined) return { valid: false as const, position: from - 1, reason: "missing predecessor" };
  const chained: ChainedEvent[] = rows.map((r) => ({
    id: r.id, project_id: projectId, tenant_id: tenant.id, position: r.position, occurred_at: r.occurred_at,
    actor: r.actor, action: r.action, target: r.target, payload_commit: r.payload_commit, prev_hash: r.prev_hash, event_hash: r.event_hash,
  }));
  const v = verifyChain(chained, prev);
  if (!v.valid) return v;
  // payload commitments, where payloads still exist
  for (const r of rows) {
    if (r.payload_data !== null && commitPayload(r.payload_salt!, JSON.parse(r.payload_data)) !== r.payload_commit) {
      return { valid: false as const, position: r.position, reason: "payload does not match its commitment" };
    }
  }
  if (end === tenant.head_position && v.head !== tenant.head_hash) {
    return { valid: false as const, position: end, reason: "tenant head does not match chain" };
  }
  const roots = rootCheck?.(tenant.id, from, end);
  if (roots && !roots.roots_ok) return { valid: false as const, position: roots.failed!.from_position, reason: `merkle: ${roots.failed!.reason}`, roots };
  return { ...v, roots, rooted_through: lastRootedPosition(db, tenant.id), anchored_through: lastAnchoredPosition(db, tenant.id, hasAnchor) };
}

/** Highest position covered by a Merkle root (may not be publicly anchored yet). */
export function lastRootedPosition(db: DatabaseSync, tenantId: string): number {
  const r = db.prepare("SELECT MAX(to_position) AS p FROM tenant_root WHERE tenant_id = ?").get(tenantId) as { p: number | null };
  return r.p ?? -1;
}

/** Highest position whose global root has at least one public anchor receipt. */
export function lastAnchoredPosition(db: DatabaseSync, tenantId: string, hasAnchor: (globalRootId: string) => boolean): number {
  const rows = db
    .prepare(
      `SELECT tr.to_position, pr.global_root_id FROM tenant_root tr JOIN project_root pr ON pr.id = tr.project_root_id
       WHERE tr.tenant_id = ? AND pr.global_root_id != '' ORDER BY tr.to_position DESC`,
    )
    .all(tenantId) as Array<{ to_position: number; global_root_id: string }>;
  for (const r of rows) if (hasAnchor(r.global_root_id)) return r.to_position;
  return -1;
}

export interface RootLookup {
  (globalRootId: string): AnchorReceipt[];
}

/** Everything the offline verifier needs, as JSONL lines. */
export function* exportLines(
  db: DatabaseSync,
  projectId: string,
  tenantExt: string,
  signer: Signer,
  anchorsFor: RootLookup,
  server: string,
  requestedFrom = 0,
  requestedTo?: number,
): Generator<ExportLine> {
  const tenant = db.prepare("SELECT * FROM tenant WHERE external_id = ?").get(tenantExt) as TenantRow | undefined;
  if (!tenant) throw new ValidationError("unknown tenant");
  const reqEnd = Math.min(requestedTo ?? tenant.head_position, tenant.head_position);
  // Widen to whole root batches so the verifier can rebuild every root it is handed.
  const bounds = db
    .prepare("SELECT MIN(from_position) AS lo, MAX(to_position) AS hi FROM tenant_root WHERE tenant_id = ? AND to_position >= ? AND from_position <= ?")
    .get(tenant.id, requestedFrom, reqEnd) as { lo: number | null; hi: number | null };
  const from = Math.min(requestedFrom, bounds.lo ?? requestedFrom);
  const end = Math.max(reqEnd, bounds.hi ?? reqEnd);
  const prev = from === 0 ? GENESIS : (db.prepare("SELECT event_hash FROM event WHERE tenant_id = ? AND position = ?").get(tenant.id, from - 1) as { event_hash: string }).event_hash;
  yield {
    type: "manifest", version: 1, server, project_id: projectId, tenant_id: tenant.id, tenant: tenantExt,
    from_position: from, to_position: end, requested_from: requestedFrom, requested_to: reqEnd,
    prev_hash: prev, server_public_key: signer.publicKeySpkiB64, exported_at: now(),
  };
  for (const r of chainRows(db, tenant.id, from, end)) {
    const line: ExportLine = {
      type: "event", id: r.id, project_id: projectId, tenant_id: tenant.id, tenant: tenantExt, position: r.position, occurred_at: r.occurred_at,
      actor: r.actor, action: r.action, target: r.target, payload_commit: r.payload_commit, prev_hash: r.prev_hash,
      event_hash: r.event_hash, server_sig: r.server_sig,
    };
    if (r.client_sig) line.client_sig = r.client_sig;
    if (r.payload_data !== null) line.payload = { salt: r.payload_salt!, data: JSON.parse(r.payload_data) };
    yield line;
  }
  const roots = db
    .prepare(
      `SELECT tr.root_hash AS tenant_root, tr.from_position, tr.to_position, tr.path_to_project, pr.root_hash AS project_root, pr.path_to_global, pr.global_root_hash, pr.global_root_id
       FROM tenant_root tr JOIN project_root pr ON pr.id = tr.project_root_id
       WHERE tr.tenant_id = ? AND tr.to_position >= ? AND tr.from_position <= ? ORDER BY tr.from_position`,
    )
    .all(tenant.id, from, end) as Array<{ tenant_root: string; from_position: number; to_position: number; path_to_project: string; project_root: string; path_to_global: string; global_root_hash: string; global_root_id: string }>;
  for (const r of roots) {
    yield {
      type: "root", tenant_root: r.tenant_root, from_position: r.from_position, to_position: r.to_position,
      path_to_project: JSON.parse(r.path_to_project) as ProofStep[], project_root: r.project_root,
      path_to_global: JSON.parse(r.path_to_global) as ProofStep[], global_root: r.global_root_hash, anchors: anchorsFor(r.global_root_id),
    };
  }
}
