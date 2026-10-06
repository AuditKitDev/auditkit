// One tick: for every project with unrooted events, build tenant trees and a
// project tree; then one global tree over the project roots; anchor the global
// root with every configured Anchor. One public log entry per tick, however many
// customers there are. Proofs are a path through three trees.
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildTree, proofFor, verifyProof, GENESIS, type Anchor, type AnchorReceipt, type Hex, type ProofStep } from "@auditkit/core";
import { openProject, now, type Config } from "./db.js";
import { ingest } from "./events.js";
import type { Signer } from "./signing.js";

const uid = (p: string) => p + "_" + randomBytes(6).toString("hex");

interface TenantBatch { tenantId: string; from: number; to: number; root: Hex; tree: ReturnType<typeof buildTree>; eventIds: string[] }

/** Build tenant roots and the project root in the project DB. Returns null if nothing new. */
function rootProject(db: DatabaseSync): { projectRootId: string; projectRoot: Hex; batches: TenantBatch[] } | null {
  const tenants = db.prepare("SELECT DISTINCT tenant_id FROM event WHERE root_id IS NULL").all() as Array<{ tenant_id: string }>;
  if (tenants.length === 0) return null;
  const batches: TenantBatch[] = [];
  for (const { tenant_id } of tenants) {
    const rows = db.prepare("SELECT id, position, event_hash FROM event WHERE tenant_id = ? AND root_id IS NULL ORDER BY position").all(tenant_id) as Array<{ id: string; position: number; event_hash: string }>;
    const tree = buildTree(rows.map((r) => r.event_hash));
    batches.push({ tenantId: tenant_id, from: rows[0]!.position, to: rows[rows.length - 1]!.position, root: tree.root, tree, eventIds: rows.map((r) => r.id) });
  }
  const projectTree = buildTree(batches.map((b) => b.root));
  const projectRootId = uid("pr");
  db.exec("BEGIN IMMEDIATE");
  try {
    batches.forEach((b, i) => {
      const trId = uid("tr");
      db.prepare("INSERT INTO tenant_root (id, tenant_id, from_position, to_position, root_hash, project_root_id, path_to_project, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(trId, b.tenantId, b.from, b.to, b.root, projectRootId, JSON.stringify(proofFor(projectTree, i)), now());
      const upd = db.prepare("UPDATE event SET root_id = ? WHERE id = ?");
      for (const id of b.eventIds) upd.run(trId, id);
    });
    // project_root row is completed once the global root exists (path_to_global filled below)
    db.prepare("INSERT INTO project_root (id, root_hash, global_root_id, path_to_global, global_root_hash, created_at) VALUES (?, ?, '', '[]', '', ?)")
      .run(projectRootId, projectTree.root, now());
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { projectRootId, projectRoot: projectTree.root, batches };
}

export interface TickResult { globalRootId: string; globalRoot: Hex; projects: number; anchors: AnchorReceipt[] }

/**
 * One tick. A project is rooted only when its plan's anchor interval has elapsed since its last root
 * (`intervalFor`), so the per-plan cadence on the pricing page is enforced here. The loop itself runs
 * at the shortest interval. Projects not yet due keep accumulating events until their turn.
 */
export async function tick(cfg: Config, reg: DatabaseSync, anchors: Anchor[], log: (m: string) => void = () => {}, intervalFor: (plan: string) => number = () => 0): Promise<TickResult | null> {
  // Registry is the source of truth; a stray file in projects/ must not break the tick.
  const projectIds = (reg.prepare("SELECT id FROM project").all() as Array<{ id: string }>).map((p) => p.id)
    .filter((id) => existsSync(join(cfg.dataDir, "projects", `${id}.db`)));
  const rooted: Array<{ projectId: string; db: DatabaseSync; projectRootId: string; projectRoot: Hex }> = [];
  const nowMs = Date.now();
  for (const projectId of projectIds) {
    const db = openProject(cfg, projectId);
    const plan = (reg.prepare("SELECT plan FROM project WHERE id = ?").get(projectId) as { plan: string } | undefined)?.plan ?? "free";
    const last = (db.prepare("SELECT MAX(created_at) AS t FROM project_root WHERE global_root_id != ''").get() as { t: string | null }).t;
    if (last && nowMs - Date.parse(last) < intervalFor(plan) * 1000) continue; // not due yet
    const r = rootProject(db);
    if (r) rooted.push({ projectId, db, projectRootId: r.projectRootId, projectRoot: r.projectRoot });
  }
  if (rooted.length === 0) return null;

  // Project roots left without a global root by a crash mid-tick are picked up here.
  for (const projectId of projectIds) {
    const db = openProject(cfg, projectId);
    const dangling = db.prepare("SELECT id, root_hash FROM project_root WHERE global_root_id = ''").all() as Array<{ id: string; root_hash: string }>;
    for (const d of dangling) if (!rooted.some((r) => r.projectRootId === d.id)) rooted.push({ projectId, db, projectRootId: d.id, projectRoot: d.root_hash });
  }
  // Leaf 0 is the previous global root, so every tick's root commits to the whole history: a rollback forks visibly.
  const prev = (reg.prepare("SELECT root_hash FROM global_root ORDER BY created_at DESC, rowid DESC LIMIT 1").get() as { root_hash: string } | undefined)?.root_hash ?? GENESIS;
  const globalTree = buildTree([prev, ...rooted.map((r) => r.projectRoot)]);
  const globalRootId = uid("gr");
  reg.prepare("INSERT INTO global_root (id, root_hash, created_at, project_roots, prev_root_hash) VALUES (?, ?, ?, ?, ?)")
    .run(globalRootId, globalTree.root, now(), JSON.stringify(rooted.map((r) => ({ project_id: r.projectId, root_hash: r.projectRoot }))), prev);
  const idx = reg.prepare("INSERT OR IGNORE INTO project_root_index (global_root_id, project_id) VALUES (?, ?)");
  rooted.forEach((r, i) => {
    idx.run(globalRootId, r.projectId);
    const path: ProofStep[] = proofFor(globalTree, i + 1);
    r.db.prepare("UPDATE project_root SET global_root_id = ?, path_to_global = ?, global_root_hash = ? WHERE id = ?")
      .run(globalRootId, JSON.stringify(path), globalTree.root, r.projectRootId);
  });

  const receipts: AnchorReceipt[] = [];
  for (const a of anchors) {
    try {
      const rc = await a.anchor(globalTree.root);
      reg.prepare("INSERT INTO anchor (global_root_id, kind, ref, proof, status, anchored_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(globalRootId, rc.kind, rc.ref, rc.proof, rc.status, rc.anchored_at);
      receipts.push(rc);
      log(`anchored ${globalTree.root.slice(0, 12)} via ${a.kind}: ${rc.ref}`);
    } catch (e) {
      log(`anchor ${a.kind} failed: ${(e as Error).message}`);
    }
  }
  return { globalRootId, globalRoot: globalTree.root, projects: rooted.length, anchors: receipts };
}

/** Retry anchors that failed, upgrade pending OTS receipts. */
export async function maintain(reg: DatabaseSync, anchors: Anchor[], log: (m: string) => void = () => {}): Promise<void> {
  for (const a of anchors) {
    const missing = reg.prepare(
      `SELECT g.id, g.root_hash FROM global_root g WHERE NOT EXISTS (SELECT 1 FROM anchor x WHERE x.global_root_id = g.id AND x.kind = ?) ORDER BY g.created_at LIMIT 20`,
    ).all(a.kind) as Array<{ id: string; root_hash: string }>;
    for (const g of missing) {
      try {
        const rc = await a.anchor(g.root_hash);
        reg.prepare("INSERT INTO anchor (global_root_id, kind, ref, proof, status, anchored_at) VALUES (?, ?, ?, ?, ?, ?)").run(g.id, rc.kind, rc.ref, rc.proof, rc.status, rc.anchored_at);
      } catch (e) {
        log(`retry ${a.kind} failed: ${(e as Error).message}`);
      }
    }
    const pending = reg.prepare("SELECT global_root_id, kind, ref, proof, status, anchored_at FROM anchor WHERE kind = ? AND status = 'pending' LIMIT 50").all(a.kind) as unknown as Array<AnchorReceipt & { global_root_id: string }>;
    for (const p of pending) {
      try {
        const up = await a.upgrade(p);
        if (up.status === "final") {
          reg.prepare("UPDATE anchor SET proof = ?, status = 'final' WHERE global_root_id = ? AND kind = ?").run(up.proof, p.global_root_id, a.kind);
        }
      } catch (e) {
        log(`upgrade ${a.kind} failed: ${(e as Error).message}`);
      }
    }
  }
}

/** Retention = payload retention. Headers, hashes and anchors are kept forever; payloads older than the plan's window are shredded. */
export function applyRetention(cfg: Config, reg: DatabaseSync, retentionDaysFor: (plan: string) => number, signer?: Signer): number {
  let shredded = 0;
  for (const p of reg.prepare("SELECT id, plan FROM project").all() as Array<{ id: string; plan: string }>) {
    const cutoff = new Date(Date.now() - retentionDaysFor(p.plan) * 86_400_000).toISOString();
    const db = openProject(cfg, p.id);
    const perTenant = db.prepare(
      "SELECT t.external_id AS tenant, COUNT(*) AS n, MAX(e.position) AS through_position FROM payload p JOIN event e ON e.id = p.event_id JOIN tenant t ON t.id = e.tenant_id WHERE e.received_at < ? GROUP BY t.external_id",
    ).all(cutoff) as Array<{ tenant: string; n: number; through_position: number }>;
    if (perTenant.length === 0) continue;
    shredded += Number(db.prepare("DELETE FROM payload WHERE event_id IN (SELECT id FROM event WHERE received_at < ?)").run(cutoff).changes);
    if (signer) ingest(db, p.id, signer, perTenant.map((t) => ({ tenant: t.tenant, actor: "system:retention", action: "payload.retention_shred", target: null, payload: { count: t.n, older_than: cutoff, through_position: t.through_position } })));
  }
  return shredded;
}

/** Wipe the public demo project's data. Its anchored roots stay in the registry; the demo chain simply restarts. */
export function resetProjectData(cfg: Config, projectId: string): void {
  const db = openProject(cfg, projectId);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const t of ["payload", "tenant_key", "viewer_token", "event", "tenant_root", "project_root", "tenant"]) db.exec(`DELETE FROM ${t}`);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

export interface RootCheck { roots_checked: number; roots_ok: boolean; failed?: { from_position: number; to_position: number; reason: string } }

/**
 * Server-side Merkle check for a tenant range: rebuild each tenant root from the rows, then walk the stored
 * paths to the project root and to the global root, and compare that global root with the registry's copy.
 * A DB admin who rewrites events and tenant_root.root_hash together is caught here (the paths no longer fit).
 */
export function verifyRoots(db: DatabaseSync, reg: DatabaseSync, tenantId: string, from: number, to: number): RootCheck {
  const roots = db.prepare(
    `SELECT tr.id, tr.from_position, tr.to_position, tr.root_hash, tr.path_to_project, pr.root_hash AS project_root, pr.path_to_global, pr.global_root_hash, pr.global_root_id
     FROM tenant_root tr JOIN project_root pr ON pr.id = tr.project_root_id
     WHERE tr.tenant_id = ? AND tr.to_position >= ? AND tr.from_position <= ? ORDER BY tr.from_position`,
  ).all(tenantId, from, to) as Array<{ id: string; from_position: number; to_position: number; root_hash: string; path_to_project: string; project_root: string; path_to_global: string; global_root_hash: string; global_root_id: string }>;
  for (const r of roots) {
    const fail = (reason: string): RootCheck => ({ roots_checked: roots.length, roots_ok: false, failed: { from_position: r.from_position, to_position: r.to_position, reason } });
    const leaves = db.prepare("SELECT event_hash FROM event WHERE tenant_id = ? AND position BETWEEN ? AND ? ORDER BY position").all(tenantId, r.from_position, r.to_position) as Array<{ event_hash: string }>;
    if (leaves.length !== r.to_position - r.from_position + 1) return fail("events missing from a rooted range");
    if (buildTree(leaves.map((l) => l.event_hash)).root !== r.root_hash) return fail("tenant root does not match its events");
    if (!verifyProof(r.root_hash, JSON.parse(r.path_to_project) as ProofStep[], r.project_root)) return fail("tenant root is not in the project root");
    if (r.global_root_id === "") continue; // not yet in a global root (tick in progress or crashed; re-rooted next tick)
    if (!verifyProof(r.project_root, JSON.parse(r.path_to_global) as ProofStep[], r.global_root_hash)) return fail("project root is not in the global root");
    const g = reg.prepare("SELECT root_hash FROM global_root WHERE id = ?").get(r.global_root_id) as { root_hash: string } | undefined;
    if (!g || g.root_hash !== r.global_root_hash) return fail("global root does not match the registry");
  }
  return { roots_checked: roots.length, roots_ok: true };
}

export function anchorsFor(reg: DatabaseSync, globalRootId: string): AnchorReceipt[] {
  return reg.prepare("SELECT kind, ref, proof, status, anchored_at FROM anchor WHERE global_root_id = ?").all(globalRootId) as unknown as AnchorReceipt[];
}

/** Merkle path for one event: event → tenant root → project root → global root, plus the anchors. */
export function proofForEvent(db: DatabaseSync, reg: DatabaseSync, eventId: string) {
  const ev = db.prepare("SELECT id, tenant_id, position, event_hash, root_id FROM event WHERE id = ?").get(eventId) as { id: string; tenant_id: string; position: number; event_hash: string; root_id: string | null } | undefined;
  if (!ev) return null;
  if (!ev.root_id) return { event_id: ev.id, event_hash: ev.event_hash, anchored: false as const };
  const tr = db.prepare("SELECT * FROM tenant_root WHERE id = ?").get(ev.root_id) as { id: string; from_position: number; to_position: number; root_hash: string; project_root_id: string; path_to_project: string };
  const leaves = db.prepare("SELECT event_hash FROM event WHERE root_id = ? ORDER BY position").all(tr.id) as Array<{ event_hash: string }>;
  const tree = buildTree(leaves.map((l) => l.event_hash));
  const pr = db.prepare("SELECT * FROM project_root WHERE id = ?").get(tr.project_root_id) as { path_to_global: string; global_root_hash: string; global_root_id: string; root_hash: string };
  if (pr.global_root_id === "") return { event_id: ev.id, event_hash: ev.event_hash, anchored: false as const, reason: "rooted; waiting for the next anchor tick" };
  return {
    event_id: ev.id,
    event_hash: ev.event_hash,
    anchored: true as const,
    path_to_tenant_root: proofFor(tree, ev.position - tr.from_position),
    tenant_root: tr.root_hash,
    path_to_project_root: JSON.parse(tr.path_to_project) as ProofStep[],
    project_root: pr.root_hash,
    path_to_global_root: JSON.parse(pr.path_to_global) as ProofStep[],
    global_root: pr.global_root_hash,
    anchors: anchorsFor(reg, pr.global_root_id),
  };
}
