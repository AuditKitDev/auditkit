// Offline verification of an AuditKit export file. Nothing here talks to an
// AuditKit server; `online` only lets the anchor verifiers cross-check public logs.
import { createPublicKey, verify as cryptoVerify, type KeyObject } from "node:crypto";
import {
  GENESIS,
  clientSignable,
  buildTree,
  commitPayload,
  verifyChain,
  verifyProof,
  type Anchor,
  type AnchorKind,
  type AnchorReceipt,
  type ChainedEvent,
  type ExportLine,
  type Hex,
} from "@auditkit/core";
import { defaultAnchors, type AnchorRegistry } from "./anchors.js";

export { defaultAnchors, type AnchorRegistry } from "./anchors.js";

type Manifest = Extract<ExportLine, { type: "manifest" }>;
type EventLine = Extract<ExportLine, { type: "event" }>;
type RootLine = Extract<ExportLine, { type: "root" }>;

export interface VerifyOptions {
  /** base64 SPKI Ed25519 key the manifest's server_public_key must equal. */
  pinnedServerKey?: string;
  /** Replace or add anchor verifiers; defaults to Rekor and OTS from the workspace packages. */
  anchors?: AnchorRegistry;
  /** Let anchor verifiers contact the public logs for a live cross-check. Default false. */
  online?: boolean;
  /** Customer signing keys, base64 SPKI Ed25519, keyed by the export's external tenant (tenant_id also accepted). */
  clientKeys?: Record<string, string>;
}

export type CheckName = "manifest" | "chain" | "signatures" | "payloads" | "client_sigs" | "roots" | "anchors" | "coverage";
export type CheckStatus = "ok" | "fail" | "unverified" | "skipped";

export interface Check {
  name: CheckName;
  status: CheckStatus;
  /** One line a human can read. */
  summary: string;
  /** Position of the first offending event, when there is one. */
  position?: number;
  details?: string[];
}

export interface AnchorResult {
  kind: AnchorKind;
  ref: string;
  global_root: Hex;
  root_range: [number, number];
  status: "verified" | "failed" | "no_verifier";
  attested_at?: string;
  reason?: string;
  receipt_status: AnchorReceipt["status"];
}

export interface Coverage {
  from_position: number;
  to_position: number;
  /** Positions covered by a rebuilt root that has at least one verified anchor. */
  anchored: Array<[number, number]>;
  /** Positions covered by a rebuilt root whose anchors did not verify. */
  rooted_unanchored: Array<[number, number]>;
  /** Positions only the chain and signatures vouch for. */
  chain_only: Array<[number, number]>;
}

export type Verdict = "VALID" | "VALID_UNANCHORED" | "INVALID";

export interface Report {
  verdict: Verdict;
  /** For INVALID: which check failed first, and at which position (null when the failure is file-level). */
  failed?: { check: CheckName; position: number | null; reason: string };
  manifest?: Manifest;
  events: number;
  erased: number;
  checks: Check[];
  anchors: AnchorResult[];
  coverage?: Coverage;
}

export async function verifyExport(lines: ExportLine[] | AsyncIterable<string>, opts: VerifyOptions = {}): Promise<Report> {
  const checks: Check[] = [];
  const anchorResults: AnchorResult[] = [];
  const parsed = Array.isArray(lines) ? { lines, error: null } : await parseLines(lines);

  // 1. manifest
  const manifest = parsed.lines[0];
  const events = parsed.lines.filter((l): l is EventLine => l.type === "event");
  const roots = parsed.lines.filter((l): l is RootLine => l.type === "root");
  const erased = events.filter((e) => e.payload === undefined).length;
  const base = { events: events.length, erased, checks, anchors: anchorResults };
  if (parsed.error) {
    checks.push({ name: "manifest", status: "fail", summary: parsed.error });
    return { verdict: "INVALID", failed: { check: "manifest", position: null, reason: parsed.error }, ...base };
  }
  if (!manifest || manifest.type !== "manifest") {
    const reason = "first line is not a manifest";
    checks.push({ name: "manifest", status: "fail", summary: reason });
    return { verdict: "INVALID", failed: { check: "manifest", position: null, reason }, ...base };
  }
  if (manifest.version !== 1) {
    const reason = `unsupported export version ${String(manifest.version)}`;
    checks.push({ name: "manifest", status: "fail", summary: reason });
    return { verdict: "INVALID", failed: { check: "manifest", position: null, reason }, ...base, manifest };
  }
  if (parsed.lines.slice(1).some((l) => l.type === "manifest")) {
    const reason = "more than one manifest line";
    checks.push({ name: "manifest", status: "fail", summary: reason });
    return { verdict: "INVALID", failed: { check: "manifest", position: null, reason }, ...base, manifest };
  }
  checks.push({
    name: "manifest",
    status: "ok",
    summary: `version 1, tenant ${manifest.tenant_id}, positions ${manifest.from_position}..${manifest.to_position}, exported ${manifest.exported_at}`,
  });

  // 2. chain
  const chained: ChainedEvent[] = events.map(({ type: _t, tenant: _tn, server_sig: _s, client_sig: _c, payload: _p, ...h }) => h);
  const chainCheck = checkChain(manifest, events, chained);
  checks.push(chainCheck);

  // 3. server signatures (+ pin)
  checks.push(checkSignatures(manifest, events, opts.pinnedServerKey));

  // 4. payload commitments
  checks.push(checkPayloads(events));

  // 5. client signatures
  checks.push(checkClientSigs(events, opts.clientKeys));

  // 6. roots
  const rootCheck = checkRoots(manifest, events, roots);
  checks.push(rootCheck.check);

  // 7. anchors
  const registry: AnchorRegistry = { ...defaultAnchors(opts.online ?? false), ...(opts.anchors ?? {}) };
  const anchoredRoots = new Set<number>();
  for (const [i, root] of roots.entries()) {
    for (const receipt of root.anchors) {
      const r = await verifyAnchor(registry, root, receipt);
      anchorResults.push(r);
      if (r.status === "verified" && rootCheck.rebuilt.has(i)) anchoredRoots.add(i);
    }
  }
  checks.push(anchorsCheck(roots, anchorResults));

  // 8. coverage
  const coverage = computeCoverage(manifest, roots, rootCheck.rebuilt, anchoredRoots);
  checks.push(coverageCheck(coverage));

  const hard: CheckName[] = ["chain", "signatures", "payloads", "roots"];
  const firstFail = checks.find((c) => hard.includes(c.name) && c.status === "fail");
  if (firstFail) {
    return {
      verdict: "INVALID",
      failed: { check: firstFail.name, position: firstFail.position ?? null, reason: firstFail.summary },
      ...base,
      manifest,
      coverage,
    };
  }
  const allRootsAnchored = roots.length > 0 && roots.every((_, i) => anchoredRoots.has(i));
  return { verdict: allRootsAnchored ? "VALID" : "VALID_UNANCHORED", ...base, manifest, coverage };
}

async function parseLines(src: AsyncIterable<string>): Promise<{ lines: ExportLine[]; error: string | null }> {
  const lines: ExportLine[] = [];
  let n = 0;
  for await (const raw of src) {
    n += 1;
    const text = raw.trim();
    if (!text) continue;
    try {
      const v = JSON.parse(text) as ExportLine;
      if (typeof v !== "object" || v === null || typeof v.type !== "string") return { lines, error: `line ${n}: not an export line` };
      lines.push(v);
    } catch {
      return { lines, error: `line ${n}: not JSON` };
    }
  }
  return { lines, error: null };
}

function checkChain(manifest: Manifest, events: EventLine[], chained: ChainedEvent[]): Check {
  const expected = manifest.to_position - manifest.from_position + 1;
  if (events.length === 0 && expected <= 0) return { name: "chain", status: "ok", summary: "no events in range" };
  const first = events[0];
  if (!first || first.position !== manifest.from_position) {
    return { name: "chain", status: "fail", position: manifest.from_position, summary: `first event is not position ${manifest.from_position}` };
  }
  const v = verifyChain(chained, manifest.prev_hash);
  if (!v.valid) return { name: "chain", status: "fail", position: v.position, summary: v.reason };
  const last = events[events.length - 1]!;
  if (last.position !== manifest.to_position) {
    return { name: "chain", status: "fail", position: last.position + 1, summary: `chain ends at ${last.position}, manifest says ${manifest.to_position}` };
  }
  for (const e of events) {
    if (e.tenant_id !== manifest.tenant_id || e.project_id !== manifest.project_id) {
      return { name: "chain", status: "fail", position: e.position, summary: "event belongs to another tenant or project" };
    }
  }
  return {
    name: "chain",
    status: "ok",
    summary: `${v.count} events, prev ${manifest.prev_hash === GENESIS ? "GENESIS" : short(manifest.prev_hash)} → head ${short(v.head)}`,
  };
}

function loadSpki(b64: string): KeyObject | null {
  try {
    const k = createPublicKey({ key: Buffer.from(b64, "base64"), format: "der", type: "spki" });
    return k.asymmetricKeyType === "ed25519" ? k : null;
  } catch {
    return null;
  }
}

function sigOk(key: KeyObject, hex: Hex, sigB64: string): boolean {
  try {
    return cryptoVerify(null, Buffer.from(hex, "hex"), key, Buffer.from(sigB64, "base64"));
  } catch {
    return false;
  }
}

function checkSignatures(manifest: Manifest, events: EventLine[], pinned: string | undefined): Check {
  if (pinned !== undefined && pinned !== manifest.server_public_key) {
    return { name: "signatures", status: "fail", summary: "manifest server_public_key does not match the pinned key" };
  }
  const key = loadSpki(manifest.server_public_key);
  if (!key) return { name: "signatures", status: "fail", summary: "server_public_key is not an Ed25519 SPKI key" };
  for (const e of events) {
    if (!sigOk(key, e.event_hash, e.server_sig)) {
      return { name: "signatures", status: "fail", position: e.position, summary: "server_sig does not verify" };
    }
  }
  return {
    name: "signatures",
    status: "ok",
    summary: `${events.length} server signatures verify (${pinned !== undefined ? "pinned key" : "key from manifest, not pinned"})`,
  };
}

function checkPayloads(events: EventLine[]): Check {
  let erased = 0;
  for (const e of events) {
    if (e.payload === undefined) {
      erased += 1;
      continue;
    }
    if (commitPayload(e.payload.salt, e.payload.data) !== e.payload_commit) {
      return { name: "payloads", status: "fail", position: e.position, summary: "payload does not match payload_commit" };
    }
  }
  return {
    name: "payloads",
    status: "ok",
    summary: `${events.length - erased} payload commitments verify${erased ? `, ${erased} erased` : ""}`,
  };
}

/** client_sig is Ed25519 over the raw 32 bytes of clientSignable(tenant, actor, action, target, occurred_at). */
function checkClientSigs(events: EventLine[], clientKeys: Record<string, string> | undefined): Check {
  const signed = events.filter((e) => e.client_sig !== undefined);
  if (signed.length === 0) return { name: "client_sigs", status: "skipped", summary: "no client signatures in export" };
  if (!clientKeys) return { name: "client_sigs", status: "unverified", summary: `${signed.length} client signatures present, no client keys given` };
  const keys = new Map<string, KeyObject | null>();
  let verified = 0;
  let missing = 0;
  for (const e of signed) {
    if (!keys.has(e.tenant)) {
      const b64 = clientKeys[e.tenant] ?? clientKeys[e.tenant_id];
      keys.set(e.tenant, b64 ? loadSpki(b64) : null);
    }
    const key = keys.get(e.tenant) ?? null;
    if (!key) {
      missing += 1;
      continue;
    }
    if (!sigOk(key, clientSignable({ tenant: e.tenant, actor: e.actor, action: e.action, target: e.target, occurred_at: e.occurred_at }), e.client_sig!)) {
      return { name: "client_sigs", status: "fail", position: e.position, summary: "client_sig does not verify" };
    }
    verified += 1;
  }
  if (missing) return { name: "client_sigs", status: "unverified", summary: `${verified} verified, ${missing} without a key for their tenant` };
  return { name: "client_sigs", status: "ok", summary: `${verified} client signatures verify` };
}

function checkRoots(manifest: Manifest, events: EventLine[], roots: RootLine[]): { check: Check; rebuilt: Set<number> } {
  const rebuilt = new Set<number>();
  if (roots.length === 0) return { check: { name: "roots", status: "skipped", summary: "no roots in export" }, rebuilt };
  const byPos = new Map(events.map((e) => [e.position, e.event_hash]));
  for (const [i, r] of roots.entries()) {
    if (r.from_position < manifest.from_position || r.to_position > manifest.to_position) {
      return { check: { name: "roots", status: "fail", position: r.from_position, summary: `root ${i} covers ${r.from_position}..${r.to_position}, outside the exported ${manifest.from_position}..${manifest.to_position}; cannot rebuild` }, rebuilt };
    }
    const hashes: Hex[] = [];
    for (let p = r.from_position; p <= r.to_position; p++) {
      const h = byPos.get(p);
      if (h === undefined) return { check: { name: "roots", status: "fail", position: p, summary: `root ${i}: event ${p} missing` }, rebuilt };
      hashes.push(h);
    }
    if (buildTree(hashes).root !== r.tenant_root) {
      return { check: { name: "roots", status: "fail", position: r.from_position, summary: `root ${i}: rebuilt tenant root differs for ${r.from_position}..${r.to_position}` }, rebuilt };
    }
    if (!verifyProof(r.tenant_root, r.path_to_project, r.project_root)) {
      return { check: { name: "roots", status: "fail", position: r.from_position, summary: `root ${i}: tenant root is not in the project tree` }, rebuilt };
    }
    if (!verifyProof(r.project_root, r.path_to_global, r.global_root)) {
      return { check: { name: "roots", status: "fail", position: r.from_position, summary: `root ${i}: project root is not in the global tree` }, rebuilt };
    }
    rebuilt.add(i);
  }
  const check: Check = {
    name: "roots",
    status: "ok",
    summary: `${rebuilt.size} of ${roots.length} roots rebuilt and chained to their global root`,
  };
  return { check, rebuilt };
}

async function verifyAnchor(registry: AnchorRegistry, root: RootLine, receipt: AnchorReceipt): Promise<AnchorResult> {
  const common = { kind: receipt.kind, ref: receipt.ref, global_root: root.global_root, root_range: [root.from_position, root.to_position] as [number, number], receipt_status: receipt.status };
  const anchor: Anchor | undefined = registry[receipt.kind];
  if (!anchor) return { ...common, status: "no_verifier", reason: `no verifier for kind ${String(receipt.kind)}` };
  try {
    const v = await anchor.verify(root.global_root, receipt);
    return v.ok ? { ...common, status: "verified", attested_at: v.attested_at } : { ...common, status: "failed", reason: v.reason };
  } catch (e) {
    return { ...common, status: "failed", reason: e instanceof Error ? e.message : String(e) };
  }
}

function anchorsCheck(roots: RootLine[], results: AnchorResult[]): Check {
  if (roots.length === 0) return { name: "anchors", status: "skipped", summary: "no roots, nothing to anchor" };
  if (results.length === 0) return { name: "anchors", status: "unverified", summary: "roots carry no anchor receipts" };
  const verified = results.filter((r) => r.status === "verified").length;
  const details = results.map(
    (r) => `${r.kind} ${r.ref} for ${r.root_range[0]}..${r.root_range[1]}: ${r.status}${r.attested_at ? ` at ${r.attested_at}` : ""}${r.reason ? ` (${r.reason})` : ""}`,
  );
  const status: CheckStatus = verified === results.length ? "ok" : verified > 0 ? "unverified" : "fail";
  return { name: "anchors", status, summary: `${verified} of ${results.length} anchor receipts verify`, details };
}

function computeCoverage(manifest: Manifest, roots: RootLine[], rebuilt: Set<number>, anchored: Set<number>): Coverage {
  const anchoredR: Array<[number, number]> = [];
  const rootedR: Array<[number, number]> = [];
  const covered = new Set<number>();
  for (const [i, r] of roots.entries()) {
    if (!rebuilt.has(i)) continue;
    (anchored.has(i) ? anchoredR : rootedR).push([r.from_position, r.to_position]);
    for (let p = r.from_position; p <= r.to_position; p++) covered.add(p);
  }
  const chainOnly: Array<[number, number]> = [];
  let start: number | null = null;
  for (let p = manifest.from_position; p <= manifest.to_position + 1; p++) {
    const gap = p <= manifest.to_position && !covered.has(p);
    if (gap && start === null) start = p;
    if (!gap && start !== null) {
      chainOnly.push([start, p - 1]);
      start = null;
    }
  }
  return { from_position: manifest.from_position, to_position: manifest.to_position, anchored: anchoredR, rooted_unanchored: rootedR, chain_only: chainOnly };
}

function coverageCheck(c: Coverage): Check {
  const fmt = (rs: Array<[number, number]>) => rs.map(([a, b]) => (a === b ? `${a}` : `${a}..${b}`)).join(", ");
  const parts: string[] = [];
  if (c.anchored.length) parts.push(`anchored: ${fmt(c.anchored)}`);
  if (c.rooted_unanchored.length) parts.push(`rooted but not anchored: ${fmt(c.rooted_unanchored)}`);
  if (c.chain_only.length) parts.push(`chain only: ${fmt(c.chain_only)}`);
  const status: CheckStatus = c.chain_only.length === 0 && c.rooted_unanchored.length === 0 && c.anchored.length > 0 ? "ok" : "unverified";
  return { name: "coverage", status, summary: parts.join("; ") || "no positions" };
}

function short(h: Hex): string {
  return h.slice(0, 12);
}
