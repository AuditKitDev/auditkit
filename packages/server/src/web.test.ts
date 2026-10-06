import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { openRegistry, closeAll, type Config } from "./db.js";
import { loadSigner } from "./signing.js";
import { buildApp } from "./app.js";
import { migrateAuth, setSandboxProject, type Mailer } from "./auth.js";
import { migrateBilling, applyStripeEvent, type BillingConfig } from "./billing.js";
import { tick } from "./anchorLoop.js";
import type { Anchor } from "@auditkit/core";

let cfg: Config;
let app: ReturnType<typeof buildApp>;
let reg: ReturnType<typeof openRegistry>;
let cookie = "";
let projectId = "";
const sent: string[] = [];
const mailer: Mailer = { async send(_to, _s, text) { sent.push(text); } };
const billing: BillingConfig = { prices: {}, siteUrl: "http://site", webhookSecret: "whsec_test" };
const fakeAnchor: Anchor = {
  kind: "rekor",
  async anchor() { return { kind: "rekor", ref: "fake", proof: "e30=", anchored_at: new Date().toISOString(), status: "final" }; },
  async upgrade(r) { return r; },
  async verify() { return { ok: true, level: "final" }; },
};

const req = (path: string, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { "content-type": "application/json", cookie, ...(init.headers ?? {}) } });

beforeAll(() => {
  cfg = { dataDir: mkdtempSync(join(tmpdir(), "auditkit-web-")) };
  reg = openRegistry(cfg);
  migrateAuth(reg); migrateBilling(reg);
  reg.prepare("INSERT INTO project (id, name, plan, created_at) VALUES ('demo', 'demo', 'business', '2026-01-01T00:00:00Z')").run();
  app = buildApp({ cfg, reg, signer: loadSigner(cfg.dataDir), anchorPolicy: { kinds: ["rekor"], interval_seconds: 1 }, web: { mailer, billing, siteUrl: "http://site", secureCookies: false, demoProjectId: "demo", proxyTrust: "x-forwarded-for" } });
});
afterAll(() => { closeAll(); rmSync(cfg.dataDir, { recursive: true, force: true }); });

describe("auth", () => {
  it("magic link: request, redeem once, session works, logout", async () => {
    expect((await req("/auth/magic", { method: "POST", body: JSON.stringify({ email: "Owner@Example.com", next: "/app" }) })).status).toBe(202);
    expect((await req("/auth/magic", { method: "POST", body: JSON.stringify({ email: "not-an-email" }) })).status).toBe(202); // no enumeration
    expect(sent).toHaveLength(1);
    const link = /http:\/\/site(\/auth\/callback\?token=[A-Za-z0-9_-]+)/.exec(sent[0]!)![1]!;
    expect((await req(link)).status).toBe(200); // GET only renders the form; scanners cannot consume the token
    const token = /token=([A-Za-z0-9_-]+)/.exec(link)![1]!;
    const post = (t: string) => app.request("/auth/callback", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `token=${t}`, redirect: "manual" });
    const cb = await post(token);
    expect(cb.status).toBe(302);
    expect(cb.headers.get("location")).toBe("/app");
    cookie = cb.headers.get("set-cookie")!.split(";")[0]!;
    expect(cookie.startsWith("ak_session=")).toBe(true);
    expect((await post(token)).headers.get("location")).toContain("error=expired"); // single use
    const me = await (await req("/auth/me")).json();
    expect(me.user.email).toBe("owner@example.com");
    expect((await app.request("/auth/me")).status).toBe(401);
  });
  it("rate limits sign-in requests", async () => {
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await req("/auth/magic", { method: "POST", body: JSON.stringify({ email: `x${i}@example.com` }) })).status;
    expect(last).toBe(429);
  });
});

describe("app", () => {
  it("first login created a project; keys, events, verify, export work through the session", async () => {
    const { projects } = await (await req("/api/app/projects")).json();
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ name: "example.com", plan: "free", role: "owner", limit_events: 10000 });
    projectId = projects[0].id;

    const k = await (await req(`/api/app/projects/${projectId}/keys`, { method: "POST", body: JSON.stringify({ mode: "live", scopes: ["write", "read"] }) })).json();
    expect(k.key.startsWith("ak_live_")).toBe(true);
    const r = await app.request("/v1/events", { method: "POST", headers: { authorization: `Bearer ${k.key}`, "content-type": "application/json" }, body: JSON.stringify({ tenant: "acme", actor: "u", action: "a.b", payload: { x: 1 } }) });
    expect(r.status).toBe(201);

    const list = await (await req(`/api/app/projects/${projectId}/events?tenant=acme`)).json();
    expect(list.events).toHaveLength(1);
    const ev = await (await req(`/api/app/projects/${projectId}/events/${list.events[0].id}`)).json();
    expect(ev.payload).toEqual({ x: 1 });
    expect((await (await req(`/api/app/projects/${projectId}/verify?tenant=acme`)).json()).valid).toBe(true);
    expect((await req(`/api/app/projects/${projectId}/export?tenant=acme`)).headers.get("content-type")).toContain("ndjson");
    const keys = await (await req(`/api/app/projects/${projectId}/keys`)).json();
    expect(keys.keys[0]).toMatchObject({ mode: "live", scopes: ["write", "read"] });
    expect((await req(`/api/app/projects/${projectId}/keys/${k.id}`, { method: "DELETE" })).status).toBe(200);

    const overview = await (await req(`/api/app/projects/${projectId}`)).json();
    expect(overview).toMatchObject({ plan: "free", usage: { events_this_month: 1, limit_events: 10000 }, tenants: 1, last_anchor: null });
    await tick(cfg, reg, [fakeAnchor]);
    const after = await (await req(`/api/app/projects/${projectId}`)).json();
    expect(after.last_anchor.anchors[0]).toMatchObject({ kind: "rekor", status: "final" });
  });
  it("cannot see another user's project", async () => {
    const { id } = await (await req("/api/app/projects", { method: "POST", body: JSON.stringify({ name: "second" }) })).json();
    expect((await req(`/api/app/projects/${id}`)).status).toBe(200);
    const other = buildApp({ cfg, reg, signer: loadSigner(cfg.dataDir), anchorPolicy: { kinds: [], interval_seconds: 1 }, web: { mailer, billing, siteUrl: "http://site", secureCookies: false, demoProjectId: "demo" } });
    expect((await other.request(`/api/app/projects/${id}`, { headers: { cookie: "ak_session=bogus" } })).status).toBe(401);
  });
  it("billing is a clean 501 until configured; webhook upgrades the plan", async () => {
    const r = await req(`/api/app/projects/${projectId}/billing/checkout`, { method: "POST", body: JSON.stringify({ plan: "pro" }) });
    expect(r.status).toBe(501);
    expect((await r.json()).error.code).toBe("billing_not_configured");

    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_1", status: "active", metadata: { project_id: projectId }, items: { data: [{ price: { id: "price_pro" } }] } } } });
    const t = Math.floor(Date.now() / 1000);
    const sig = `t=${t},v1=${createHmac("sha256", "whsec_test").update(`${t}.${payload}`).digest("hex")}`;
    expect((await app.request("/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "t=1,v1=bad" }, body: payload })).status).toBe(400);
    // prices map is empty in this config, so the plan can't be resolved from price_pro; apply directly with a configured map
    applyStripeEvent({ ...billing, prices: { pro: "price_pro" } }, reg, JSON.parse(payload));
    expect((await (await req(`/api/app/projects/${projectId}`)).json()).plan).toBe("pro");
    expect((await app.request("/webhooks/stripe", { method: "POST", headers: { "stripe-signature": sig }, body: payload })).status).toBe(200); // idempotent replay ok
  });
  it("enforces the plan's monthly event limit", async () => {
    reg.prepare("UPDATE project SET plan = 'free' WHERE id = ?").run(projectId);
    const k = await (await req(`/api/app/projects/${projectId}/keys`, { method: "POST", body: JSON.stringify({ mode: "test", scopes: ["write"] }) })).json();
    const events = Array.from({ length: 1000 }, (_, i) => ({ tenant: "bulk", actor: "b", action: "x", target: `${i}` }));
    for (let i = 0; i < 9; i++) await app.request("/v1/events/bulk", { method: "POST", headers: { authorization: `Bearer ${k.key}`, "content-type": "application/json" }, body: JSON.stringify({ events }) });
    const last = await app.request("/v1/events/bulk", { method: "POST", headers: { authorization: `Bearer ${k.key}`, "content-type": "application/json" }, body: JSON.stringify({ events }) });
    expect(last.status).toBe(429);
    expect((await last.json()).error.code).toBe("plan_limit");
  });
});

describe("customer signing keys", () => {
  it("verifies client_sig on ingest once a key is registered; enforces when required", async () => {
    const { generateKeyPairSync, sign } = await import("node:crypto");
    const { clientSignable } = await import("@auditkit/core");
    const kp = generateKeyPairSync("ed25519");
    const spki = kp.publicKey.export({ format: "der", type: "spki" }).toString("base64");
    const k = await (await req(`/api/app/projects/${projectId}/keys`, { method: "POST", body: JSON.stringify({ mode: "test", scopes: ["admin"] }) })).json();
    const v1 = (path: string, init: RequestInit = {}) => app.request(path, { ...init, headers: { authorization: `Bearer ${k.key}`, "content-type": "application/json" } });
    const occurred_at = new Date().toISOString();
    const signed = (actor: string, action: string, key = kp.privateKey) => {
      const msg = Buffer.from(clientSignable({ tenant: "signed", actor, action, target: null, occurred_at }), "hex");
      return JSON.stringify({ tenant: "signed", actor, action, occurred_at, client_sig: sign(null, msg, key).toString("base64") });
    };
    // no key registered yet: a client_sig is refused rather than silently stored
    expect((await v1("/v1/events", { method: "POST", body: signed("u", "a") })).status).toBe(400);
    expect((await v1("/v1/tenants/signed/keys", { method: "POST", body: JSON.stringify({ public_key: spki }) })).status).toBe(201);
    expect((await v1("/v1/events", { method: "POST", body: signed("u", "a") })).status).toBe(201);
    // wrong key fails
    const other = generateKeyPairSync("ed25519");
    expect((await v1("/v1/events", { method: "POST", body: signed("u", "a", other.privateKey) })).status).toBe(400);
    // unsigned still allowed until required
    expect((await v1("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "signed", actor: "u", action: "unsigned" }) })).status).toBe(201);
    expect((await v1("/v1/tenants/signed/policy", { method: "POST", body: JSON.stringify({ require_client_sig: true }) })).status).toBe(200);
    expect((await v1("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "signed", actor: "u", action: "unsigned" }) })).status).toBe(400);
    expect((await v1("/v1/events", { method: "POST", body: signed("u", "b") })).status).toBe(201);
    // the export carries the client_sig so the offline verifier can check it with the public key
    const txt = await (await v1("/v1/export?tenant=signed")).text();
    expect(txt.split("\n").filter((l) => l.includes('"client_sig"')).length).toBe(2);
    const keys = await (await req(`/api/app/projects/${projectId}/tenants/signed/keys`)).json();
    expect(keys.keys).toHaveLength(1);
    expect((await req(`/api/app/projects/${projectId}/tenants/signed/keys/${keys.keys[0].id}`, { method: "DELETE" })).status).toBe(200);
  });
});

describe("per-plan anchor cadence", () => {
  it("roots a project only when its plan interval has elapsed", async () => {
    const k = await (await req(`/api/app/projects/${projectId}/keys`, { method: "POST", body: JSON.stringify({ mode: "test", scopes: ["write"] }) })).json();
    const log = (body: object) => app.request("/v1/events", { method: "POST", headers: { authorization: `Bearer ${k.key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    reg.prepare("UPDATE project SET plan = 'business' WHERE id = ?").run(projectId);
    await log({ tenant: "cadence", actor: "u", action: "a" });
    await tick(cfg, reg, [fakeAnchor], () => {}, (plan) => (plan === "free" ? 86_400 : 0)); // business: rooted now
    reg.prepare("UPDATE project SET plan = 'free' WHERE id = ?").run(projectId);
    await log({ tenant: "cadence", actor: "u", action: "b" });
    const before = (await (await req(`/api/app/projects/${projectId}/verify?tenant=cadence`)).json()).rooted_through;
    expect(await tick(cfg, reg, [fakeAnchor], () => {}, (plan) => (plan === "free" ? 86_400 : 0))).toBeNull(); // free: not due for a day
    expect((await (await req(`/api/app/projects/${projectId}/verify?tenant=cadence`)).json()).rooted_through).toBe(before);
    reg.prepare("UPDATE project SET plan = 'business' WHERE id = ?").run(projectId);
    expect(await tick(cfg, reg, [fakeAnchor], () => {}, (plan) => (plan === "free" ? 86_400 : 0))).not.toBeNull(); // business: due now
    expect((await (await req(`/api/app/projects/${projectId}/verify?tenant=cadence`)).json()).rooted_through).toBe(before + 1);
    reg.prepare("UPDATE project SET plan = 'free' WHERE id = ?").run(projectId);
  });
});

describe("sandbox project", () => {
  it("new accounts get read-only access to the sandbox; writes and write scopes are refused", async () => {
    reg.prepare("INSERT INTO project (id, name, plan, created_at) VALUES ('p_sandbox', 'Sample project', 'pro', '2026-01-01T00:00:00Z')").run();
    setSandboxProject("p_sandbox");
    sent.length = 0;
    await req("/auth/magic", { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: JSON.stringify({ email: "newbie@example.org" }) });
    const token2 = /token=([A-Za-z0-9_-]+)/.exec(sent[0]!)![1]!;
    const c2 = (await app.request("/auth/callback", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `token=${token2}`, redirect: "manual" })).headers.get("set-cookie")!.split(";")[0]!;
    const { projects } = await (await app.request("/api/app/projects", { headers: { cookie: c2 } })).json();
    expect(projects.map((p: { id: string; role: string }) => [p.id, p.role])).toContainEqual(["p_sandbox", "viewer"]);
    expect((await app.request("/api/app/projects/p_sandbox/events", { headers: { cookie: c2 } })).status).toBe(200);
    expect((await app.request("/api/app/projects/p_sandbox/keys", { method: "POST", headers: { cookie: c2, "content-type": "application/json" }, body: "{}" })).status).toBe(403);
    setSandboxProject(undefined);
  });
});

describe("viewer tokens", () => {
  it("scoped read-only access that expires and revokes", async () => {
    const tr = await req(`/api/app/projects/${projectId}/viewer-tokens`, { method: "POST", body: JSON.stringify({ tenant: "acme", ttl_hours: 1 }) });
    const t = await tr.json();
    expect(t.url).toContain("/viewer?token=vt_");
    const ev = await (await app.request(`/api/viewer/events?token=${t.token}`)).json();
    expect(ev.events.length).toBeGreaterThan(0);
    expect(ev.events.every((e: { tenant: string }) => e.tenant === "acme")).toBe(true);
    expect((await app.request(`/api/viewer/events?token=${t.token}&tenant=bulk`)).status).toBe(200); // tenant param ignored, scope wins
    expect((await (await app.request(`/api/viewer/events?token=${t.token}&tenant=bulk`)).json()).events.every((e: { tenant: string }) => e.tenant === "acme")).toBe(true);
    expect((await (await app.request(`/api/viewer/verify?token=${t.token}`)).json()).valid).toBe(true);
    expect((await app.request(`/api/viewer/export`, { headers: { authorization: `Bearer ${t.token}` } })).status).toBe(200);
    expect((await app.request(`/api/viewer/events?token=vt_${projectId}_${"x".repeat(32)}`)).status).toBe(401);
    expect((await req(`/api/app/projects/${projectId}/viewer-tokens/${t.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await app.request(`/api/viewer/events?token=${t.token}`)).status).toBe(401);
    expect((await app.request(`/v1/events`, { headers: { authorization: `Bearer ${t.token}` } })).status).toBe(401); // viewer tokens are not API keys
  });
});

describe("demo + public", () => {
  it("demo chains per visitor and hides other visitors", async () => {
    const a = await (await app.request("/demo/log", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1" }, body: JSON.stringify({ actor: "you", action: "invoice.delete" }) })).json();
    const b = await (await app.request("/demo/log", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1" }, body: JSON.stringify({ actor: "you", action: "mfa.disable" }) })).json();
    expect(b.prev_hash).toBe(a.event_hash);
    expect((await (await app.request("/demo/verify", { headers: { "x-forwarded-for": "1.1.1.1" } })).json()).valid).toBe(true);
    expect((await app.request(`/demo/proof/${a.id}`, { headers: { "x-forwarded-for": "2.2.2.2" } })).status).toBe(404);
    expect((await (await app.request("/demo/events", { headers: { "x-forwarded-for": "2.2.2.2" } })).json()).events).toHaveLength(0);
  });
  it("public anchors and stats", async () => {
    const { anchors } = await (await app.request("/public/anchors")).json();
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors[0].receipts[0]).toMatchObject({ kind: "rekor" });
    expect(anchors[0]).not.toHaveProperty("receipts.0.proof");
    const stats = await (await app.request("/public/stats")).json();
    expect(stats.projects).toBeGreaterThanOrEqual(3);
  });
});
