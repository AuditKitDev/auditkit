// One tick: for every project with unrooted events, build tenant trees and a
// project tree; then one global tree over the project roots; anchor the global
// root with every configured Anchor. One public log entry per tick, however many
// customers there are. Proofs are a path through three trees.
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { buildTree, proofFor, type Anchor, type AnchorReceipt, type Hex, type ProofStep } from "@auditkit/core";
import { openProject, now, type Config } from "./db.js";

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

export async function tick(cfg: Config, reg: DatabaseSync, anchors: Anchor[], log: (m: string) => void = () => {}): Promise<TickResult | null> {
  const projectIds = readdirSync(join(cfg.dataDir, "projects")).filter((f) => f.endsWith(".db")).map((f) => f.slice(0, -3));
  const rooted: Array<{ projectId: string; db: DatabaseSync; projectRootId: string; projectRoot: Hex }> = [];
  for (const projectId of projectIds) {
    const db = openProject(cfg, projectId);
    const r = rootProject(db);
    if (r) rooted.push({ projectId, db, projectRootId: r.projectRootId, projectRoot: r.projectRoot });
  }
  if (rooted.length === 0) return null;

  const globalTree = buildTree(rooted.map((r) => r.projectRoot));
  const globalRootId = uid("gr");
  reg.prepare("INSERT INTO global_root (id, root_hash, created_at, project_roots) VALUES (?, ?, ?, ?)")
    .run(globalRootId, globalTree.root, now(), JSON.stringify(rooted.map((r) => ({ project_id: r.projectId, root_hash: r.projectRoot }))));
  const idx = reg.prepare("INSERT INTO project_root_index (global_root_id, project_id) VALUES (?, ?)");
  rooted.forEach((r, i) => {
    idx.run(globalRootId, r.projectId);
    const path: ProofStep[] = proofFor(globalTree, i);
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
export function applyRetention(cfg: Config, reg: DatabaseSync, retentionDaysFor: (plan: string) => number): number {
  let shredded = 0;
  for (const p of reg.prepare("SELECT id, plan FROM project").all() as Array<{ id: string; plan: string }>) {
    const cutoff = new Date(Date.now() - retentionDaysFor(p.plan) * 86_400_000).toISOString();
    const db = openProject(cfg, p.id);
    shredded += Number(db.prepare("DELETE FROM payload WHERE event_id IN (SELECT id FROM event WHERE received_at < ?)").run(cutoff).changes);
  }
  return shredded;
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
