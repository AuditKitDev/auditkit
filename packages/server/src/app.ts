import { Hono, type Context } from "hono";
import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { openProject, type Config } from "./db.js";
import { authenticate, createKey, revokeKey, type Principal, type Scope } from "./keys.js";
import type { Signer } from "./signing.js";
import { ingest, search, getEvent, erase, verifyRange, exportLines, listTenants, getOrCreateTenant, ValidationError, type EventInput } from "./events.js";
import { anchorsFor, proofForEvent } from "./anchorLoop.js";
import { openapi } from "./openapi.js";
import { mcpHandler } from "./mcp.js";

export interface Deps {
  cfg: Config;
  reg: DatabaseSync;
  signer: Signer;
  anchorPolicy: { kinds: string[]; interval_seconds: number };
}

type Env = { Variables: { principal: Principal; db: DatabaseSync } };

const eventSchema = z.object({
  tenant: z.string().min(1).max(200),
  actor: z.string().min(1).max(200),
  action: z.string().min(1).max(200),
  target: z.string().max(500).nullable().optional(),
  occurred_at: z.string().optional(),
  payload: z.unknown().optional(),
  idempotency_key: z.string().max(200).optional(),
  client_sig: z.string().max(200).optional(),
});

export function needScope(c: Context<Env>, scope: Scope): Response | null {
  const p = c.get("principal");
  if (p.scopes.has("admin") || p.scopes.has(scope)) return null;
  return c.json({ error: { code: "forbidden", message: `key lacks scope ${scope}` } }, 403);
}

export function buildApp(deps: Deps): Hono<Env> {
  const app = new Hono<Env>();

  app.get("/.well-known/auditkit.json", (c) =>
    c.json({ server_public_key: deps.signer.publicKeySpkiB64, key_algorithm: "Ed25519", anchors: deps.anchorPolicy.kinds, anchor_interval_seconds: deps.anchorPolicy.interval_seconds, export_version: 1 }),
  );
  app.get("/openapi.json", (c) => c.json(openapi));
  app.get("/health", (c) => c.json({ ok: true }));

  app.use("/v1/*", async (c, next) => {
    const auth = c.req.header("authorization");
    const p = authenticate(deps.reg, auth?.startsWith("Bearer ") ? auth.slice(7) : undefined);
    if (!p) return c.json({ error: { code: "unauthorized", message: "missing or invalid API key" } }, 401);
    c.set("principal", p);
    c.set("db", openProject(deps.cfg, p.projectId));
    await next();
  });
  app.use("/mcp", async (c, next) => {
    const auth = c.req.header("authorization");
    const p = authenticate(deps.reg, auth?.startsWith("Bearer ") ? auth.slice(7) : undefined);
    if (!p) return c.json({ jsonrpc: "2.0", error: { code: -32001, message: "Missing or invalid API key. Send Authorization: Bearer ak_..." }, id: null }, 401);
    c.set("principal", p);
    c.set("db", openProject(deps.cfg, p.projectId));
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: { code: "invalid", message: err.message } }, 400);
    if (err instanceof z.ZodError) return c.json({ error: { code: "invalid", message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") } }, 400);
    console.error(err);
    return c.json({ error: { code: "internal", message: "internal error" } }, 500);
  });

  app.post("/v1/events", async (c) => {
    const denied = needScope(c, "write");
    if (denied) return denied;
    const body = eventSchema.parse(await c.req.json());
    const idem = c.req.header("idempotency-key");
    const input: EventInput = idem ? { ...body, idempotency_key: idem } : body;
    const [receipt] = ingest(c.get("db"), c.get("principal").projectId, deps.signer, [input]);
    return c.json(receipt, receipt!.duplicate ? 200 : 201);
  });

  app.post("/v1/events/bulk", async (c) => {
    const denied = needScope(c, "write");
    if (denied) return denied;
    const body = z.object({ events: z.array(eventSchema).min(1).max(1000) }).parse(await c.req.json());
    return c.json({ receipts: ingest(c.get("db"), c.get("principal").projectId, deps.signer, body.events) }, 201);
  });

  app.get("/v1/events", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    const q = c.req.query();
    const query: Parameters<typeof search>[1] = {};
    if (q.tenant) query.tenant = q.tenant;
    if (q.actor) query.actor = q.actor;
    if (q.action) query.action = q.action;
    if (q.from) query.from = q.from;
    if (q.to) query.to = q.to;
    if (q.cursor) query.cursor = q.cursor;
    if (q.limit) query.limit = Number(q.limit);
    return c.json(search(c.get("db"), query));
  });

  app.get("/v1/events/:id", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    const ev = getEvent(c.get("db"), c.req.param("id"));
    return ev ? c.json(ev) : c.json({ error: { code: "not_found", message: "no such event" } }, 404);
  });

  app.get("/v1/events/:id/proof", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    const p = proofForEvent(c.get("db"), deps.reg, c.req.param("id"));
    return p ? c.json(p) : c.json({ error: { code: "not_found", message: "no such event" } }, 404);
  });

  app.get("/v1/verify", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    const q = z.object({ tenant: z.string(), from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    return c.json(verifyRange(c.get("db"), c.get("principal").projectId, q.tenant, q.from, q.to, (id) => anchorsFor(deps.reg, id).length > 0));
  });

  app.get("/v1/export", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    const q = z.object({ tenant: z.string(), from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    const lines = exportLines(c.get("db"), c.get("principal").projectId, q.tenant, deps.signer, (id) => anchorsFor(deps.reg, id), deps.cfg.publicHost ?? "localhost", q.from, q.to);
    const body = new ReadableStream({
      pull(ctrl) {
        const n = lines.next();
        if (n.done) ctrl.close();
        else ctrl.enqueue(new TextEncoder().encode(JSON.stringify(n.value) + "\n"));
      },
    });
    return new Response(body, { headers: { "content-type": "application/x-ndjson", "content-disposition": `attachment; filename="auditkit-${q.tenant}.jsonl"` } });
  });

  app.get("/v1/tenants", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    return c.json({ tenants: listTenants(c.get("db")) });
  });
  app.post("/v1/tenants", async (c) => {
    const denied = needScope(c, "write");
    if (denied) return denied;
    const body = z.object({ external_id: z.string().min(1).max(200) }).parse(await c.req.json());
    const t = getOrCreateTenant(c.get("db"), body.external_id);
    return c.json({ id: t.id, external_id: t.external_id }, 201);
  });

  app.post("/v1/erase/:id", (c) => {
    const denied = needScope(c, "erase");
    if (denied) return denied;
    const ok = erase(c.get("db"), c.req.param("id"));
    return ok ? c.json({ erased: true }) : c.json({ error: { code: "not_found", message: "no payload to erase" } }, 404);
  });

  app.post("/v1/keys", async (c) => {
    const denied = needScope(c, "admin");
    if (denied) return denied;
    const body = z.object({ mode: z.enum(["live", "test"]), scopes: z.array(z.enum(["read", "write", "erase", "admin"])).min(1) }).parse(await c.req.json());
    return c.json(createKey(deps.reg, c.get("principal").projectId, body.mode, body.scopes), 201);
  });
  app.delete("/v1/keys/:id", (c) => {
    const denied = needScope(c, "admin");
    if (denied) return denied;
    return revokeKey(deps.reg, c.get("principal").projectId, c.req.param("id")) ? c.json({ revoked: true }) : c.json({ error: { code: "not_found", message: "no such key" } }, 404);
  });

  app.all("/mcp", (c) => mcpHandler(c, deps));

  return app;
}
