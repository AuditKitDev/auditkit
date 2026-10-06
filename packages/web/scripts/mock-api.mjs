#!/usr/bin/env node
// In-memory implementation of docs/web-api.md for building the UI without packages/server.
// Run: pnpm --filter @auditkit/web mock   (listens on :3001, the dev proxy target)
// Real server instead: pnpm --filter @auditkit/server dev, then pnpm --filter @auditkit/web dev.
// Magic links are printed here; /auth/callback accepts any unexpired token it printed.
import { createServer } from "node:http";
import { createHash, randomBytes, randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { openapi } from "../../server/src/openapi.ts";

const PORT = Number(process.env.PORT ?? 3001);
const SITE = process.env.SITE_ORIGIN ?? "http://localhost:4321";
const ANCHOR_EVERY_MS = Number(process.env.MOCK_ANCHOR_MS ?? 20_000);
const BILLING = process.env.MOCK_BILLING === "1";

const PLANS = {
  free: { events_per_month: 10_000, retention_days: 30, anchor_interval_seconds: 86_400 },
  pro: { events_per_month: 500_000, retention_days: 365, anchor_interval_seconds: 300 },
  business: { events_per_month: 5_000_000, retention_days: 1_095, anchor_interval_seconds: 60 },
};

// ---- crypto helpers (same shapes as @auditkit/core, so hashes look real) ----
const GENESIS = "0".repeat(64);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const canon = (v) => {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return "[" + v.map((x) => canon(x ?? null)).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
};
const leaf = (h) => createHash("sha256").update(Buffer.from("00" + h, "hex")).digest("hex");
const node = (l, r) => createHash("sha256").update(Buffer.from("01" + l + r, "hex")).digest("hex");
function tree(hashes) {
  const levels = [hashes.map(leaf)];
  while (levels.at(-1).length > 1) {
    const cur = levels.at(-1), next = [];
    for (let i = 0; i < cur.length; i += 2) next.push(i + 1 < cur.length ? node(cur[i], cur[i + 1]) : cur[i]);
    levels.push(next);
  }
  return { root: levels.at(-1)[0] ?? sha(""), levels };
}
function pathFor(t, index) {
  const out = [];
  let i = index;
  for (let lvl = 0; lvl < t.levels.length - 1; lvl++) {
    const row = t.levels[lvl];
    const sib = i ^ 1;
    if (row[sib] !== undefined) out.push({ hash: row[sib], side: i % 2 === 0 ? "right" : "left" });
    i = Math.floor(i / 2);
  }
  return out;
}
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeySpkiB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const signHex = (hex) => sign(null, Buffer.from(hex, "hex"), privateKey).toString("base64");
const ulid = () => Date.now().toString(36).toUpperCase().padStart(10, "0") + randomBytes(8).toString("hex").toUpperCase().slice(0, 16);

// ---- state ----
const users = new Map(); // id -> { id, email, created_at }
const sessions = new Map(); // cookie -> userId
const magic = new Map(); // token -> { email, next, exp }
const projects = new Map(); // id -> project
const globalRoots = []; // { id, hash, created_at, projects, anchors[], project_roots: Map<projectId, {hash, path}> }

function newProject(name, ownerId, plan = "free") {
  const p = { id: "prj_" + randomBytes(6).toString("hex"), name, plan, created_at: new Date().toISOString(), members: new Map([[ownerId, "owner"]]), keys: [], tenants: new Map(), events: [], byId: new Map(), tenantRoots: [], viewerTokens: [], customer: null };
  projects.set(p.id, p);
  return p;
}
function tenantOf(p, ext) {
  let t = p.tenants.get(ext);
  if (!t) { t = { id: "ten_" + randomBytes(6).toString("hex"), external_id: ext, head_hash: GENESIS, head_position: -1, created_at: new Date().toISOString(), keys: [], require_client_sig: false }; p.tenants.set(ext, t); }
  return t;
}
function ingest(p, input) {
  if (input.idempotency_key) { const dup = p.events.find((e) => e.idempotency_key === input.idempotency_key); if (dup) return { ...receiptOf(dup), duplicate: true }; }
  const t = tenantOf(p, input.tenant);
  const id = ulid();
  const salt = randomBytes(16).toString("hex");
  const payload = input.payload ?? null;
  const header = { id, project_id: p.id, tenant_id: t.id, position: t.head_position + 1, occurred_at: input.occurred_at ?? new Date().toISOString(), actor: input.actor, action: input.action, target: input.target ?? null, payload_commit: sha(salt + canon(payload)), prev_hash: t.head_hash };
  const event_hash = sha(canon(header));
  const ev = { ...header, tenant: t.external_id, event_hash, server_sig: signHex(event_hash), client_sig: input.client_sig ?? null, salt, payload, erased: false, root_id: null, idempotency_key: input.idempotency_key ?? null };
  t.head_hash = event_hash; t.head_position = header.position;
  p.events.push(ev); p.byId.set(id, ev);
  return receiptOf(ev);
}
const receiptOf = (e) => ({ id: e.id, tenant: e.tenant, position: e.position, event_hash: e.event_hash, prev_hash: e.prev_hash, server_sig: e.server_sig, duplicate: false });
const record = (e) => ({ id: e.id, tenant: e.tenant, position: e.position, occurred_at: e.occurred_at, actor: e.actor, action: e.action, target: e.target, payload: e.erased ? null : e.payload, erased: e.erased, event_hash: e.event_hash, prev_hash: e.prev_hash, anchored: e.root_id !== null });

function search(p, q) {
  const limit = Math.min(Number(q.get("limit") ?? 50), 500);
  let rows = p.events.filter((e) =>
    (!q.get("tenant") || e.tenant === q.get("tenant")) &&
    (!q.get("actor") || e.actor === q.get("actor")) &&
    (!q.get("action") || (q.get("action").endsWith("*") ? e.action.startsWith(q.get("action").slice(0, -1)) : e.action === q.get("action"))) &&
    (!q.get("from") || e.occurred_at >= q.get("from")) &&
    (!q.get("to") || e.occurred_at < q.get("to")));
  rows.sort((a, b) => (a.occurred_at === b.occurred_at ? (a.id < b.id ? 1 : -1) : a.occurred_at < b.occurred_at ? 1 : -1));
  const cursor = q.get("cursor");
  if (cursor) { const i = rows.findIndex((e) => e.id === cursor); rows = i >= 0 ? rows.slice(i + 1) : rows; }
  const page = rows.slice(0, limit);
  return { events: page.map(record), next_cursor: rows.length > limit ? page.at(-1).id : null };
}
function verify(p, ext, from = 0, to) {
  const t = p.tenants.get(ext);
  if (!t) return { valid: false, position: -1, reason: "unknown tenant" };
  const end = to ?? t.head_position;
  const rows = p.events.filter((e) => e.tenant_id === t.id && e.position >= from && e.position <= end).sort((a, b) => a.position - b.position);
  let prev = from === 0 ? GENESIS : p.events.find((e) => e.tenant_id === t.id && e.position === from - 1)?.event_hash;
  if (prev === undefined) return { valid: false, position: from - 1, reason: "missing predecessor" };
  for (const e of rows) {
    if (e.prev_hash !== prev) return { valid: false, position: e.position, reason: "prev_hash does not match predecessor" };
    const { tenant, event_hash, server_sig, client_sig, salt, payload, erased, root_id, idempotency_key, ...header } = e;
    if (sha(canon(header)) !== event_hash) return { valid: false, position: e.position, reason: "event_hash does not match header" };
    if (!e.erased && sha(e.salt + canon(e.payload)) !== e.payload_commit) return { valid: false, position: e.position, reason: "payload does not match its commitment" };
    prev = e.event_hash;
  }
  const rooted = rows.filter((e) => e.root_id).at(-1)?.position ?? -1;
  const anchored = rows.filter((e) => e.root_id && globalRoots.find((g) => g.id === p.tenantRoots.find((r) => r.id === e.root_id)?.global_root_id)?.anchors.length).at(-1)?.position ?? -1;
  return { valid: true, head: prev, count: rows.length, rooted_through: rooted, anchored_through: anchored };
}
function proof(p, id) {
  const e = p.byId.get(id);
  if (!e) return null;
  if (!e.root_id) return { event_id: e.id, event_hash: e.event_hash, anchored: false };
  const tr = p.tenantRoots.find((r) => r.id === e.root_id);
  const g = globalRoots.find((x) => x.id === tr.global_root_id);
  const pr = g.project_roots.get(p.id);
  return { event_id: e.id, event_hash: e.event_hash, anchored: true, path_to_tenant_root: pathFor(tr.tree, e.position - tr.from_position), tenant_root: tr.root_hash, path_to_project_root: tr.path_to_project, project_root: pr.hash, path_to_global_root: pr.path, global_root: g.hash, anchors: g.anchors };
}
function exportLines(p, ext, from = 0, to) {
  const t = p.tenants.get(ext);
  if (!t) return [];
  const rows = p.events.filter((e) => e.tenant_id === t.id && e.position >= from && e.position <= (to ?? t.head_position)).sort((a, b) => a.position - b.position);
  const out = [{ type: "manifest", version: 1, server: "localhost", project_id: p.id, tenant_id: t.id, tenant: ext, from_position: from, to_position: to ?? t.head_position, requested_from: from, requested_to: to ?? t.head_position, server_public_key: publicKeySpkiB64, exported_at: new Date().toISOString() }];
  for (const e of rows) out.push({ type: "event", id: e.id, project_id: p.id, tenant_id: t.id, tenant: ext, position: e.position, occurred_at: e.occurred_at, actor: e.actor, action: e.action, target: e.target, payload_commit: e.payload_commit, prev_hash: e.prev_hash, event_hash: e.event_hash, server_sig: e.server_sig, client_sig: e.client_sig, salt: e.erased ? null : e.salt, payload: e.erased ? null : e.payload, erased: e.erased });
  for (const r of p.tenantRoots.filter((r) => r.tenant_id === t.id)) { const g = globalRoots.find((x) => x.id === r.global_root_id); out.push({ type: "root", tenant_root: r.root_hash, from_position: r.from_position, to_position: r.to_position, path_to_project_root: r.path_to_project, project_root: g.project_roots.get(p.id).hash, path_to_global_root: g.project_roots.get(p.id).path, global_root: g.hash, anchors: g.anchors }); }
  return out;
}

// ---- anchor tick: event -> tenant root -> project root -> global root -> rekor + ots ----
let rekorIndex = 184_201_337;
function tick() {
  const projectRoots = [];
  for (const p of projects.values()) {
    const tenantRootsNow = [];
    for (const t of p.tenants.values()) {
      const pending = p.events.filter((e) => e.tenant_id === t.id && !e.root_id).sort((a, b) => a.position - b.position);
      if (!pending.length) continue;
      const tr = { id: "tr_" + randomBytes(5).toString("hex"), tenant_id: t.id, from_position: pending[0].position, to_position: pending.at(-1).position, tree: tree(pending.map((e) => e.event_hash)), global_root_id: null, path_to_project: [] };
      tr.root_hash = tr.tree.root;
      for (const e of pending) e.root_id = tr.id;
      p.tenantRoots.push(tr); tenantRootsNow.push(tr);
    }
    if (!tenantRootsNow.length) continue;
    const pt = tree(tenantRootsNow.map((r) => r.root_hash));
    tenantRootsNow.forEach((r, i) => { r.path_to_project = pathFor(pt, i); });
    projectRoots.push({ p, hash: pt.root, tenantRoots: tenantRootsNow });
  }
  if (!projectRoots.length) return;
  const gt = tree(projectRoots.map((r) => r.hash));
  const g = { id: "gr_" + randomBytes(5).toString("hex"), hash: gt.root, created_at: new Date().toISOString(), projects: projectRoots.length, anchors: [], project_roots: new Map() };
  projectRoots.forEach((r, i) => { g.project_roots.set(r.p.id, { hash: r.hash, path: pathFor(gt, i) }); r.tenantRoots.forEach((tr) => { tr.global_root_id = g.id; }); });
  globalRoots.push(g);
  const now = new Date().toISOString();
  setTimeout(() => {
    g.anchors.push({ kind: "rekor", ref: `${rekorIndex++}/${randomBytes(32).toString("hex")}`, proof: randomBytes(96).toString("base64"), anchored_at: now, status: "final" });
    g.anchors.push({ kind: "ots", ref: "https://alice.btc.calendar.opentimestamps.org,https://bob.btc.calendar.opentimestamps.org", proof: randomBytes(64).toString("base64"), anchored_at: now, status: "pending" });
    setTimeout(() => { g.anchors[1].status = "final"; }, 90_000);
  }, 1500);
}
setInterval(tick, ANCHOR_EVERY_MS).unref();

// ---- seed: demo project + a sample project any login can see ----
const demo = newProject("demo", "system");
const seedUser = { id: "usr_seed", email: "owner@example.com", created_at: new Date(Date.now() - 86_400_000 * 40).toISOString() };
users.set(seedUser.id, seedUser);
const sample = newProject("example.com", seedUser.id, "pro");
{
  const actors = ["u_17", "u_42", "svc_billing", "u_9", "admin@example.com"];
  const actions = ["invoice.delete", "invoice.create", "user.login", "user.role.change", "export.download", "api_key.create", "settings.update", "payment.refund"];
  const tenants = ["acme", "globex", "initech"];
  for (let i = 0; i < 140; i++) {
    const tnt = tenants[i % 3];
    const action = actions[(i * 7) % actions.length];
    ingest(sample, { tenant: tnt, actor: actors[i % actors.length], action, target: action.startsWith("invoice") ? `inv_${1000 + i}` : action.startsWith("user") ? `u_${i}` : null, occurred_at: new Date(Date.now() - (140 - i) * 3_600_000 * 2.3).toISOString(), payload: { ip: `10.0.${i % 7}.${(i * 13) % 255}`, ua: "Mozilla/5.0", amount: action.includes("refund") ? 1200 + i : undefined, reason: i % 11 === 0 ? "customer request" : undefined } });
  }
  for (const e of sample.events.filter((_, i) => i % 23 === 5)) { e.erased = true; e.payload = null; e.salt = null; ingest(sample, { tenant: e.tenant, actor: "admin@example.com", action: "payload.erased", target: e.id, payload: { erased_event: e.id } }); }
  sample.keys.push({ id: "key_" + randomBytes(4).toString("hex"), prefix: "ak_live_3f9a", mode: "live", scopes: ["read", "write"], created_at: sample.created_at, revoked_at: null, hash: "x" });
  sample.keys.push({ id: "key_" + randomBytes(4).toString("hex"), prefix: "ak_test_c0de", mode: "test", scopes: ["read", "write", "erase", "admin"], created_at: sample.created_at, revoked_at: new Date().toISOString(), hash: "x" });
  tick(); // anchor the seed data once so proofs exist
}

// ---- http ----
const json = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers }); res.end(JSON.stringify(body)); };
const err = (res, status, code, message) => json(res, status, { error: { code, message } });
const cookies = (req) => Object.fromEntries((req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=")).filter((c) => c[0]));
const readBody = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { ok({}); } }); });
const ipHash = (req) => "demo-" + sha((req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "local").toString()).slice(0, 12);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  const m = (method, re) => req.method === method && path.match(re);
  let r;
  const user = users.get(sessions.get(cookies(req).ak_session));
  const log = (s) => console.log(`${req.method} ${path} ${s}`);

  if (m("GET", /^\/openapi\.json$/)) return json(res, 200, openapi, { "cache-control": "public, max-age=300" });
  if (m("GET", /^\/\.well-known\/auditkit\.json$/)) return json(res, 200, { server_public_key: publicKeySpkiB64, key_algorithm: "Ed25519", anchors: ["rekor", "ots"], anchor_interval_seconds: 60, export_version: 1 });
  if (m("GET", /^\/health$/)) return json(res, 200, { ok: true });

  // auth
  if (m("POST", /^\/auth\/magic$/)) {
    const b = await readBody(req);
    if (typeof b.email !== "string" || !b.email.includes("@")) return err(res, 400, "invalid_email", "email required");
    const token = randomBytes(24).toString("hex");
    magic.set(token, { email: b.email.toLowerCase(), next: b.next ?? "/app", exp: Date.now() + 15 * 60_000 });
    console.log(`\n  magic link for ${b.email}:\n  ${SITE}/auth/callback?token=${token}\n`);
    return json(res, 202, { sent: true });
  }
  if (m("GET", /^\/auth\/callback$/)) {
    // Like the server: render a page that auto-POSTs the token, so mail scanners that follow links cannot consume it.
    const tok = url.searchParams.get("token") ?? "";
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Signing in · AuditKit</title></head><body><form method="post" action="/auth/callback"><input type="hidden" name="token" value="${tok.replace(/[^a-f0-9]/g, "")}"><p>Finishing sign-in…</p><button type="submit">Continue</button></form><script>document.forms[0].submit()</script></body></html>`);
  }
  if (m("POST", /^\/auth\/callback$/)) {
    const raw = await new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
    const token = new URLSearchParams(raw).get("token") ?? url.searchParams.get("token");
    const t = magic.get(token);
    magic.delete(token);
    if (!t || t.exp < Date.now()) { res.writeHead(302, { location: "/login?error=expired" }); return res.end(); }
    let u = [...users.values()].find((x) => x.email === t.email);
    if (!u) { u = { id: "usr_" + randomBytes(6).toString("hex"), email: t.email, created_at: new Date().toISOString() }; users.set(u.id, u); newProject(t.email.split("@")[1], u.id); }
    sample.members.set(u.id, "admin"); // every mock login can see the seeded project
    const sid = randomBytes(24).toString("hex");
    sessions.set(sid, u.id);
    res.writeHead(302, { location: t.next.startsWith("/") ? t.next : "/app", "set-cookie": `ak_session=${sid}; Path=/; HttpOnly; SameSite=Lax` });
    return res.end();
  }
  if (m("GET", /^\/auth\/me$/)) return user ? json(res, 200, { user }) : err(res, 401, "unauthenticated", "no session");
  if (m("POST", /^\/auth\/logout$/)) { sessions.delete(cookies(req).ak_session); res.writeHead(204, { "set-cookie": "ak_session=; Path=/; Max-Age=0" }); return res.end(); }

  // public
  if (m("GET", /^\/public\/anchors$/)) {
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    return json(res, 200, { anchors: [...globalRoots].reverse().slice(0, limit).map((g) => ({ global_root: g.hash, created_at: g.created_at, projects: g.projects, receipts: g.anchors.map(({ kind, ref, status, anchored_at }) => ({ kind, ref, status, anchored_at })) })) });
  }
  if (m("GET", /^\/public\/stats$/)) {
    const ev = [...projects.values()].reduce((n, p) => n + p.events.length, 0);
    return json(res, 200, { events_total: Math.round(ev / 10) * 10, roots_total: globalRoots.length, anchors_final: globalRoots.reduce((n, g) => n + g.anchors.filter((a) => a.status === "final").length, 0), projects: projects.size }, { "cache-control": "public, max-age=60" });
  }

  // demo
  if (path.startsWith("/demo/")) {
    const tenant = ipHash(req);
    if (m("POST", /^\/demo\/log$/)) {
      const b = await readBody(req);
      if (!b.actor || !b.action) return err(res, 400, "invalid", "actor and action are required");
      return json(res, 201, ingest(demo, { tenant, actor: String(b.actor).slice(0, 80), action: String(b.action).slice(0, 80), target: b.target ? String(b.target).slice(0, 80) : null, payload: b.payload ?? null }));
    }
    if (m("GET", /^\/demo\/events$/)) { const q = new URLSearchParams({ tenant, limit: "20" }); return json(res, 200, search(demo, q)); }
    if (m("GET", /^\/demo\/verify$/)) return json(res, 200, verify(demo, tenant));
    if ((r = m("GET", /^\/demo\/proof\/([^/]+)$/))) { const pr = demo.byId.get(r[1]); return pr && pr.tenant === tenant ? json(res, 200, proof(demo, r[1])) : err(res, 404, "not_found", "no such event"); }
    return err(res, 404, "not_found", "unknown demo route");
  }

  // viewer (token)
  if (path.startsWith("/api/viewer/")) {
    const raw = url.searchParams.get("token") ?? (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    let vt = null, vp = null;
    for (const p of projects.values()) { const t = p.viewerTokens.find((x) => x.token === raw); if (t) { vt = t; vp = p; break; } }
    if (!vt || vt.revoked_at || vt.expires_at < new Date().toISOString()) return err(res, 401, "invalid_token", "viewer token is missing, expired or revoked");
    let s;
    if (m("GET", /^\/api\/viewer\/me$/)) return json(res, 200, { tenant: vt.tenant, project_id: vp.id });
    if (m("GET", /^\/api\/viewer\/events$/)) { const q = new URLSearchParams(url.searchParams); q.set("tenant", vt.tenant); return json(res, 200, search(vp, q)); }
    if ((s = m("GET", /^\/api\/viewer\/events\/([^/]+)\/proof$/))) { const e = vp.byId.get(s[1]); return e && e.tenant === vt.tenant ? json(res, 200, proof(vp, s[1])) : err(res, 404, "not_found", "no such event"); }
    if ((s = m("GET", /^\/api\/viewer\/events\/([^/]+)$/))) { const e = vp.byId.get(s[1]); return e && e.tenant === vt.tenant ? json(res, 200, record(e)) : err(res, 404, "not_found", "no such event"); }
    if (m("GET", /^\/api\/viewer\/verify$/)) return json(res, 200, verify(vp, vt.tenant, url.searchParams.get("from") ? Number(url.searchParams.get("from")) : 0, url.searchParams.get("to") ? Number(url.searchParams.get("to")) : undefined));
    if (m("GET", /^\/api\/viewer\/export$/)) { res.writeHead(200, { "content-type": "application/x-ndjson", "content-disposition": `attachment; filename="auditkit-${vt.tenant}.jsonl"` }); return res.end(exportLines(vp, vt.tenant).map((l) => JSON.stringify(l)).join("\n") + "\n"); }
    return err(res, 404, "not_found", "unknown viewer route");
  }

  // app (session)
  if (path.startsWith("/api/app")) {
    if (!user) return err(res, 401, "unauthenticated", "sign in first");
    const mine = [...projects.values()].filter((p) => p.members.has(user.id));
    const summary = (p) => ({ id: p.id, name: p.name, plan: p.plan, role: p.members.get(user.id), created_at: p.created_at, events_this_month: p.events.length, limit_events: PLANS[p.plan].events_per_month });
    if (m("GET", /^\/api\/app\/projects$/)) return json(res, 200, { projects: mine.map(summary) });
    if (m("POST", /^\/api\/app\/projects$/)) { const b = await readBody(req); if (!b.name?.trim()) return err(res, 400, "invalid", "name required"); const p = newProject(b.name.trim(), user.id); return json(res, 201, { id: p.id, name: p.name, plan: p.plan }); }
    if ((r = path.match(/^\/api\/app\/projects\/([^/]+)(\/.*)?$/))) {
      const p = projects.get(r[1]);
      if (!p || !p.members.has(user.id)) return err(res, 404, "not_found", "no such project");
      const rest = r[2] ?? "";
      let s;
      if (req.method === "GET" && rest === "") {
        const lastTr = p.tenantRoots.at(-1);
        const g = lastTr && globalRoots.find((x) => x.id === lastTr.global_root_id);
        return json(res, 200, { ...summary(p), usage: { events_this_month: p.events.length, limit_events: PLANS[p.plan].events_per_month, retention_days: PLANS[p.plan].retention_days, anchor_interval_seconds: PLANS[p.plan].anchor_interval_seconds }, last_anchor: g ? { global_root: g.hash, created_at: g.created_at, anchors: g.anchors.map(({ kind, ref, status, anchored_at }) => ({ kind, ref, status, anchored_at })) } : null });
      }
      if (req.method === "GET" && rest === "/keys") return json(res, 200, { keys: p.keys.map(({ hash, ...k }) => k) });
      if (req.method === "POST" && rest === "/keys") {
        const b = await readBody(req);
        const mode = b.mode === "test" ? "test" : "live";
        const scopes = (Array.isArray(b.scopes) ? b.scopes : []).filter((x) => ["read", "write", "erase", "admin"].includes(x));
        if (!scopes.length) return err(res, 400, "invalid", "at least one scope");
        const secret = `ak_${mode}_${randomBytes(24).toString("base64url")}`;
        const k = { id: "key_" + randomBytes(4).toString("hex"), prefix: secret.slice(0, 12), mode, scopes, created_at: new Date().toISOString(), revoked_at: null, hash: sha(secret) };
        p.keys.push(k);
        return json(res, 201, { id: k.id, key: secret });
      }
      if (req.method === "DELETE" && (s = rest.match(/^\/keys\/([^/]+)$/))) { const k = p.keys.find((x) => x.id === s[1]); if (!k) return err(res, 404, "not_found", "no such key"); k.revoked_at ??= new Date().toISOString(); return json(res, 200, { revoked: true }); }
      if (req.method === "GET" && rest === "/tenants") return json(res, 200, { tenants: [...p.tenants.values()].map((t) => ({ id: t.id, external_id: t.external_id, events: t.head_position + 1, created_at: t.created_at, require_client_sig: t.require_client_sig })) });
      if ((s = rest.match(/^\/tenants\/([^/]+)\/keys$/))) {
        const t = p.tenants.get(decodeURIComponent(s[1]));
        if (!t) return err(res, 404, "not_found", "no such tenant");
        if (req.method === "GET") return json(res, 200, { keys: t.keys });
        if (req.method === "POST") {
          const b = await readBody(req);
          const pk = String(b.public_key ?? "").trim();
          try { const der = Buffer.from(pk, "base64"); if (der.length !== 44 || der.toString("hex").slice(0, 24) !== "302a300506032b6570032100") throw 0; } catch { return err(res, 400, "invalid", "public_key must be a base64 DER SPKI Ed25519 key (44 bytes)"); }
          const k = { id: "tk_" + randomBytes(6).toString("hex"), public_key: pk, created_at: new Date().toISOString(), revoked_at: null };
          t.keys.push(k);
          return json(res, 201, { id: k.id });
        }
      }
      if (req.method === "DELETE" && (s = rest.match(/^\/tenants\/([^/]+)\/keys\/([^/]+)$/))) { const t = p.tenants.get(decodeURIComponent(s[1])); const k = t?.keys.find((x) => x.id === s[2]); if (!k) return err(res, 404, "not_found", "no such key"); k.revoked_at ??= new Date().toISOString(); return json(res, 200, { revoked: true }); }
      if (req.method === "POST" && (s = rest.match(/^\/tenants\/([^/]+)\/policy$/))) { const t = p.tenants.get(decodeURIComponent(s[1])); if (!t) return err(res, 404, "not_found", "no such tenant"); const b = await readBody(req); if (b.require_client_sig && !t.keys.some((k) => !k.revoked_at)) return err(res, 400, "invalid", "register a signing key before requiring signatures"); t.require_client_sig = !!b.require_client_sig; return json(res, 200, { require_client_sig: t.require_client_sig }); }
      if (req.method === "GET" && rest === "/events") return json(res, 200, search(p, url.searchParams));
      if (req.method === "GET" && (s = rest.match(/^\/events\/([^/]+)$/))) { const e = p.byId.get(s[1]); return e ? json(res, 200, record(e)) : err(res, 404, "not_found", "no such event"); }
      if (req.method === "GET" && (s = rest.match(/^\/events\/([^/]+)\/proof$/))) { const pr = proof(p, s[1]); return pr ? json(res, 200, pr) : err(res, 404, "not_found", "no such event"); }
      if (req.method === "GET" && rest === "/verify") { const t = url.searchParams.get("tenant"); if (!t) return err(res, 400, "invalid", "tenant required"); return json(res, 200, verify(p, t, url.searchParams.get("from") ? Number(url.searchParams.get("from")) : 0, url.searchParams.get("to") ? Number(url.searchParams.get("to")) : undefined)); }
      if (req.method === "GET" && rest === "/export") {
        const t = url.searchParams.get("tenant"); if (!t) return err(res, 400, "invalid", "tenant required");
        res.writeHead(200, { "content-type": "application/x-ndjson", "content-disposition": `attachment; filename="auditkit-${p.id}-${t}.jsonl"` });
        return res.end(exportLines(p, t).map((l) => JSON.stringify(l)).join("\n") + "\n");
      }
      if (req.method === "GET" && rest === "/viewer-tokens") return json(res, 200, { tokens: p.viewerTokens.map(({ token, ...t }) => t) });
      if (req.method === "POST" && rest === "/viewer-tokens") {
        const b = await readBody(req);
        if (!b.tenant || !p.tenants.has(b.tenant)) return err(res, 400, "invalid", "tenant required and must exist");
        const ttl = Math.min(Math.max(Number(b.ttl_hours ?? 168), 1), 2160);
        const token = "vt_" + randomBytes(24).toString("base64url");
        const t = { id: "vtk_" + randomBytes(4).toString("hex"), tenant: b.tenant, expires_at: new Date(Date.now() + ttl * 3_600_000).toISOString(), created_at: new Date().toISOString(), revoked_at: null, token, project: p };
        p.viewerTokens.push(t);
        return json(res, 201, { id: t.id, token, expires_at: t.expires_at, url: `${SITE}/viewer?token=${token}` });
      }
      if (req.method === "DELETE" && (s = rest.match(/^\/viewer-tokens\/([^/]+)$/))) { const t = p.viewerTokens.find((x) => x.id === s[1]); if (!t) return err(res, 404, "not_found", "no such token"); t.revoked_at ??= new Date().toISOString(); return json(res, 200, { revoked: true }); }
      if (req.method === "POST" && rest === "/billing/checkout") { const b = await readBody(req); if (!BILLING) return err(res, 501, "billing_not_configured", "Stripe is not configured on this server"); if (!["pro", "business"].includes(b.plan)) return err(res, 400, "invalid", "plan must be pro or business"); setTimeout(() => { p.plan = b.plan; }, 3000); return json(res, 200, { url: `https://checkout.stripe.com/c/pay/mock_${p.id}_${b.plan}` }); }
      if (req.method === "POST" && rest === "/billing/portal") return BILLING ? json(res, 200, { url: "https://billing.stripe.com/p/session/mock" }) : err(res, 501, "billing_not_configured", "Stripe is not configured on this server");
    }
    return err(res, 404, "not_found", "unknown app route");
  }
  return err(res, 404, "not_found", `no route ${req.method} ${path}`);
});
server.listen(PORT, () => console.log(`mock api on http://localhost:${PORT}  (anchor tick every ${ANCHOR_EVERY_MS / 1000}s, billing ${BILLING ? "on" : "501"})`));
