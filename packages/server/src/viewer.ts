// Viewer tokens: a read-only, tenant-scoped, expiring token a customer hands to an auditor
// or embeds in their own admin UI. Token = vt_<projectId>_<secret>; only the sha256 is stored.
import { randomBytes } from "node:crypto";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { sha256Hex } from "@auditkit/core";
import { openProject, now, UnknownProjectError, type Config } from "./db.js";
import type { Signer } from "./signing.js";
import { search, getEvent, verifyRange, exportLines, getOrCreateTenant } from "./events.js";
import { anchorsFor, proofForEvent, verifyRoots } from "./anchorLoop.js";
import { contentDisposition } from "./app.js";

export interface ViewerToken { id: string; tenant: string; expires_at: string; created_at: string; revoked_at: string | null }

export function createViewerToken(db: DatabaseSync, projectId: string, tenantExt: string, ttlHours: number): { id: string; token: string; expires_at: string } {
  const tenant = getOrCreateTenant(db, tenantExt);
  const secret = randomBytes(24).toString("base64url");
  const token = `vt_${projectId}_${secret}`;
  const id = "vt_" + randomBytes(6).toString("hex");
  const expires_at = new Date(Date.now() + ttlHours * 3600_000).toISOString();
  db.prepare("INSERT INTO viewer_token (id, token_hash, tenant_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(id, sha256Hex(token), tenant.id, expires_at, now());
  return { id, token, expires_at };
}

export function listViewerTokens(db: DatabaseSync): ViewerToken[] {
  return db.prepare(
    "SELECT v.id, t.external_id AS tenant, v.expires_at, v.created_at, v.revoked_at FROM viewer_token v JOIN tenant t ON t.id = v.tenant_id ORDER BY v.created_at DESC",
  ).all() as unknown as ViewerToken[];
}

export function revokeViewerToken(db: DatabaseSync, id: string): boolean {
  return db.prepare("UPDATE viewer_token SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(now(), id).changes === 1;
}

interface Resolved { projectId: string; db: DatabaseSync; tenant: string }

function resolve(cfg: Config, token: string | undefined): Resolved | null {
  const m = /^vt_(p_[a-z0-9]+|demo)_[A-Za-z0-9_-]{20,}$/.exec(token ?? "");
  if (!m) return null;
  const projectId = m[1]!;
  let db: DatabaseSync;
  try { db = openProject(cfg, projectId); } catch (e) { if (e instanceof UnknownProjectError) return null; throw e; }
  const row = db.prepare(
    "SELECT t.external_id AS tenant FROM viewer_token v JOIN tenant t ON t.id = v.tenant_id WHERE v.token_hash = ? AND v.revoked_at IS NULL AND v.expires_at > ?",
  ).get(sha256Hex(token!), now()) as { tenant: string } | undefined;
  return row ? { projectId, db, tenant: row.tenant } : null;
}

type Env = { Variables: { v: Resolved } };

/** Public, read-only routes under /viewer, authenticated by ?token= or Bearer vt_... */
export function buildViewerRoutes(cfg: Config, reg: DatabaseSync, signer: Signer): Hono<Env> {
  const app = new Hono<Env>();
  const err = (c: Context, status: 401 | 404, code: string, message: string) => c.json({ error: { code, message } }, status);
  app.use("/api/viewer/*", async (c, next) => {
    const auth = c.req.header("authorization");
    const token = c.req.query("token") ?? (auth?.startsWith("Bearer ") ? auth.slice(7) : undefined);
    const v = resolve(cfg, token);
    if (!v) return err(c, 401, "unauthorized", "missing, expired or revoked viewer token");
    c.set("v", v);
    await next();
  });
  const hasAnchor = (id: string) => anchorsFor(reg, id).length > 0;
  app.get("/api/viewer/events", (c) => {
    const { db, tenant } = c.get("v");
    const q = c.req.query();
    const query: Parameters<typeof search>[1] = { tenant };
    for (const k of ["actor", "action", "from", "to", "cursor"] as const) if (q[k]) query[k] = q[k];
    const lim = z.coerce.number().int().min(1).max(500).safeParse(q.limit);
    if (lim.success) query.limit = lim.data;
    return c.json(search(db, query));
  });
  app.get("/api/viewer/events/:id", (c) => {
    const { db, tenant } = c.get("v");
    const ev = getEvent(db, c.req.param("id"));
    return ev && ev.tenant === tenant ? c.json(ev) : err(c, 404, "not_found", "no such event");
  });
  app.get("/api/viewer/events/:id/proof", (c) => {
    const { db, tenant } = c.get("v");
    const ev = getEvent(db, c.req.param("id"));
    return ev && ev.tenant === tenant ? c.json(proofForEvent(db, reg, ev.id)) : err(c, 404, "not_found", "no such event");
  });
  app.get("/api/viewer/verify", (c) => {
    const { db, projectId, tenant } = c.get("v");
    const q = z.object({ from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    return c.json(verifyRange(db, projectId, tenant, q.from, q.to, hasAnchor, (t, a, b) => verifyRoots(db, reg, t, a, b)));
  });
  app.get("/api/viewer/export", (c) => {
    const { db, projectId, tenant } = c.get("v");
    const q = z.object({ from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    const lines = exportLines(db, projectId, tenant, signer, (id) => anchorsFor(reg, id), cfg.publicHost ?? "localhost", q.from, q.to);
    const enc = new TextEncoder();
    const body = new ReadableStream({ pull(ctrl) { const n = lines.next(); if (n.done) ctrl.close(); else ctrl.enqueue(enc.encode(JSON.stringify(n.value) + "\n")); } });
    return new Response(body, { headers: { "content-type": "application/x-ndjson", "content-disposition": contentDisposition(tenant) } });
  });
  app.get("/api/viewer/me", (c) => c.json({ tenant: c.get("v").tenant, project_id: c.get("v").projectId }));
  return app;
}
