// Routes the site uses: /auth/*, /app/*, /demo/*, /public/*, /webhooks/stripe. See docs/web-api.md.
import { Hono, type Context } from "hono";
import { z } from "zod";
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { openProject, now, type Config } from "./db.js";
import type { Signer } from "./signing.js";
import {
  requestMagicLink, redeemMagicLink, userFromSession, destroySession, setSessionCookie, clearSessionCookie, readSessionCookie,
  membership, userProjects, rateLimiter, clientIp, type Mailer, type User, type ProxyTrust,
} from "./auth.js";
import { createProject, createKey, revokeKey, type Scope } from "./keys.js";
import { ingest, search, getEvent, verifyRange, exportLines, listTenants, ValidationError, IdempotencyConflict } from "./events.js";
import { anchorsFor, proofForEvent, verifyRoots } from "./anchorLoop.js";
import { planOf } from "./plans.js";
import { ndjsonResponse } from "./app.js";
import { createViewerToken, listViewerTokens, revokeViewerToken } from "./viewer.js";
import { addTenantKey, listTenantKeys, revokeTenantKey, setRequireClientSig } from "./tenantKeys.js";
import { checkoutUrl, portalUrl, verifyStripeSignature, applyStripeEvent, BillingNotConfigured, type BillingConfig } from "./billing.js";

export interface WebDeps {
  cfg: Config;
  reg: DatabaseSync;
  signer: Signer;
  mailer: Mailer;
  billing: BillingConfig;
  anchorPublicKey?: string | undefined;
  siteUrl: string;
  secureCookies: boolean;
  demoProjectId: string;
  /** See ProxyTrust. Production behind our nginx: "x-real-ip". */
  proxyTrust?: ProxyTrust;
}

type Env = { Variables: { user: User; db: DatabaseSync; projectId: string; role: string } };

const err = (c: Context, status: 400 | 401 | 403 | 404 | 429 | 501, code: string, message: string) => c.json({ error: { code, message } }, status);

export function monthlyUsage(db: DatabaseSync): number {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  return (db.prepare("SELECT COUNT(*) AS n FROM event WHERE received_at >= ?").get(start.toISOString()) as { n: number }).n;
}

export function buildWebRoutes(d: WebDeps): Hono<Env> {
  const app = new Hono<Env>();
  const loginLimit = rateLimiter(5, 10 * 60 * 1000);
  const demoLimit = rateLimiter(30, 60 * 1000);
  const ip = (c: Context) => clientIp(c, d.proxyTrust ?? "none");
  const DEMO_MAX_PER_VISITOR = 200;

  // ---- auth
  app.post("/auth/magic", async (c) => {
    if (!loginLimit(ip(c))) return err(c, 429, "rate_limited", "too many sign-in requests; try again in a few minutes");
    const body = z.object({ email: z.string().max(254), next: z.string().max(4096).optional() }).parse(await c.req.json());
    await requestMagicLink(d.reg, d.mailer, d.siteUrl, body.email, body.next);
    return c.json({ sent: true }, 202);
  });
  // Link scanners (Outlook SafeLinks etc.) GET every URL in an email; the single-use token is only redeemed on POST.
  app.get("/auth/callback", (c) => {
    const token = (c.req.query("token") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
    if (!token) return c.redirect("/login?error=expired", 302);
    return c.html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signing in · AuditKit</title>
<style>body{margin:0;background:#0b0d10;color:#e6e8eb;font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{text-align:center}button{padding:12px 20px;border-radius:8px;border:0;background:#4f8cff;color:#fff;font-weight:600;cursor:pointer}</style></head>
<body><main><form method="post" action="/auth/callback"><input type="hidden" name="token" value="${token}"><p>Finishing sign-in…</p><button type="submit">Continue</button></form>
<script>document.forms[0].submit()</script></main></body></html>`);
  });
  app.post("/auth/callback", async (c) => {
    const form = Object.fromEntries((await c.req.formData()).entries()) as Record<string, string>;
    const r = redeemMagicLink(d.reg, form.token ?? "");
    if (!r) return c.redirect("/login?error=expired", 302);
    setSessionCookie(c, r.session, d.secureCookies);
    return c.redirect(r.next, 302);
  });
  app.get("/auth/me", (c) => {
    const u = userFromSession(d.reg, readSessionCookie(c));
    return u ? c.json({ user: u }) : err(c, 401, "unauthorized", "not signed in");
  });
  app.post("/auth/logout", (c) => {
    destroySession(d.reg, readSessionCookie(c));
    clearSessionCookie(c);
    return c.body(null, 204);
  });

  // ---- app (session)
  app.use("/api/app/*", async (c, next) => {
    const u = userFromSession(d.reg, readSessionCookie(c));
    if (!u) return err(c, 401, "unauthorized", "not signed in");
    c.set("user", u);
    await next();
  });
  app.use("/api/app/projects/:id/*", async (c, next) => {
    const id = c.req.param("id");
    const role = membership(d.reg, c.get("user").id, id);
    if (!role) return err(c, 404, "not_found", "no such project");
    if (role === "viewer" && c.req.method !== "GET") return err(c, 403, "forbidden", "read-only membership");
    c.set("projectId", id); c.set("role", role); c.set("db", openProject(d.cfg, id));
    await next();
  });
  app.get("/api/app/projects/:id", (c) => {
    const id = c.req.param("id");
    const role = membership(d.reg, c.get("user").id, id);
    if (!role) return err(c, 404, "not_found", "no such project");
    const p = d.reg.prepare("SELECT id, name, plan, created_at FROM project WHERE id = ?").get(id) as { id: string; name: string; plan: string; created_at: string };
    const db = openProject(d.cfg, id);
    const limits = planOf(p.plan);
    const last = d.reg.prepare(
      "SELECT g.id, g.root_hash, g.created_at FROM global_root g WHERE EXISTS (SELECT 1 FROM project_root_index i WHERE i.global_root_id = g.id AND i.project_id = ?) ORDER BY g.created_at DESC LIMIT 1",
    ).get(id) as { id: string; root_hash: string; created_at: string } | undefined;
    return c.json({
      ...p, role,
      usage: { events_this_month: monthlyUsage(db), limit_events: limits.events_per_month, retention_days: limits.retention_days, anchor_interval_seconds: limits.anchor_interval_seconds },
      tenants: listTenants(db).length,
      last_anchor: last ? { global_root: last.root_hash, created_at: last.created_at, anchors: anchorsFor(d.reg, last.id) } : null,
    });
  });
  app.get("/api/app/projects", (c) => {
    const projects = userProjects(d.reg, c.get("user").id).map((p) => {
      const limits = planOf(p.plan);
      return { ...p, events_this_month: monthlyUsage(openProject(d.cfg, p.id)), limit_events: limits.events_per_month };
    });
    return c.json({ projects });
  });
  app.post("/api/app/projects", async (c) => {
    const body = z.object({ name: z.string().min(1).max(100) }).parse(await c.req.json());
    const { id } = createProject(d.reg, body.name);
    d.reg.prepare("INSERT INTO membership (user_id, project_id, role, created_at) VALUES (?, ?, 'owner', ?)").run(c.get("user").id, id, now());
    return c.json({ id, name: body.name, plan: "free" }, 201);
  });
  app.get("/api/app/projects/:id/keys", (c) => {
    const keys = d.reg.prepare("SELECT id, prefix, mode, scopes, created_at, revoked_at FROM api_key WHERE project_id = ? ORDER BY created_at DESC").all(c.get("projectId")) as Array<{ scopes: string }>;
    return c.json({ keys: keys.map((k) => ({ ...k, scopes: k.scopes.split(",") })) });
  });
  app.post("/api/app/projects/:id/keys", async (c) => {
    const body = z.object({ mode: z.enum(["live", "test"]), scopes: z.array(z.enum(["read", "write", "erase", "admin"])).min(1) }).parse(await c.req.json());
    return c.json(createKey(d.reg, c.get("projectId"), body.mode, body.scopes as Scope[]), 201);
  });
  app.delete("/api/app/projects/:id/keys/:keyId", (c) =>
    revokeKey(d.reg, c.get("projectId"), c.req.param("keyId")) ? c.json({ revoked: true }) : err(c, 404, "not_found", "no such key"),
  );
  app.get("/api/app/projects/:id/viewer-tokens", (c) => c.json({ tokens: listViewerTokens(c.get("db")) }));
  app.post("/api/app/projects/:id/viewer-tokens", async (c) => {
    const body = z.object({ tenant: z.string().min(1).max(200), ttl_hours: z.number().int().min(1).max(24 * 90).optional() }).parse(await c.req.json());
    const t = createViewerToken(c.get("db"), c.get("projectId"), body.tenant, body.ttl_hours ?? 24 * 7);
    return c.json({ ...t, url: `${d.siteUrl}/viewer?token=${t.token}` }, 201);
  });
  app.delete("/api/app/projects/:id/viewer-tokens/:tokenId", (c) =>
    revokeViewerToken(c.get("db"), c.req.param("tokenId")) ? c.json({ revoked: true }) : err(c, 404, "not_found", "no such token"),
  );
  app.get("/api/app/projects/:id/tenants/:tenant/keys", (c) => c.json({ keys: listTenantKeys(c.get("db"), c.req.param("tenant")) }));
  app.post("/api/app/projects/:id/tenants/:tenant/keys", async (c) => {
    const body = z.object({ public_key: z.string().min(40).max(200) }).parse(await c.req.json());
    return c.json(addTenantKey(c.get("db"), c.req.param("tenant"), body.public_key), 201);
  });
  app.delete("/api/app/projects/:id/tenants/:tenant/keys/:keyId", (c) =>
    revokeTenantKey(c.get("db"), c.req.param("keyId")) ? c.json({ revoked: true }) : err(c, 404, "not_found", "no such key"),
  );
  app.post("/api/app/projects/:id/tenants/:tenant/policy", async (c) => {
    const body = z.object({ require_client_sig: z.boolean() }).parse(await c.req.json());
    setRequireClientSig(c.get("db"), c.req.param("tenant"), body.require_client_sig);
    return c.json({ ok: true });
  });
  app.get("/api/app/projects/:id/tenants", (c) => c.json({ tenants: listTenants(c.get("db")) }));
  app.get("/api/app/projects/:id/events", (c) => {
    const q = c.req.query();
    const query: Parameters<typeof search>[1] = {};
    for (const k of ["tenant", "actor", "action", "from", "to", "cursor"] as const) if (q[k]) query[k] = q[k];
    const lim = z.coerce.number().int().min(1).max(500).safeParse(q.limit);
    if (lim.success) query.limit = lim.data;
    return c.json(search(c.get("db"), query));
  });
  app.get("/api/app/projects/:id/events/:eventId", (c) => {
    const ev = getEvent(c.get("db"), c.req.param("eventId"));
    return ev ? c.json(ev) : err(c, 404, "not_found", "no such event");
  });
  app.get("/api/app/projects/:id/events/:eventId/proof", (c) => {
    const p = proofForEvent(c.get("db"), d.reg, c.req.param("eventId"));
    return p ? c.json(p) : err(c, 404, "not_found", "no such event");
  });
  app.get("/api/app/projects/:id/verify", (c) => {
    const q = z.object({ tenant: z.string(), from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    return c.json(verifyRange(c.get("db"), c.get("projectId"), q.tenant, q.from, q.to, (id) => anchorsFor(d.reg, id).length > 0, (t, a, b) => verifyRoots(c.get("db"), d.reg, t, a, b)));
  });
  app.get("/api/app/projects/:id/export", (c) => {
    const q = z.object({ tenant: z.string(), from: z.coerce.number().int().min(0).optional(), to: z.coerce.number().int().min(0).optional() }).parse(c.req.query());
    return ndjsonResponse(exportLines(c.get("db"), c.get("projectId"), q.tenant, d.signer, (id) => anchorsFor(d.reg, id), d.cfg.publicHost ?? "localhost", q.from, q.to, d.anchorPublicKey), q.tenant);
  });
  app.post("/api/app/projects/:id/billing/checkout", async (c) => {
    if (c.get("role") !== "owner") return err(c, 403, "forbidden", "only the project owner can change billing");
    const body = z.object({ plan: z.enum(["pro", "business"]) }).parse(await c.req.json());
    try {
      return c.json({ url: await checkoutUrl(d.billing, d.reg, c.get("projectId"), body.plan, c.get("user").email) });
    } catch (e) {
      if (e instanceof BillingNotConfigured) return err(c, 501, "billing_not_configured", e.message);
      throw e;
    }
  });
  app.post("/api/app/projects/:id/billing/portal", async (c) => {
    if (c.get("role") !== "owner") return err(c, 403, "forbidden", "only the project owner can change billing");
    try {
      return c.json({ url: await portalUrl(d.billing, d.reg, c.get("projectId")) });
    } catch (e) {
      if (e instanceof BillingNotConfigured) return err(c, 501, "billing_not_configured", e.message);
      throw e;
    }
  });

  // ---- stripe webhook
  app.post("/webhooks/stripe", async (c) => {
    if (!d.billing.webhookSecret) return err(c, 501, "billing_not_configured", "STRIPE_WEBHOOK_SECRET");
    const payload = await c.req.text();
    if (!verifyStripeSignature(d.billing.webhookSecret, c.req.header("stripe-signature"), payload)) return err(c, 400, "bad_signature", "invalid Stripe signature");
    applyStripeEvent(d.billing, d.reg, JSON.parse(payload));
    return c.json({ received: true });
  });

  // ---- public
  app.get("/public/anchors", (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
    const roots = d.reg.prepare("SELECT id, root_hash, created_at, project_roots FROM global_root ORDER BY created_at DESC LIMIT ?").all(limit) as Array<{ id: string; root_hash: string; created_at: string; project_roots: string }>;
    return c.json({
      anchors: roots.map((r) => ({
        global_root: r.root_hash, created_at: r.created_at, projects: (JSON.parse(r.project_roots) as unknown[]).length,
        receipts: anchorsFor(d.reg, r.id).map(({ kind, ref, status, anchored_at }) => ({ kind, ref, status, anchored_at })),
      })),
    }, 200, { "cache-control": "public, max-age=30" });
  });
  app.get("/public/stats", (c) => {
    const projects = (d.reg.prepare("SELECT COUNT(*) AS n FROM project").get() as { n: number }).n;
    const roots = (d.reg.prepare("SELECT COUNT(*) AS n FROM global_root").get() as { n: number }).n;
    const finals = (d.reg.prepare("SELECT COUNT(*) AS n FROM anchor WHERE status = 'final'").get() as { n: number }).n;
    let events = 0;
    for (const p of d.reg.prepare("SELECT id FROM project").all() as Array<{ id: string }>) {
      events += (openProject(d.cfg, p.id).prepare("SELECT COUNT(*) AS n FROM event").get() as { n: number }).n;
    }
    const round = (n: number) => (n < 1000 ? n : Math.round(n / 100) * 100);
    return c.json({ events_total: round(events), roots_total: roots, anchors_final: finals, projects }, 200, { "cache-control": "public, max-age=60" });
  });

  // ---- demo (unauthenticated; tenant = hash of caller IP, so visitors only see their own chain)
  const demoTenant = (c: Context) => "visitor_" + createHash("sha256").update(ip(c) + ":" + d.demoProjectId).digest("hex").slice(0, 12);
  app.use("/demo/*", async (c, next) => {
    if (!demoLimit(ip(c))) return err(c, 429, "rate_limited", "demo limit: 30 requests per minute");
    c.set("db", openProject(d.cfg, d.demoProjectId));
    await next();
  });
  app.post("/demo/log", async (c) => {
    const body = z.object({ actor: z.string().min(1).max(80), action: z.string().min(1).max(80), target: z.string().max(120).nullable().optional(), payload: z.record(z.unknown()).optional() }).parse(await c.req.json());
    if (JSON.stringify(body.payload ?? null).length > 2048) return err(c, 400, "invalid", "demo payloads are limited to 2 KB");
    const tenant = demoTenant(c);
    const t = c.get("db").prepare("SELECT head_position FROM tenant WHERE external_id = ?").get(tenant) as { head_position: number } | undefined;
    if ((t?.head_position ?? -1) + 1 >= DEMO_MAX_PER_VISITOR) return err(c, 429, "rate_limited", `demo chains are limited to ${DEMO_MAX_PER_VISITOR} events; sign up for a real project`);
    if (monthlyUsage(c.get("db")) >= planOf("free").events_per_month) return err(c, 429, "rate_limited", "the public demo is full for today");
    const [r] = ingest(c.get("db"), d.demoProjectId, d.signer, [{ ...body, tenant, target: body.target ?? null }]);
    return c.json(r, 201);
  });
  app.get("/demo/events", (c) => c.json(search(c.get("db"), { tenant: demoTenant(c), limit: 20 })));
  app.get("/demo/verify", (c) => c.json(verifyRange(c.get("db"), d.demoProjectId, demoTenant(c), 0, undefined, (id) => anchorsFor(d.reg, id).length > 0, (t, a, b) => verifyRoots(c.get("db"), d.reg, t, a, b))));
  app.get("/demo/proof/:id", (c) => {
    const ev = getEvent(c.get("db"), c.req.param("id"));
    if (!ev || ev.tenant !== demoTenant(c)) return err(c, 404, "not_found", "no such event");
    return c.json(proofForEvent(c.get("db"), d.reg, ev.id));
  });

  app.onError((e, c) => {
    if (e instanceof IdempotencyConflict) return c.json({ error: { code: "idempotency_conflict", message: e.message } }, 409);
    if (e instanceof ValidationError) return err(c, 400, "invalid", e.message);
    if (e instanceof z.ZodError) return err(c, 400, "invalid", e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    console.error(e);
    return c.json({ error: { code: "internal", message: "internal error" } }, 500);
  });
  return app;
}
