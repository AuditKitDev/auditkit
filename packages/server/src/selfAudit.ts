// AuditKit audits itself. Platform events go into a system project (`auditkit`, tenant `platform`) that is
// hash-chained and anchored exactly like a customer's, and exposed read-only at /public/self/* so anyone
// can verify what the platform did. Payloads carry ids and hashed emails, never PII.
import { createHash } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { openProject, now, type Config } from "./db.js";
import type { Signer } from "./signing.js";
import { ingest, search, getEvent, verifyRange, exportLines } from "./events.js";
import { anchorsFor, proofForEvent, verifyRoots } from "./anchorLoop.js";
import { ndjsonResponse } from "./app.js";

export const SELF_PROJECT = "auditkit";
export const SELF_TENANT = "platform";

export interface SelfAudit {
  /** Fire-and-forget; a self-audit failure must never fail the user's request. */
  log(action: string, actor: string, target?: string | null, payload?: Record<string, unknown>): void;
}

/** Stable, non-reversible handle for an email so the log can correlate without storing the address. */
export function emailHandle(email: string): string {
  return "u:" + createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function ensureSelfProject(reg: DatabaseSync, cfg: Config): void {
  if (!reg.prepare("SELECT 1 FROM project WHERE id = ?").get(SELF_PROJECT)) {
    reg.prepare("INSERT INTO project (id, name, plan, created_at) VALUES (?, 'AuditKit platform (self-audit)', 'business', ?)").run(SELF_PROJECT, now());
  }
  openProject(cfg, SELF_PROJECT);
}

export function makeSelfAudit(cfg: Config, signer: Signer, log: (m: string) => void = console.error): SelfAudit {
  return {
    log(action, actor, target = null, payload) {
      try {
        ingest(openProject(cfg, SELF_PROJECT), SELF_PROJECT, signer, [{ tenant: SELF_TENANT, actor, action, target, payload: payload ?? null }]);
      } catch (e) {
        log(`[self-audit] failed to record ${action}: ${(e as Error).message}`);
      }
    },
  };
}

export const noSelfAudit: SelfAudit = { log() {} };

/** Public, unauthenticated, read-only view of the platform's own chain. */
export function buildSelfAuditRoutes(cfg: Config, reg: DatabaseSync, signer: Signer, anchorPublicKey?: string): Hono {
  const app = new Hono();
  const db = () => openProject(cfg, SELF_PROJECT);
  const hasAnchor = (id: string) => anchorsFor(reg, id).length > 0;
  app.get("/public/self/events", (c) => {
    const q = c.req.query();
    const query: Parameters<typeof search>[1] = { tenant: SELF_TENANT };
    for (const k of ["actor", "action", "from", "to", "cursor"] as const) if (q[k]) query[k] = q[k];
    const lim = z.coerce.number().int().min(1).max(200).safeParse(q.limit);
    if (lim.success) query.limit = lim.data;
    return c.json(search(db(), query), 200, { "cache-control": "public, max-age=15" });
  });
  app.get("/public/self/events/:id", (c) => {
    const ev = getEvent(db(), c.req.param("id"));
    return ev && ev.tenant === SELF_TENANT ? c.json(ev) : c.json({ error: { code: "not_found", message: "no such event" } }, 404);
  });
  app.get("/public/self/events/:id/proof", (c) => {
    const ev = getEvent(db(), c.req.param("id"));
    return ev && ev.tenant === SELF_TENANT ? c.json(proofForEvent(db(), reg, ev.id)) : c.json({ error: { code: "not_found", message: "no such event" } }, 404);
  });
  app.get("/public/self/verify", (c) => c.json(verifyRange(db(), SELF_PROJECT, SELF_TENANT, 0, undefined, hasAnchor, (t, a, b) => verifyRoots(db(), reg, t, a, b)), 200, { "cache-control": "public, max-age=15" }));
  app.get("/public/self/export", (c) => {
    const q = z.object({ from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    return ndjsonResponse(exportLines(db(), SELF_PROJECT, SELF_TENANT, signer, (id) => anchorsFor(reg, id), cfg.publicHost ?? "localhost", q.from, q.to, anchorPublicKey), "auditkit-platform");
  });
  return app;
}
