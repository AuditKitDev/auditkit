import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { openProject, setProjectGuard, projectGuardFromRegistry, type Config } from "./db.js";
import { authenticate, createKey, revokeKey, type Principal, type Scope } from "./keys.js";
import type { Signer } from "./signing.js";
import { ingest, search, getEvent, erase, verifyRange, exportLines, listTenants, getOrCreateTenant, ValidationError, IdempotencyConflict, type EventInput } from "./events.js";
import { anchorsFor, proofForEvent, verifyRoots } from "./anchorLoop.js";
import { openapi } from "./openapi.js";
import { mcpHandler } from "./mcp.js";
import { planOf } from "./plans.js";
import { buildWebRoutes, monthlyUsage, type WebDeps } from "./webRoutes.js";
import { buildViewerRoutes } from "./viewer.js";
import { rateLimiter } from "./auth.js";
import { addTenantKey, listTenantKeys, revokeTenantKey, setRequireClientSig } from "./tenantKeys.js";
import { buildOAuthRoutes, principalFromAccessToken, wwwAuthenticate } from "./oauth.js";
import { buildSelfAuditRoutes, noSelfAudit, type SelfAudit } from "./selfAudit.js";

export interface Deps {
  cfg: Config;
  reg: DatabaseSync;
  signer: Signer;
  anchorPolicy: { kinds: string[]; interval_seconds: number };
  /** base64 P-256 SPKI used to sign Rekor entries; published so verifiers bind Rekor receipts to this server. */
  anchorPublicKey?: string;
  /** Platform self-audit sink; defaults to a no-op (tests). */
  self?: SelfAudit;
  /** Site-facing routes (/auth, /app, /demo, /public, /webhooks). Omitted in pure-API tests. */
  web?: Omit<WebDeps, "cfg" | "reg" | "signer">;
}

type Env = { Variables: { principal: Principal; db: DatabaseSync } };

const eventSchema = z.object({
  tenant: z.string().min(1).max(200),
  actor: z.string().min(1).max(200),
  action: z.string().min(1).max(200),
  target: z.string().max(500).nullable().optional(),
  occurred_at: z.string().optional(),
  payload: z.unknown().optional().refine((p) => JSON.stringify(p ?? null).length <= 65_536, { message: "payload must be at most 64 KB as JSON" }),
  idempotency_key: z.string().max(200).optional(),
  client_sig: z.string().max(200).optional(),
});

/** Safe filename header: ASCII fallback plus RFC 5987 UTF-8 form. */
export function contentDisposition(tenant: string): string {
  const ascii = tenant.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "export";
  return `attachment; filename="auditkit-${ascii}.jsonl"; filename*=UTF-8''auditkit-${encodeURIComponent(tenant.slice(0, 80))}.jsonl`;
}

/** Streams export lines; the first line is produced eagerly so validation errors surface before any headers. */
export function ndjsonResponse(lines: Generator<unknown>, filename: string): Response {
  const first = lines.next(); // throws ValidationError for an unknown tenant
  const enc = new TextEncoder();
  let sentFirst = false;
  const body = new ReadableStream({
    pull(ctrl) {
      if (!sentFirst) { sentFirst = true; if (!first.done) { ctrl.enqueue(enc.encode(JSON.stringify(first.value) + "\n")); return; } }
      const n = lines.next();
      if (n.done) ctrl.close(); else ctrl.enqueue(enc.encode(JSON.stringify(n.value) + "\n"));
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson", "content-disposition": contentDisposition(filename) } });
}

export function needScope(c: Context<Env>, scope: Scope): Response | null {
  const p = c.get("principal");
  if (p.scopes.has("admin") || p.scopes.has(scope)) return null;
  return c.json({ error: { code: "forbidden", message: `key lacks scope ${scope}` } }, 403);
}

/** The month's events plus `adding` vs the project's plan. Shared by REST and MCP. */
export function planLimitExceeded(reg: DatabaseSync, db: DatabaseSync, projectId: string, adding: number): number | null {
  const p = reg.prepare("SELECT plan FROM project WHERE id = ?").get(projectId) as { plan: string } | undefined;
  const limit = planOf(p?.plan ?? "free").events_per_month;
  return monthlyUsage(db) + adding > limit ? limit : null;
}
function overLimit(deps: Deps, c: Context<Env>, adding: number): Response | null {
  const limit = planLimitExceeded(deps.reg, c.get("db"), c.get("principal").projectId, adding);
  return limit === null ? null : c.json({ error: { code: "plan_limit", message: `monthly event limit of ${limit} reached; upgrade the plan` } }, 429);
}

export function buildApp(deps: Deps): Hono<Env> {
  const app = new Hono<Env>();
  setProjectGuard(projectGuardFromRegistry(deps.reg)); // only registered projects get a DB file
  app.use("*", secureHeaders({ crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));
  app.use("*", bodyLimit({ maxSize: 1_000_000, onError: (c) => c.json({ error: { code: "too_large", message: "request body must be under 1 MB" } }, 413) }));
  const self = deps.self ?? noSelfAudit;
  if (deps.web) {
    app.route("/", buildWebRoutes({ ...deps.web, cfg: deps.cfg, reg: deps.reg, signer: deps.signer, anchorPublicKey: deps.anchorPublicKey, self }));
    app.route("/", buildOAuthRoutes(deps.reg, deps.web.siteUrl, self));
  }
  if (deps.self) app.route("/", buildSelfAuditRoutes(deps.cfg, deps.reg, deps.signer, deps.anchorPublicKey));
  const bearer = (c: Context<Env>): Principal | null => {
    const auth = c.req.header("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    return authenticate(deps.reg, token) ?? principalFromAccessToken(deps.reg, token);
  };
  app.route("/", buildViewerRoutes(deps.cfg, deps.reg, deps.signer, deps.anchorPublicKey));

  app.get("/.well-known/auditkit.json", (c) =>
    c.json({ server_public_key: deps.signer.publicKeySpkiB64, key_algorithm: "Ed25519", anchor_public_key: deps.anchorPublicKey ?? null, anchor_key_algorithm: "ECDSA P-256", anchors: deps.anchorPolicy.kinds, anchor_interval_seconds: deps.anchorPolicy.interval_seconds, export_version: 1 }),
  );
  app.get("/openapi.json", (c) => c.json(openapi));
  app.get("/health", (c) => c.json({ ok: true }));

  const keyLimit = rateLimiter(1200, 60_000); // per key per minute, any /v1 call
  app.use("/v1/*", async (c, next) => {
    const p = bearer(c);
    if (!p) return c.json({ error: { code: "unauthorized", message: "missing or invalid API key" } }, 401);
    if (!keyLimit(p.keyId)) return c.json({ error: { code: "rate_limited", message: "1200 requests per minute per key" } }, 429);
    c.set("principal", p);
    c.set("db", openProject(deps.cfg, p.projectId));
    await next();
  });
  app.use("/mcp", async (c, next) => {
    const p = bearer(c);
    if (!p) {
      const headers: Record<string, string> = deps.web ? { "www-authenticate": wwwAuthenticate(deps.web.siteUrl) } : {};
      return c.json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized. Connect via OAuth, or send Authorization: Bearer ak_..." }, id: null }, 401, headers);
    }
    c.set("principal", p);
    c.set("db", openProject(deps.cfg, p.projectId));
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof IdempotencyConflict) return c.json({ error: { code: "idempotency_conflict", message: err.message } }, 409);
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
    const limited = overLimit(deps, c, 1);
    if (limited) return limited;
    const [receipt] = ingest(c.get("db"), c.get("principal").projectId, deps.signer, [input]);
    return c.json(receipt, receipt!.duplicate ? 200 : 201);
  });

  app.post("/v1/events/bulk", async (c) => {
    const denied = needScope(c, "write");
    if (denied) return denied;
    const body = z.object({ events: z.array(eventSchema).min(1).max(1000) }).parse(await c.req.json());
    const limited = overLimit(deps, c, body.events.length);
    if (limited) return limited;
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
    const lim = z.coerce.number().int().min(1).max(500).safeParse(q.limit);
    if (lim.success) query.limit = lim.data; // anything else falls back to the default page size
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
    return c.json(verifyRange(c.get("db"), c.get("principal").projectId, q.tenant, q.from, q.to, (id) => anchorsFor(deps.reg, id).length > 0, (t, a, b) => verifyRoots(c.get("db"), deps.reg, t, a, b)));
  });

  app.get("/v1/export", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    const q = z.object({ tenant: z.string(), from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    return ndjsonResponse(exportLines(c.get("db"), c.get("principal").projectId, q.tenant, deps.signer, (id) => anchorsFor(deps.reg, id), deps.cfg.publicHost ?? "localhost", q.from, q.to, deps.anchorPublicKey), q.tenant);
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

  app.get("/v1/tenants/:tenant/keys", (c) => {
    const denied = needScope(c, "read");
    if (denied) return denied;
    return c.json({ keys: listTenantKeys(c.get("db"), c.req.param("tenant")) });
  });
  app.post("/v1/tenants/:tenant/keys", async (c) => {
    const denied = needScope(c, "write");
    if (denied) return denied;
    const body = z.object({ public_key: z.string().min(40).max(200) }).parse(await c.req.json());
    const made = addTenantKey(c.get("db"), c.req.param("tenant"), body.public_key);
    self.log("tenant_key.add", `key:${c.get("principal").keyId}`, made.id, { project_id: c.get("principal").projectId });
    return c.json(made, 201);
  });
  app.delete("/v1/tenants/:tenant/keys/:keyId", (c) => {
    const denied = needScope(c, "write");
    if (denied) return denied;
    const ok = revokeTenantKey(c.get("db"), c.req.param("keyId"));
    if (ok) self.log("tenant_key.revoke", `key:${c.get("principal").keyId}`, c.req.param("keyId"), { project_id: c.get("principal").projectId });
    return ok ? c.json({ revoked: true }) : c.json({ error: { code: "not_found", message: "no such key" } }, 404);
  });
  app.post("/v1/tenants/:tenant/policy", async (c) => {
    const denied = needScope(c, "admin");
    if (denied) return denied;
    const body = z.object({ require_client_sig: z.boolean() }).parse(await c.req.json());
    setRequireClientSig(c.get("db"), c.req.param("tenant"), body.require_client_sig);
    self.log("tenant_policy.set", `key:${c.get("principal").keyId}`, null, { project_id: c.get("principal").projectId, require_client_sig: body.require_client_sig });
    return c.json({ ok: true });
  });

  app.post("/v1/erase/:id", (c) => {
    const denied = needScope(c, "erase");
    if (denied) return denied;
    const r = erase(c.get("db"), c.get("principal").projectId, deps.signer, c.req.param("id"), `key:${c.get("principal").keyId}`);
    if (r) self.log("customer.erase", `key:${c.get("principal").keyId}`, c.req.param("id"), { project_id: c.get("principal").projectId });
    return r ? c.json({ erased: true, audit: r }) : c.json({ error: { code: "not_found", message: "no payload to erase" } }, 404);
  });

  app.post("/v1/keys", async (c) => {
    const denied = needScope(c, "admin");
    if (denied) return denied;
    const body = z.object({ mode: z.enum(["live", "test"]), scopes: z.array(z.enum(["read", "write", "erase", "admin"])).min(1) }).parse(await c.req.json());
    const made = createKey(deps.reg, c.get("principal").projectId, body.mode, body.scopes);
    self.log("api_key.create", `key:${c.get("principal").keyId}`, made.id, { project_id: c.get("principal").projectId, mode: body.mode, scopes: body.scopes });
    return c.json(made, 201);
  });
  app.delete("/v1/keys/:id", (c) => {
    const denied = needScope(c, "admin");
    if (denied) return denied;
    const ok = revokeKey(deps.reg, c.get("principal").projectId, c.req.param("id"));
    if (ok) self.log("api_key.revoke", `key:${c.get("principal").keyId}`, c.req.param("id"), { project_id: c.get("principal").projectId });
    return ok ? c.json({ revoked: true }) : c.json({ error: { code: "not_found", message: "no such key" } }, 404);
  });

  app.all("/mcp", (c) => mcpHandler(c, deps));

  return app;
}
