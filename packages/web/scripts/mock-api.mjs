#!/usr/bin/env node
// In-memory implementation of docs/web-api.md for building the UI without packages/server.
// Covers /auth, /api/app, /api/viewer, /public, /demo, /v1 (API keys), /oauth + /.well-known, /mcp (JSON-RPC over POST) and /webhooks/stripe.
// Not a security reference: Stripe signatures are not checked and OAuth client secrets are not enforced.
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
// Same switch as the server (AUDITKIT_PROXY_TRUST): which header, if any, carries the client IP.
const PROXY_TRUST = process.env.AUDITKIT_PROXY_TRUST ?? "none";
const DEMO_MAX_PER_VISITOR = 200;
const DEMO_MAX_PAYLOAD = 2048;

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
const receiptOf = (e) => ({ id: e.id, tenant: e.tenant, tenant_id: e.tenant_id, project_id: e.project_id, position: e.position, occurred_at: e.occurred_at, payload_commit: e.payload_commit, salt: e.erased ? undefined : e.salt, event_hash: e.event_hash, prev_hash: e.prev_hash, server_sig: e.server_sig, duplicate: false });
function erasePayload(p, id, actor) {
  const e = p.byId.get(id);
  if (!e || e.erased) return null;
  e.erased = true; e.payload = null; e.salt = null;
  // Same transaction on the server: the erasure is itself an event on the tenant's chain.
  const audit = ingest(p, { tenant: e.tenant, actor, action: "payload.erased", target: e.id, payload: { erased_event: e.id } });
  return { erased: true, audit };
}
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
  const inRange = p.tenantRoots.filter((r) => r.tenant_id === t.id && r.to_position >= from && r.from_position <= end);
  let roots = { roots_checked: inRange.length, roots_ok: true };
  for (const r of inRange) {
    const leaves = p.events.filter((e) => e.root_id === r.id).sort((a, b) => a.position - b.position).map((e) => e.event_hash);
    if (tree(leaves).root !== r.root_hash) { roots = { ...roots, roots_ok: false, failed: { from_position: r.from_position, to_position: r.to_position, reason: "tenant root does not match events" } }; break; }
  }
  if (!roots.roots_ok) return { valid: false, position: roots.failed.from_position, reason: `merkle: ${roots.failed.reason}`, roots };
  const rooted = rows.filter((e) => e.root_id).at(-1)?.position ?? -1;
  const anchored = rows.filter((e) => e.root_id && globalRoots.find((g) => g.id === p.tenantRoots.find((r) => r.id === e.root_id)?.global_root_id)?.anchors.length).at(-1)?.position ?? -1;
  return { valid: true, head: prev, count: rows.length, roots, rooted_through: rooted, anchored_through: anchored };
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
  const seedKey = `ak_live_${randomBytes(24).toString("base64url")}`;
  sample.keys.push({ id: "key_" + randomBytes(4).toString("hex"), prefix: seedKey.slice(0, 12), mode: "live", scopes: ["read", "write", "erase", "admin"], created_at: sample.created_at, revoked_at: null, hash: sha(seedKey) });
  console.log(`seeded project ${sample.id}; API key for /v1 and /mcp: ${seedKey}`);
  sample.keys.push({ id: "key_" + randomBytes(4).toString("hex"), prefix: "ak_test_c0de", mode: "test", scopes: ["read", "write", "erase", "admin"], created_at: sample.created_at, revoked_at: new Date().toISOString(), hash: "x" });
  tick(); // anchor the seed data once so proofs exist
}

// ---- http ----
const json = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers }); res.end(JSON.stringify(body)); };
const err = (res, status, code, message, headers = {}) => json(res, status, { error: { code, message } }, headers);
const cookies = (req) => Object.fromEntries((req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=")).filter((c) => c[0]));
const readRaw = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => ok(s)); });
const readBody = async (req) => { try { const s = await readRaw(req); return s ? JSON.parse(s) : {}; } catch { return {}; } };
const readForm = async (req) => { const raw = await readRaw(req); const ct = req.headers["content-type"] ?? ""; if (ct.includes("json")) { try { return JSON.parse(raw); } catch { return {}; } } return Object.fromEntries(new URLSearchParams(raw)); };
// Like the server's clientIp(): proxy headers are ignored unless AUDITKIT_PROXY_TRUST names one.
const clientIp = (req) => PROXY_TRUST === "x-real-ip" ? (req.headers["x-real-ip"] || "local") : PROXY_TRUST === "x-forwarded-for" ? ((req.headers["x-forwarded-for"] ?? "").toString().split(",")[0].trim() || "local") : (req.socket.remoteAddress ?? "local");
const ipHash = (req) => "demo-" + sha(clientIp(req)).slice(0, 12);
const rateLimiter = (max, windowMs) => { const hits = new Map(); return (key) => { const now = Date.now(); const h = (hits.get(key) ?? []).filter((t) => now - t < windowMs); h.push(now); hits.set(key, h); return h.length <= max; }; };
const demoLimit = rateLimiter(30, 60_000);
const keyLimit = rateLimiter(1200, 60_000);
const bearer = (req) => (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
const html = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers }); res.end(body); };
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SCOPES = ["read", "write", "erase", "admin"];

// ---- OAuth 2.1 state (docs/web-api.md "Connect from Claude"; shapes mirror packages/server/src/oauth.ts) ----
const oauthClients = new Map(); // client_id -> { client_id, name, redirect_uris }
const oauthCodes = new Map(); // code -> { client_id, user_id, project_id, scopes, code_challenge, redirect_uri, exp, used }
const oauthTokens = new Map(); // token -> { kind: "access"|"refresh", client_id, user_id, project_id, scopes, exp, family, revoked }
const ACCESS_TTL_MS = 3600_000, REFRESH_TTL_MS = 30 * 86_400_000, CODE_TTL_MS = 600_000;
function issueTokens(c) {
  const family = c.family ?? randomBytes(8).toString("hex");
  const access = "oat_" + randomBytes(32).toString("base64url"), refresh = "ort_" + randomBytes(32).toString("base64url");
  oauthTokens.set(access, { kind: "access", client_id: c.client_id, user_id: c.user_id, project_id: c.project_id, scopes: c.scopes, exp: Date.now() + ACCESS_TTL_MS, family, revoked: false });
  oauthTokens.set(refresh, { kind: "refresh", client_id: c.client_id, user_id: c.user_id, project_id: c.project_id, scopes: c.scopes, exp: Date.now() + REFRESH_TTL_MS, family, revoked: false });
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_MS / 1000, refresh_token: refresh, scope: c.scopes.join(" ") };
}
const validRedirect = (u) => { try { const x = new URL(u); return x.protocol === "https:" || (x.protocol === "http:" && (x.hostname === "localhost" || x.hostname === "127.0.0.1")); } catch { return false; } };

/** Bearer `ak_…` (API key) or `oat_…` (OAuth access token) → { project, keyId, scopes } or null. Used by /v1 and /mcp. */
function principalOf(req) {
  const tok = bearer(req);
  if (!tok) return null;
  if (tok.startsWith("oat_")) { const t = oauthTokens.get(tok); return t && t.kind === "access" && !t.revoked && t.exp > Date.now() ? { project: projects.get(t.project_id), keyId: "oauth:" + t.client_id, scopes: new Set(t.scopes) } : null; }
  const h = sha(tok);
  for (const p of projects.values()) { const k = p.keys.find((k) => k.hash === h && !k.revoked_at); if (k) return { project: p, keyId: k.id, scopes: new Set(k.scopes) }; }
  return null;
}
const can = (pr, scope) => pr.scopes.has("admin") || pr.scopes.has(scope);
const intQ = (url, k) => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : undefined);

/** Routes shared by /api/app/projects/:id (session, all scopes) and /v1 (API key, scoped). `rest` is the path after the prefix. Returns true when handled. */
async function projectRoutes(req, res, url, p, rest, pr) {
  let s;
  const need = (scope) => (can(pr, scope) ? false : (err(res, 403, "forbidden", `key lacks ${scope} scope`), true));
  if (req.method === "POST" && rest === "/keys") {
    if (need("admin")) return true;
    const b = await readBody(req);
    const mode = b.mode === "test" ? "test" : "live";
    const scopes = (Array.isArray(b.scopes) ? b.scopes : []).filter((x) => SCOPES.includes(x));
    if (!scopes.length) { err(res, 400, "invalid", "at least one scope"); return true; }
    const secret = `ak_${mode}_${randomBytes(24).toString("base64url")}`;
    const k = { id: "key_" + randomBytes(4).toString("hex"), prefix: secret.slice(0, 12), mode, scopes, created_at: new Date().toISOString(), revoked_at: null, hash: sha(secret) };
    p.keys.push(k);
    json(res, 201, { id: k.id, key: secret }); return true;
  }
  if (req.method === "DELETE" && (s = rest.match(/^\/keys\/([^/]+)$/))) { if (need("admin")) return true; const k = p.keys.find((x) => x.id === s[1]); if (!k) err(res, 404, "not_found", "no such key"); else { k.revoked_at ??= new Date().toISOString(); json(res, 200, { revoked: true }); } return true; }
  if (req.method === "GET" && rest === "/tenants") { if (need("read")) return true; json(res, 200, { tenants: [...p.tenants.values()].map((t) => ({ id: t.id, external_id: t.external_id, events: t.head_position + 1, created_at: t.created_at, require_client_sig: t.require_client_sig })) }); return true; }
  if ((s = rest.match(/^\/tenants\/([^/]+)\/keys$/))) {
    const t = p.tenants.get(decodeURIComponent(s[1]));
    if (!t) { err(res, 404, "not_found", "no such tenant"); return true; }
    if (req.method === "GET") { if (need("read")) return true; json(res, 200, { keys: t.keys }); return true; }
    if (req.method === "POST") {
      if (need("write")) return true;
      const b = await readBody(req);
      const pk = String(b.public_key ?? "").trim();
      try { const der = Buffer.from(pk, "base64"); if (der.length !== 44 || der.toString("hex").slice(0, 24) !== "302a300506032b6570032100") throw 0; } catch { err(res, 400, "invalid", "public_key must be a base64 DER SPKI Ed25519 key (44 bytes)"); return true; }
      const k = { id: "tk_" + randomBytes(6).toString("hex"), public_key: pk, created_at: new Date().toISOString(), revoked_at: null };
      t.keys.push(k);
      json(res, 201, { id: k.id }); return true;
    }
  }
  if (req.method === "DELETE" && (s = rest.match(/^\/tenants\/([^/]+)\/keys\/([^/]+)$/))) { if (need("write")) return true; const t = p.tenants.get(decodeURIComponent(s[1])); const k = t?.keys.find((x) => x.id === s[2]); if (!k) err(res, 404, "not_found", "no such key"); else { k.revoked_at ??= new Date().toISOString(); json(res, 200, { revoked: true }); } return true; }
  if (req.method === "POST" && (s = rest.match(/^\/tenants\/([^/]+)\/policy$/))) { if (need("admin")) return true; const t = p.tenants.get(decodeURIComponent(s[1])); if (!t) { err(res, 404, "not_found", "no such tenant"); return true; } const b = await readBody(req); if (b.require_client_sig && !t.keys.some((k) => !k.revoked_at)) { err(res, 400, "invalid", "register a signing key before requiring signatures"); return true; } t.require_client_sig = !!b.require_client_sig; json(res, 200, { require_client_sig: t.require_client_sig }); return true; }
  if (req.method === "GET" && rest === "/events") { if (need("read")) return true; json(res, 200, search(p, url.searchParams)); return true; }
  if (req.method === "GET" && (s = rest.match(/^\/events\/([^/]+)$/))) { if (need("read")) return true; const e = p.byId.get(s[1]); e ? json(res, 200, record(e)) : err(res, 404, "not_found", "no such event"); return true; }
  if (req.method === "GET" && (s = rest.match(/^\/events\/([^/]+)\/proof$/))) { if (need("read")) return true; const pr2 = proof(p, s[1]); pr2 ? json(res, 200, pr2) : err(res, 404, "not_found", "no such event"); return true; }
  if (req.method === "GET" && rest === "/verify") { if (need("read")) return true; const t = url.searchParams.get("tenant"); if (!t) err(res, 400, "invalid", "tenant required"); else json(res, 200, verify(p, t, intQ(url, "from") ?? 0, intQ(url, "to"))); return true; }
  if (req.method === "GET" && rest === "/export") {
    if (need("read")) return true;
    const t = url.searchParams.get("tenant"); if (!t) { err(res, 400, "invalid", "tenant required"); return true; }
    res.writeHead(200, { "content-type": "application/x-ndjson", "content-disposition": `attachment; filename="auditkit-${p.id}-${t}.jsonl"` });
    res.end(exportLines(p, t, intQ(url, "from") ?? 0, intQ(url, "to")).map((l) => JSON.stringify(l)).join("\n") + "\n"); return true;
  }
  return false;
}

// ---- MCP: the seven tools of packages/server/src/mcp.ts over plain JSON-RPC (POST /mcp, JSON responses; no SSE in the mock) ----
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const MCP_TOOLS = [
  { name: "search_events", title: "Search audit events", description: "Search audit events by tenant, actor, action (suffix * allowed), and time range. Newest first.", inputSchema: { type: "object", properties: { tenant: { type: "string" }, actor: { type: "string" }, action: { type: "string" }, from: { type: "string" }, to: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200 }, cursor: { type: "string" } } }, annotations: RO },
  { name: "get_event", title: "Get one audit event", description: "Fetch one event by id, including its payload unless erased.", inputSchema: { type: "object", properties: { event_id: { type: "string" } }, required: ["event_id"] }, annotations: RO },
  { name: "get_proof", title: "Get tamper-evidence proof for an event", description: "Merkle path from the event to the anchored global root, plus the public-log anchor receipts (Rekor, OpenTimestamps). Anchored=false means the event is newer than the last anchor tick.", inputSchema: { type: "object", properties: { event_id: { type: "string" } }, required: ["event_id"] }, annotations: RO },
  { name: "verify_range", title: "Verify chain integrity for a tenant", description: "Re-hash a tenant's events and walk the chain. Returns valid:true with the head hash and the last anchored position, or the first bad position and why.", inputSchema: { type: "object", properties: { tenant: { type: "string" }, from: { type: "integer" }, to: { type: "integer" } }, required: ["tenant"] }, annotations: RO },
  { name: "list_tenants", title: "List tenants", description: "Tenants in this project with event counts.", inputSchema: { type: "object", properties: {} }, annotations: RO },
  { name: "export_evidence", title: "Export verifier-ready evidence", description: "JSONL export for a tenant and position range, verifiable offline with `npx @auditkit/verify`. Large ranges are truncated to 2000 lines here; use the REST /v1/export for full files.", inputSchema: { type: "object", properties: { tenant: { type: "string" }, from: { type: "integer" }, to: { type: "integer" } }, required: ["tenant"] }, annotations: RO },
  { name: "log_event", title: "Record an audit event", description: "Append an event to a tenant's chain. Returns a signed receipt (position, event_hash, server_sig). Cannot be undone; the payload can later be erased but the event stays.", inputSchema: { type: "object", properties: { tenant: { type: "string" }, actor: { type: "string" }, action: { type: "string" }, target: { type: "string" }, occurred_at: { type: "string" }, payload: { type: "object" }, idempotency_key: { type: "string" } }, required: ["tenant", "actor", "action"] }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
];
const mcpText = (x) => ({ content: [{ type: "text", text: typeof x === "string" ? x : JSON.stringify(x) }] });
function mcpCall(pr, name, a = {}) {
  const p = pr.project;
  const noRead = { error: "key lacks read scope" };
  switch (name) {
    case "search_events": { if (!can(pr, "read")) return mcpText(noRead); const q = new URLSearchParams(); for (const k of ["tenant", "actor", "action", "from", "to", "cursor"]) if (a[k]) q.set(k, a[k]); q.set("limit", String(Math.min(a.limit ?? 50, 200))); return mcpText(search(p, q)); }
    case "get_event": return mcpText(can(pr, "read") ? (p.byId.get(a.event_id) ? record(p.byId.get(a.event_id)) : { error: "not found" }) : noRead);
    case "get_proof": return mcpText(can(pr, "read") ? (proof(p, a.event_id) ?? { error: "not found" }) : noRead);
    case "verify_range": return mcpText(can(pr, "read") ? verify(p, a.tenant, a.from ?? 0, a.to) : noRead);
    case "list_tenants": return mcpText(can(pr, "read") ? [...p.tenants.values()].map((t) => ({ id: t.id, external_id: t.external_id, events: t.head_position + 1, created_at: t.created_at })) : noRead);
    case "export_evidence": { if (!can(pr, "read")) return mcpText(noRead); const out = []; for (const l of exportLines(p, a.tenant, a.from ?? 0, a.to)) { out.push(JSON.stringify(l)); if (out.length >= 2000) { out.push('{"type":"truncated"}'); break; } } return mcpText(out.join("\n")); }
    case "log_event": {
      if (!can(pr, "write")) return mcpText({ error: "key lacks write scope" });
      if (p.events.length >= PLANS[p.plan].events_per_month) return mcpText({ error: "plan_limit", message: `monthly event limit of ${PLANS[p.plan].events_per_month} reached; upgrade the plan` });
      return mcpText(ingest(p, { ...a, target: a.target ?? null }));
    }
    default: return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  const m = (method, re) => req.method === method && path.match(re);
  let r;
  const user = users.get(sessions.get(cookies(req).ak_session));

  if (m("GET", /^\/openapi\.json$/)) return json(res, 200, openapi, { "cache-control": "public, max-age=300" });
  if (m("GET", /^\/\.well-known\/auditkit\.json$/)) return json(res, 200, { server_public_key: publicKeySpkiB64, key_algorithm: "Ed25519", anchors: ["rekor", "ots"], anchor_interval_seconds: 60, export_version: 1 });
  if (m("GET", /^\/health$/)) return json(res, 200, { ok: true });

  // auth
  if (m("POST", /^\/auth\/magic$/)) {
    const b = await readBody(req);
    // Always 202: no account enumeration. An unusable address just never gets a link.
    if (typeof b.email === "string" && b.email.includes("@")) {
      const token = randomBytes(24).toString("hex");
      magic.set(token, { email: b.email.toLowerCase(), next: typeof b.next === "string" ? b.next : "/app", exp: Date.now() + 15 * 60_000 });
      console.log(`\n  magic link for ${b.email}:\n  ${SITE}/auth/callback?token=${token}\n`);
    }
    return json(res, 202, { sent: true });
  }
  if (m("GET", /^\/auth\/callback$/)) {
    // Like the server: render a page that auto-POSTs the token, so mail scanners that follow links cannot consume it.
    const tok = url.searchParams.get("token") ?? "";
    return html(res, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Signing in · AuditKit</title></head><body><form method="post" action="/auth/callback"><input type="hidden" name="token" value="${tok.replace(/[^a-f0-9]/g, "")}"><p>Finishing sign-in…</p><button type="submit">Continue</button></form><script>document.forms[0].submit()</script></body></html>`);
  }
  if (m("POST", /^\/auth\/callback$/)) {
    const token = (await readForm(req)).token ?? url.searchParams.get("token");
    const t = magic.get(token);
    magic.delete(token);
    if (!t || t.exp < Date.now()) { res.writeHead(302, { location: "/login?error=expired" }); return res.end(); }
    let u = [...users.values()].find((x) => x.email === t.email);
    if (!u) { u = { id: "usr_" + randomBytes(6).toString("hex"), email: t.email, created_at: new Date().toISOString() }; users.set(u.id, u); newProject(t.email.split("@")[1], u.id); }
    if (!sample.members.has(u.id)) sample.members.set(u.id, "viewer"); // like AUDITKIT_SANDBOX_PROJECT: every new account can read the sample project
    const sid = randomBytes(24).toString("hex");
    sessions.set(sid, u.id);
    const safeNext = /^\/(?!\/|\\)[A-Za-z0-9_\-./?=&%:+,~]*$/.test(t.next) ? t.next : "/app";
    res.writeHead(302, { location: safeNext, "set-cookie": `ak_session=${sid}; Path=/; HttpOnly; SameSite=Lax` });
    return res.end();
  }
  if (m("GET", /^\/auth\/me$/)) return user ? json(res, 200, { user }) : err(res, 401, "unauthenticated", "no session");
  if (m("POST", /^\/auth\/logout$/)) { sessions.delete(cookies(req).ak_session); res.writeHead(204, { "set-cookie": "ak_session=; Path=/; Max-Age=0" }); return res.end(); }

  // OAuth 2.1 (discovery, DCR, PKCE); the authorization server is this process, like packages/server/src/oauth.ts
  if (m("GET", /^\/\.well-known\/oauth-authorization-server$/)) return json(res, 200, { issuer: SITE, authorization_endpoint: `${SITE}/oauth/authorize`, token_endpoint: `${SITE}/oauth/token`, registration_endpoint: `${SITE}/oauth/register`, response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"], code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["none", "client_secret_post"], scopes_supported: SCOPES });
  if (m("GET", /^\/\.well-known\/oauth-protected-resource(\/mcp)?$/)) return json(res, 200, { resource: `${SITE}/mcp`, authorization_servers: [SITE], scopes_supported: SCOPES, bearer_methods_supported: ["header"] });
  if (m("POST", /^\/oauth\/register$/)) {
    const b = await readBody(req);
    const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris.filter((u) => typeof u === "string") : [];
    if (!uris.length || uris.length > 10) return err(res, 400, "invalid_client_metadata", "redirect_uris required (1-10)");
    if (!uris.every(validRedirect)) return err(res, 400, "invalid_redirect_uri", "redirect_uris must be https, or http://localhost");
    const client_id = "oc_" + randomBytes(12).toString("hex");
    const client = { client_id, name: b.client_name ?? "OAuth client", redirect_uris: uris };
    oauthClients.set(client_id, client);
    return json(res, 201, { client_id, client_name: client.name, redirect_uris: uris, token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] });
  }
  if (m("GET", /^\/oauth\/authorize$/)) {
    const q = Object.fromEntries(url.searchParams);
    const client = oauthClients.get(q.client_id ?? "");
    if (q.response_type !== "code" || !client || !client.redirect_uris.includes(q.redirect_uri ?? "")) return html(res, 400, "unknown client or redirect_uri");
    if (q.code_challenge_method !== "S256" || !q.code_challenge || q.code_challenge.length < 43) return html(res, 400, "PKCE S256 code_challenge required");
    if (!user) { res.writeHead(302, { location: `/login?next=${encodeURIComponent(path + "?" + url.searchParams.toString())}` }); return res.end(); }
    const scopes = (q.scope?.split(/[ ,]+/).filter(Boolean) ?? ["read"]).filter((x) => SCOPES.includes(x));
    if (!scopes.length) return html(res, 400, "no valid scopes requested");
    const mine = [...projects.values()].filter((p) => p.members.has(user.id));
    const hidden = ["client_id", "redirect_uri", "state", "code_challenge"].map((k) => `<input type="hidden" name="${k}" value="${esc(q[k] ?? "")}">`).join("");
    const options = mine.map((p, i) => `<label><input type="radio" name="project_id" value="${esc(p.id)}" ${i === 0 ? "checked" : ""}> ${esc(p.name)} (${esc(p.members.get(user.id))})</label><br>`).join("");
    return html(res, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Allow access · AuditKit</title></head><body><main><h1>Allow <strong>${esc(client.name)}</strong> to access your audit log?</h1><p>Signed in as ${esc(user.email)}. Scopes: ${scopes.map((x) => `<code>${x}</code>`).join(" ")}</p>
<form method="post" action="/oauth/authorize">${hidden}<input type="hidden" name="scopes" value="${esc(scopes.join(","))}"><p>Project</p>${options || "<p>You have no projects yet.</p>"}
<button name="decision" value="allow">Allow</button> <button name="decision" value="deny">Deny</button></form></main></body></html>`);
  }
  if (m("POST", /^\/oauth\/authorize$/)) {
    if (!user) return err(res, 401, "unauthenticated", "sign in first");
    const f = await readForm(req);
    const client = oauthClients.get(f.client_id ?? "");
    if (!client || !client.redirect_uris.includes(f.redirect_uri ?? "")) return html(res, 400, "unknown client");
    const redirect = new URL(f.redirect_uri);
    if (f.state) redirect.searchParams.set("state", f.state);
    if (f.decision !== "allow") { redirect.searchParams.set("error", "access_denied"); res.writeHead(302, { location: redirect.toString() }); return res.end(); }
    const p = projects.get(f.project_id ?? "");
    const role = p?.members.get(user.id);
    if (!role) return html(res, 403, "not a member of that project");
    const scopes = (f.scopes ?? "read").split(",").filter((x) => SCOPES.includes(x)).filter((x) => role !== "viewer" || x === "read");
    if (!scopes.length) return html(res, 403, "read-only membership cannot grant write scopes");
    const code = randomBytes(24).toString("base64url");
    oauthCodes.set(code, { client_id: client.client_id, user_id: user.id, project_id: p.id, scopes, code_challenge: f.code_challenge, redirect_uri: f.redirect_uri, exp: Date.now() + CODE_TTL_MS, used: false });
    redirect.searchParams.set("code", code);
    res.writeHead(302, { location: redirect.toString() }); return res.end();
  }
  if (m("POST", /^\/oauth\/token$/)) {
    const f = await readForm(req);
    if (!Object.keys(f).length) return err(res, 400, "invalid_request", "body must be application/x-www-form-urlencoded or JSON");
    if (!oauthClients.has(f.client_id ?? "")) return err(res, 401, "invalid_client", "unknown client_id");
    if (f.grant_type === "authorization_code") {
      const c = oauthCodes.get(f.code ?? "");
      if (!c || c.client_id !== f.client_id || c.redirect_uri !== f.redirect_uri) return err(res, 400, "invalid_grant", "code does not match client or redirect_uri");
      if (c.used) { for (const t of oauthTokens.values()) if (t.user_id === c.user_id && t.client_id === c.client_id && t.project_id === c.project_id) t.revoked = true; return err(res, 400, "invalid_grant", "code already used"); }
      if (c.exp < Date.now()) return err(res, 400, "invalid_grant", "code expired");
      if (createHash("sha256").update(f.code_verifier ?? "").digest("base64url") !== c.code_challenge) return err(res, 400, "invalid_grant", "PKCE verification failed");
      c.used = true;
      return json(res, 200, issueTokens(c));
    }
    if (f.grant_type === "refresh_token") {
      const t = oauthTokens.get(f.refresh_token ?? "");
      if (!t || t.kind !== "refresh" || t.client_id !== f.client_id) return err(res, 400, "invalid_grant", "unknown refresh token");
      if (t.revoked || t.exp < Date.now()) { for (const x of oauthTokens.values()) if (x.family === t.family) x.revoked = true; return err(res, 400, "invalid_grant", "refresh token revoked or expired"); }
      for (const x of oauthTokens.values()) if (x.family === t.family) x.revoked = true;
      return json(res, 200, issueTokens(t));
    }
    return err(res, 400, "unsupported_grant_type", "authorization_code or refresh_token");
  }

  // MCP: Streamable HTTP endpoint, JSON responses only in the mock
  if (path === "/mcp") {
    const pr = principalOf(req);
    if (!pr || !pr.project) return err(res, 401, "unauthenticated", "Bearer API key or OAuth token required", { "www-authenticate": `Bearer resource_metadata="${SITE}/.well-known/oauth-protected-resource/mcp"` });
    if (req.method !== "POST") return err(res, 405, "method_not_allowed", "POST JSON-RPC to /mcp");
    const rpc = await readBody(req);
    const reply = (id, result) => json(res, 200, { jsonrpc: "2.0", id, result });
    const rpcErr = (id, code, message) => json(res, 200, { jsonrpc: "2.0", id, error: { code, message } });
    if (rpc.method === "initialize") return reply(rpc.id, { protocolVersion: rpc.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "auditkit", version: "2.0.0" }, instructions: "Tamper-evident audit log. Events are hash-chained per tenant and anchored to public logs; use get_proof or verify_range to check integrity." });
    if (typeof rpc.method === "string" && rpc.method.startsWith("notifications/")) { res.writeHead(202); return res.end(); }
    if (rpc.method === "tools/list") return reply(rpc.id, { tools: MCP_TOOLS });
    if (rpc.method === "tools/call") { const out = mcpCall(pr, rpc.params?.name, rpc.params?.arguments ?? {}); return out ? reply(rpc.id, out) : rpcErr(rpc.id, -32602, `unknown tool ${rpc.params?.name}`); }
    return rpcErr(rpc.id ?? null, -32601, `method not found: ${rpc.method}`);
  }

  // Stripe webhook: the server verifies the signature and sets project.plan from the subscription; the mock trusts the body.
  if (m("POST", /^\/webhooks\/stripe$/)) {
    const ev = await readBody(req);
    const o = ev.data?.object ?? {};
    const projectId = o.metadata?.project_id ?? o.subscription_details?.metadata?.project_id;
    const p = projects.get(projectId ?? "");
    if (!p) return json(res, 200, { received: true, ignored: "no project_id in metadata" });
    if (ev.type === "checkout.session.completed" || ev.type === "customer.subscription.created" || ev.type === "customer.subscription.updated") { const plan = o.metadata?.plan; if (plan === "pro" || plan === "business") p.plan = plan; p.customer = o.customer ?? p.customer; }
    else if (ev.type === "customer.subscription.deleted") p.plan = "free";
    return json(res, 200, { received: true });
  }

  // public
  if (m("GET", /^\/public\/anchors$/)) {
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    return json(res, 200, { anchors: [...globalRoots].reverse().slice(0, limit).map((g) => ({ global_root: g.hash, created_at: g.created_at, projects: g.projects, receipts: g.anchors.map(({ kind, ref, status, anchored_at }) => ({ kind, ref, status, anchored_at })) })) }, { "cache-control": "public, max-age=30" });
  }
  if (m("GET", /^\/public\/stats$/)) {
    const ev = [...projects.values()].reduce((n, p) => n + p.events.length, 0);
    return json(res, 200, { events_total: Math.round(ev / 10) * 10, roots_total: globalRoots.length, anchors_final: globalRoots.reduce((n, g) => n + g.anchors.filter((a) => a.status === "final").length, 0), projects: projects.size }, { "cache-control": "public, max-age=60" });
  }

  // demo: 30 req/min per IP, 2 KB payloads, 200 events per visitor (web-api.md "Limits")
  if (path.startsWith("/demo/")) {
    if (!demoLimit(clientIp(req))) return err(res, 429, "rate_limited", "demo limit: 30 requests per minute");
    const tenant = ipHash(req);
    if (m("POST", /^\/demo\/log$/)) {
      const b = await readBody(req);
      if (!b.actor || !b.action) return err(res, 400, "invalid", "actor and action are required");
      if (JSON.stringify(b.payload ?? null).length > DEMO_MAX_PAYLOAD) return err(res, 400, "invalid", "demo payloads are limited to 2 KB");
      if ((demo.tenants.get(tenant)?.head_position ?? -1) + 1 >= DEMO_MAX_PER_VISITOR) return err(res, 429, "rate_limited", `demo chains are limited to ${DEMO_MAX_PER_VISITOR} events; sign up for a real project`);
      return json(res, 201, ingest(demo, { tenant, actor: String(b.actor).slice(0, 80), action: String(b.action).slice(0, 80), target: b.target ? String(b.target).slice(0, 80) : null, payload: b.payload ?? null }));
    }
    if (m("GET", /^\/demo\/events$/)) { const q = new URLSearchParams({ tenant, limit: "20" }); return json(res, 200, search(demo, q)); }
    if (m("GET", /^\/demo\/verify$/)) return json(res, 200, verify(demo, tenant));
    if ((r = m("GET", /^\/demo\/proof\/([^/]+)$/))) { const pr = demo.byId.get(r[1]); return pr && pr.tenant === tenant ? json(res, 200, proof(demo, r[1])) : err(res, 404, "not_found", "no such event"); }
    return err(res, 404, "not_found", "unknown demo route");
  }

  // viewer (token)
  if (path.startsWith("/api/viewer/")) {
    const raw = url.searchParams.get("token") ?? bearer(req);
    let vt = null, vp = null;
    for (const p of projects.values()) { const t = p.viewerTokens.find((x) => x.token === raw); if (t) { vt = t; vp = p; break; } }
    if (!vt || vt.revoked_at || vt.expires_at < new Date().toISOString()) return err(res, 401, "invalid_token", "viewer token is missing, expired or revoked");
    let s;
    if (m("GET", /^\/api\/viewer\/me$/)) return json(res, 200, { tenant: vt.tenant, project_id: vp.id });
    if (m("GET", /^\/api\/viewer\/events$/)) { const q = new URLSearchParams(url.searchParams); q.set("tenant", vt.tenant); return json(res, 200, search(vp, q)); }
    if ((s = m("GET", /^\/api\/viewer\/events\/([^/]+)\/proof$/))) { const e = vp.byId.get(s[1]); return e && e.tenant === vt.tenant ? json(res, 200, proof(vp, s[1])) : err(res, 404, "not_found", "no such event"); }
    if ((s = m("GET", /^\/api\/viewer\/events\/([^/]+)$/))) { const e = vp.byId.get(s[1]); return e && e.tenant === vt.tenant ? json(res, 200, record(e)) : err(res, 404, "not_found", "no such event"); }
    if (m("GET", /^\/api\/viewer\/verify$/)) return json(res, 200, verify(vp, vt.tenant, intQ(url, "from") ?? 0, intQ(url, "to")));
    if (m("GET", /^\/api\/viewer\/export$/)) { res.writeHead(200, { "content-type": "application/x-ndjson", "content-disposition": `attachment; filename="auditkit-${vt.tenant}.jsonl"` }); return res.end(exportLines(vp, vt.tenant, intQ(url, "from") ?? 0, intQ(url, "to")).map((l) => JSON.stringify(l)).join("\n") + "\n"); }
    return err(res, 404, "not_found", "unknown viewer route");
  }

  // /v1: API keys (ak_…) or OAuth tokens (oat_…), scoped; 1200 req/min per key
  if (path.startsWith("/v1/")) {
    const pr = principalOf(req);
    if (!pr || !pr.project) return err(res, 401, "unauthenticated", "Bearer API key required");
    if (!keyLimit(pr.keyId)) return err(res, 429, "rate_limited", "1200 requests per minute per key");
    const p = pr.project, rest = path.slice(3);
    let s;
    const need = (scope) => (can(pr, scope) ? false : (err(res, 403, "forbidden", `key lacks ${scope} scope`), true));
    const overLimit = (n) => (p.events.length + n > PLANS[p.plan].events_per_month ? (err(res, 429, "plan_limit", `monthly event limit of ${PLANS[p.plan].events_per_month} reached; upgrade the plan`), true) : false);
    const idem = (b) => b.idempotency_key ?? req.headers["idempotency-key"];
    if (req.method === "POST" && rest === "/events") {
      if (need("write")) return;
      const b = await readBody(req);
      if (!b.tenant || !b.actor || !b.action) return err(res, 400, "invalid", "tenant, actor and action are required");
      if (JSON.stringify(b.payload ?? null).length > 65_536) return err(res, 400, "invalid", "payload exceeds 64 KB");
      if (overLimit(1)) return;
      const rc = ingest(p, { ...b, target: b.target ?? null, idempotency_key: idem(b) });
      return json(res, rc.duplicate ? 200 : 201, rc);
    }
    if (req.method === "POST" && rest === "/events/bulk") {
      if (need("write")) return;
      const b = await readBody(req);
      if (!Array.isArray(b.events) || !b.events.length || b.events.length > 1000) return err(res, 400, "invalid", "events: 1 to 1000 items");
      if (overLimit(b.events.length)) return;
      return json(res, 201, { receipts: b.events.map((e) => ingest(p, { ...e, target: e.target ?? null })) });
    }
    if (req.method === "POST" && rest === "/tenants") { if (need("write")) return; const b = await readBody(req); if (!b.external_id) return err(res, 400, "invalid", "external_id required"); const t = tenantOf(p, String(b.external_id)); return json(res, 201, { id: t.id, external_id: t.external_id, events: t.head_position + 1, created_at: t.created_at }); }
    if (req.method === "POST" && (s = rest.match(/^\/erase\/([^/]+)$/))) { if (need("erase")) return; const out = erasePayload(p, s[1], `key:${pr.keyId}`); return out ? json(res, 200, out) : err(res, 404, "not_found", "no payload to erase"); }
    if (await projectRoutes(req, res, url, p, rest, pr)) return;
    return err(res, 404, "not_found", `no route ${req.method} ${path}`);
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
      const role = p.members.get(user.id);
      const pr = { project: p, keyId: "session:" + user.id, scopes: new Set(role === "viewer" ? ["read"] : SCOPES) };
      let s;
      if (req.method === "GET" && rest === "") {
        const lastTr = p.tenantRoots.at(-1);
        const g = lastTr && globalRoots.find((x) => x.id === lastTr.global_root_id);
        return json(res, 200, { ...summary(p), usage: { events_this_month: p.events.length, limit_events: PLANS[p.plan].events_per_month, retention_days: PLANS[p.plan].retention_days, anchor_interval_seconds: PLANS[p.plan].anchor_interval_seconds }, tenants: p.tenants.size, last_anchor: g ? { global_root: g.hash, created_at: g.created_at, anchors: g.anchors.map(({ kind, ref, status, anchored_at }) => ({ kind, ref, status, anchored_at })) } : null });
      }
      if (req.method === "GET" && rest === "/keys") return json(res, 200, { keys: p.keys.map(({ hash, ...k }) => k) });
      if (req.method === "GET" && rest === "/viewer-tokens") return json(res, 200, { tokens: p.viewerTokens.map(({ token, ...t }) => t) });
      if (req.method === "POST" && rest === "/viewer-tokens") {
        const b = await readBody(req);
        if (!b.tenant || !p.tenants.has(b.tenant)) return err(res, 400, "invalid", "tenant required and must exist");
        const ttl = Math.min(Math.max(Number(b.ttl_hours ?? 168), 1), 2160);
        const token = "vt_" + randomBytes(24).toString("base64url");
        // No back-reference to the project here: the GET above serialises these objects.
        const t = { id: "vtk_" + randomBytes(4).toString("hex"), tenant: b.tenant, expires_at: new Date(Date.now() + ttl * 3_600_000).toISOString(), created_at: new Date().toISOString(), revoked_at: null, token };
        p.viewerTokens.push(t);
        return json(res, 201, { id: t.id, token, expires_at: t.expires_at, url: `${SITE}/viewer?token=${token}` });
      }
      if (req.method === "DELETE" && (s = rest.match(/^\/viewer-tokens\/([^/]+)$/))) { const t = p.viewerTokens.find((x) => x.id === s[1]); if (!t) return err(res, 404, "not_found", "no such token"); t.revoked_at ??= new Date().toISOString(); return json(res, 200, { revoked: true }); }
      if (req.method === "POST" && rest === "/billing/checkout") { const b = await readBody(req); if (!BILLING) return err(res, 501, "billing_not_configured", "Stripe is not configured on this server"); if (!["pro", "business"].includes(b.plan)) return err(res, 400, "invalid", "plan must be pro or business"); setTimeout(() => { p.plan = b.plan; }, 3000); return json(res, 200, { url: `https://checkout.stripe.com/c/pay/mock_${p.id}_${b.plan}` }); }
      if (req.method === "POST" && rest === "/billing/portal") return BILLING ? json(res, 200, { url: "https://billing.stripe.com/p/session/mock" }) : err(res, 501, "billing_not_configured", "Stripe is not configured on this server");
      if (await projectRoutes(req, res, url, p, rest, pr)) return;
    }
    return err(res, 404, "not_found", "unknown app route");
  }
  return err(res, 404, "not_found", `no route ${req.method} ${path}`);
});
server.listen(PORT, () => console.log(`mock api on http://localhost:${PORT}  (anchor tick every ${ANCHOR_EVERY_MS / 1000}s, billing ${BILLING ? "on" : "501"}, proxy trust ${PROXY_TRUST})`));
