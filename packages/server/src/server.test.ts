import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyProof, verifyChain, GENESIS, type ExportLine, type Anchor, type AnchorReceipt, type ChainedEvent } from "@auditkit/core";
import { openRegistry, openProject, closeAll, type Config } from "./db.js";
import { loadSigner, verifyWithSpki } from "./signing.js";
import { createProject, createKey } from "./keys.js";
import { buildApp } from "./app.js";
import { tick, maintain } from "./anchorLoop.js";

let cfg: Config;
let app: ReturnType<typeof buildApp>;
let reg: ReturnType<typeof openRegistry>;
let key: string;
let readKey: string;
let projectId: string;
const anchored: string[] = [];
const fakeAnchor: Anchor = {
  kind: "rekor",
  async anchor(root) { anchored.push(root); return { kind: "rekor", ref: `fake:${anchored.length}`, proof: "e30=", anchored_at: new Date().toISOString(), status: "final" }; },
  async upgrade(r) { return r; },
  async verify(root, r: AnchorReceipt) { return anchored.includes(root) && r.kind === "rekor" ? { ok: true, attested_at: r.anchored_at } : { ok: false, reason: "unknown" }; },
};

const api = (path: string, init: RequestInit = {}, k = key) =>
  app.request(path, { ...init, headers: { authorization: `Bearer ${k}`, "content-type": "application/json", ...(init.headers ?? {}) } });

beforeAll(() => {
  cfg = { dataDir: mkdtempSync(join(tmpdir(), "auditkit-")) };
  reg = openRegistry(cfg);
  const signer = loadSigner(cfg.dataDir);
  projectId = createProject(reg, "test").id;
  key = createKey(reg, projectId, "test", ["admin"]).key;
  readKey = createKey(reg, projectId, "test", ["read"]).key;
  app = buildApp({ cfg, reg, signer, anchorPolicy: { kinds: ["rekor"], interval_seconds: 1 } });
});
afterAll(() => { closeAll(); rmSync(cfg.dataDir, { recursive: true, force: true }); });

describe("auth", () => {
  it("rejects missing, malformed and unknown keys", async () => {
    expect((await app.request("/v1/events")).status).toBe(401);
    expect((await api("/v1/events", {}, "ak_test_short")).status).toBe(401);
    expect((await api("/v1/events", {}, "ak_live_" + "x".repeat(32))).status).toBe(401);
  });
  it("enforces scopes", async () => {
    const r = await api("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "a", actor: "u", action: "x" }) }, readKey);
    expect(r.status).toBe(403);
  });
});

describe("ingest + query", () => {
  it("logs events, returns signed receipts, chains per tenant", async () => {
    const r1 = await api("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "acme", actor: "u_1", action: "invoice.delete", target: "inv_42", payload: { amount: 10, nested: { b: 1, a: 2 } } }) });
    expect(r1.status).toBe(201);
    const rc1 = await r1.json();
    expect(rc1.position).toBe(0);
    expect(rc1.prev_hash).toBe(GENESIS);
    const wk = await (await app.request("/.well-known/auditkit.json")).json();
    expect(verifyWithSpki(wk.server_public_key, rc1.event_hash, rc1.server_sig)).toBe(true);

    const r2 = await api("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "acme", actor: "u_2", action: "user.mfa.disable" }) });
    const rc2 = await r2.json();
    expect(rc2.position).toBe(1);
    expect(rc2.prev_hash).toBe(rc1.event_hash);

    const other = await (await api("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "globex", actor: "u_9", action: "login" }) })).json();
    expect(other.position).toBe(0);
  });
  it("is idempotent on Idempotency-Key", async () => {
    const body = JSON.stringify({ tenant: "acme", actor: "u_3", action: "refund.approve" });
    const a = await (await api("/v1/events", { method: "POST", body, headers: { "idempotency-key": "k1" } })).json();
    const b = await (await api("/v1/events", { method: "POST", body, headers: { "idempotency-key": "k1" } })).json();
    expect(b).toMatchObject({ id: a.id, position: a.position, duplicate: true });
  });
  it("bulk ingests in order", async () => {
    const events = Array.from({ length: 20 }, (_, i) => ({ tenant: "acme", actor: "bot", action: "job.run", target: `j${i}` }));
    const r = await api("/v1/events/bulk", { method: "POST", body: JSON.stringify({ events }) });
    expect(r.status).toBe(201);
    const { receipts } = await r.json();
    expect(receipts.map((x: { position: number }) => x.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 3));
  });
  it("searches and paginates scoped by tenant", async () => {
    const p1 = await (await api("/v1/events?tenant=acme&limit=10")).json();
    expect(p1.events).toHaveLength(10);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = await (await api(`/v1/events?tenant=acme&limit=10&cursor=${p1.next_cursor}`)).json();
    expect(p2.events[0].id).not.toBe(p1.events[0].id);
    const byAction = await (await api("/v1/events?tenant=acme&action=invoice.*")).json();
    expect(byAction.events).toHaveLength(1);
    expect(byAction.events[0].payload).toEqual({ amount: 10, nested: { b: 1, a: 2 } });
    const glob = await (await api("/v1/events?tenant=globex")).json();
    expect(glob.events).toHaveLength(1);
  });
  it("rejects bad input", async () => {
    expect((await api("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "acme" }) })).status).toBe(400);
    expect((await api("/v1/events", { method: "POST", body: JSON.stringify({ tenant: "acme", actor: "u", action: "x", occurred_at: "yesterday" }) })).status).toBe(400);
  });
});

describe("verify, anchor, proof, export", () => {
  it("verifies a clean chain", async () => {
    const v = await (await api("/v1/verify?tenant=acme")).json();
    expect(v).toMatchObject({ valid: true, count: 23, rooted_through: -1, anchored_through: -1 });
  });
  it("anchors one global root per tick and proofs chain through three trees", async () => {
    const t = await tick(cfg, reg, [fakeAnchor]);
    expect(t).toMatchObject({ projects: 1 });
    expect(anchored).toHaveLength(1);
    expect(await tick(cfg, reg, [fakeAnchor])).toBeNull(); // nothing new

    const list = await (await api("/v1/events?tenant=acme&limit=1")).json();
    const proof = await (await api(`/v1/events/${list.events[0].id}/proof`)).json();
    expect(proof.anchored).toBe(true);
    expect(verifyProof(proof.event_hash, proof.path_to_tenant_root, proof.tenant_root)).toBe(true);
    expect(verifyProof(proof.tenant_root, proof.path_to_project_root, proof.project_root)).toBe(true);
    expect(verifyProof(proof.project_root, proof.path_to_global_root, proof.global_root)).toBe(true);
    expect(proof.global_root).toBe(anchored[0]);
    expect(proof.anchors[0]).toMatchObject({ kind: "rekor", status: "final" });
    const v = await (await api("/v1/verify?tenant=acme")).json();
    expect(v).toMatchObject({ rooted_through: 22, anchored_through: 22 });
  });
  it("exports a file the offline verifier can check without the server", async () => {
    const txt = await (await api("/v1/export?tenant=acme")).text();
    const lines = txt.trim().split("\n").map((l) => JSON.parse(l) as ExportLine);
    const manifest = lines[0]! as Extract<ExportLine, { type: "manifest" }>;
    expect(manifest.type).toBe("manifest");
    const events = lines.filter((l): l is Extract<ExportLine, { type: "event" }> => l.type === "event");
    expect(events).toHaveLength(23);
    expect(manifest).toMatchObject({ server: "localhost", tenant: "acme", requested_from: 0 });
    const chained: ChainedEvent[] = events.map(({ type: _t, server_sig: _s, client_sig: _c, payload: _p, tenant: _n, ...h }) => h);
    expect(verifyChain(chained, manifest.prev_hash).valid).toBe(true);
    for (const e of events) expect(verifyWithSpki(manifest.server_public_key, e.event_hash, e.server_sig)).toBe(true);
    const roots = lines.filter((l): l is Extract<ExportLine, { type: "root" }> => l.type === "root");
    expect(roots).toHaveLength(1);
    expect(verifyProof(roots[0]!.tenant_root, roots[0]!.path_to_project, roots[0]!.project_root)).toBe(true);
    expect(verifyProof(roots[0]!.project_root, roots[0]!.path_to_global, roots[0]!.global_root)).toBe(true);
    expect(await fakeAnchor.verify(roots[0]!.global_root, roots[0]!.anchors[0]!)).toMatchObject({ ok: true });
  });
  it("erasure removes the payload and keeps the chain valid", async () => {
    const list = await (await api("/v1/events?tenant=acme&action=invoice.delete")).json();
    const id = list.events[0].id;
    expect((await api(`/v1/erase/${id}`, { method: "POST" })).status).toBe(200);
    const ev = await (await api(`/v1/events/${id}`)).json();
    expect(ev).toMatchObject({ erased: true, payload: null });
    expect((await (await api("/v1/verify?tenant=acme")).json()).valid).toBe(true);
    expect((await api(`/v1/erase/${id}`, { method: "POST" })).status).toBe(404);
  });
});

describe("tamper tests (direct DB edits must be caught)", () => {
  const seed = async (tenant: string) => {
    await api("/v1/events/bulk", { method: "POST", body: JSON.stringify({ events: Array.from({ length: 8 }, (_, i) => ({ tenant, actor: "u", action: "a", target: `t${i}`, payload: { i } })) }) });
    return openProject(cfg, projectId);
  };
  const verdict = async (tenant: string) => (await api(`/v1/verify?tenant=${tenant}`)).json();

  it("edited field", async () => {
    const db = await seed("tamper1");
    db.prepare("UPDATE event SET actor = 'evil' WHERE tenant_id = (SELECT id FROM tenant WHERE external_id = 'tamper1') AND position = 3").run();
    expect(await verdict("tamper1")).toMatchObject({ valid: false, position: 3 });
  });
  it("edited payload", async () => {
    const db = await seed("tamper2");
    db.prepare("UPDATE payload SET data = '{\"i\":999}' WHERE event_id = (SELECT id FROM event WHERE tenant_id = (SELECT id FROM tenant WHERE external_id = 'tamper2') AND position = 5)").run();
    expect(await verdict("tamper2")).toMatchObject({ valid: false, position: 5, reason: expect.stringContaining("payload") });
  });
  it("deleted event", async () => {
    const db = await seed("tamper3");
    db.exec("PRAGMA foreign_keys=OFF");
    db.prepare("DELETE FROM event WHERE tenant_id = (SELECT id FROM tenant WHERE external_id = 'tamper3') AND position = 2").run();
    db.exec("PRAGMA foreign_keys=ON");
    expect(await verdict("tamper3")).toMatchObject({ valid: false, position: 3 });
  });
  it("truncated tail", async () => {
    const db = await seed("tamper4");
    db.exec("PRAGMA foreign_keys=OFF");
    db.prepare("DELETE FROM event WHERE tenant_id = (SELECT id FROM tenant WHERE external_id = 'tamper4') AND position >= 6").run();
    db.exec("PRAGMA foreign_keys=ON");
    expect((await verdict("tamper4")).valid).toBe(false);
  });
  it("full re-hash rewrite still fails against the anchored root", async () => {
    const db = await seed("tamper5");
    await tick(cfg, reg, [fakeAnchor]);
    await maintain(reg, [fakeAnchor]);
    // An admin rewrites event 1 and recomputes every hash downstream; the chain self-verifies...
    const { chainEvent, commitPayload } = await import("@auditkit/core");
    const tid = (db.prepare("SELECT id FROM tenant WHERE external_id = 'tamper5'").get() as { id: string }).id;
    const rows = db.prepare("SELECT * FROM event WHERE tenant_id = ? ORDER BY position").all(tid) as Array<Record<string, string | number>>;
    const payloads = Object.fromEntries((db.prepare("SELECT event_id, salt, data FROM payload").all() as Array<{ event_id: string; salt: string; data: string }>).map((p) => [p.event_id, p]));
    let prev: ChainedEvent | null = null;
    for (const r of rows) {
      const actor = r.position === 1 ? "evil" : (r.actor as string);
      const p = payloads[r.id as string]!;
      const ev: ChainedEvent = chainEvent({ id: r.id as string, project_id: projectId, tenant_id: tid, position: r.position as number, occurred_at: r.occurred_at as string, actor, action: r.action as string, target: r.target as string | null, payload_commit: commitPayload(p.salt, JSON.parse(p.data)) }, prev);
      db.prepare("UPDATE event SET actor = ?, prev_hash = ?, event_hash = ? WHERE id = ?").run(actor, ev.prev_hash, ev.event_hash, r.id as string);
      prev = ev;
    }
    db.prepare("UPDATE tenant SET head_hash = ? WHERE id = ?").run(prev!.event_hash, tid);
    expect((await verdict("tamper5")).valid).toBe(true); // the chain alone cannot tell
    // ...but the proof no longer reaches the publicly anchored root.
    const last = rows[rows.length - 1]!;
    const proof = await (await api(`/v1/events/${last.id}/proof`)).json();
    expect(verifyProof(proof.event_hash, proof.path_to_tenant_root, proof.tenant_root)).toBe(false);
  });
});

describe("mcp", () => {
  const rpc = (method: string, params: unknown = {}, id = 1) =>
    api("/mcp", { method: "POST", headers: { accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
  it("initializes and lists annotated tools", async () => {
    const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } });
    expect(init.status).toBe(200);
    const tools = (await (await rpc("tools/list")).json()).result.tools as Array<{ name: string; title?: string; annotations?: { readOnlyHint?: boolean } }>;
    expect(tools.map((t) => t.name).sort()).toEqual(["export_evidence", "get_event", "get_proof", "list_tenants", "log_event", "search_events", "verify_range"]);
    for (const t of tools) { expect(t.title).toBeTruthy(); expect(t.annotations).toBeDefined(); }
    expect(tools.find((t) => t.name === "log_event")!.annotations!.readOnlyHint).toBe(false);
  });
  it("calls tools against the key's project", async () => {
    const r = await (await rpc("tools/call", { name: "verify_range", arguments: { tenant: "acme" } })).json();
    expect(JSON.parse(r.result.content[0].text).valid).toBe(true);
    const w = await (await rpc("tools/call", { name: "log_event", arguments: { tenant: "acme", actor: "claude", action: "note.add", payload: { via: "mcp" } } })).json();
    expect(JSON.parse(w.result.content[0].text)).toHaveProperty("server_sig");
    expect((await app.request("/mcp", { method: "POST", body: "{}" })).status).toBe(401);
  });
});
