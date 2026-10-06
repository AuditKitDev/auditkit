import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import { spawnSync } from "node:child_process";
import { clientSignable, type Anchor, type AnchorReceipt, type ExportLine } from "@auditkit/core";
import { openRegistry, closeAll, loadSigner, createProject, createKey, buildApp, tick, type Config } from "@auditkit/server";
import { verifyExport, type Report } from "./index.js";

type EventLine = Extract<ExportLine, { type: "event" }>;

const anchored: string[] = [];
const fakeAnchor: Anchor = {
  kind: "rekor",
  async anchor(root) { anchored.push(root); return { kind: "rekor", ref: `fake:${anchored.length}`, proof: "e30=", anchored_at: new Date().toISOString(), status: "final" }; },
  async upgrade(r) { return r; },
  async verify(root, r: AnchorReceipt) { return anchored.includes(root) && r.kind === "rekor" ? { ok: true, attested_at: r.anchored_at } : { ok: false, reason: "unknown" }; },
};
const anchors = { rekor: fakeAnchor };

let cfg: Config;
let serverKey: string;
let beforeTick: string;
let clean: string;
let erasedExport: string;

const parse = (txt: string) => txt.trim().split("\n").map((l) => JSON.parse(l) as ExportLine);
const dump = (lines: ExportLine[]) => lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
async function* stream(txt: string) { for (const l of txt.split("\n")) yield l; }
const run = (txt: string, extra = {}) => verifyExport(stream(txt), { anchors, ...extra });

beforeAll(async () => {
  cfg = { dataDir: mkdtempSync(join(tmpdir(), "auditkit-verify-")) };
  const reg = openRegistry(cfg);
  const signer = loadSigner(cfg.dataDir);
  serverKey = signer.publicKeySpkiB64;
  const projectId = createProject(reg, "verify-test").id;
  const key = createKey(reg, projectId, "test", ["admin"]).key;
  const app = buildApp({ cfg, reg, signer, anchorPolicy: { kinds: ["rekor"], interval_seconds: 1 } });
  const api = (path: string, init: RequestInit = {}) =>
    app.request(path, { ...init, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" } });

  const events = Array.from({ length: 12 }, (_, i) => ({ tenant: "acme", actor: `u_${i % 3}`, action: i === 0 ? "invoice.delete" : "job.run", target: `t${i}`, payload: { i, nested: { b: 1, a: [2, 3] } } }));
  expect((await api("/v1/events/bulk", { method: "POST", body: JSON.stringify({ events }) })).status).toBe(201);
  beforeTick = await (await api("/v1/export?tenant=acme")).text();

  expect(await tick(cfg, reg, [fakeAnchor])).toMatchObject({ projects: 1 });
  clean = await (await api("/v1/export?tenant=acme")).text();

  const list = await (await api("/v1/events?tenant=acme&action=invoice.delete")).json();
  expect((await api(`/v1/erase/${list.events[0].id}`, { method: "POST" })).status).toBe(200);
  erasedExport = await (await api("/v1/export?tenant=acme")).text();
});
afterAll(() => { closeAll(); rmSync(cfg.dataDir, { recursive: true, force: true }); });

const status = (r: Report, name: string) => r.checks.find((c) => c.name === name)?.status;

describe("verifyExport", () => {
  it("(a) clean export is VALID with every position anchored", async () => {
    const r = await run(clean);
    expect(r.verdict).toBe("VALID");
    expect(r.events).toBe(12);
    for (const n of ["manifest", "chain", "signatures", "payloads", "roots", "anchors", "coverage"]) expect(status(r, n), n).toBe("ok");
    expect(status(r, "client_sigs")).toBe("skipped");
    expect(r.anchors).toEqual([expect.objectContaining({ kind: "rekor", status: "verified", root_range: [0, 11] })]);
    expect(r.coverage).toMatchObject({ anchored: [[0, 11]], chain_only: [], rooted_unanchored: [] });
  });
  it("accepts an already-parsed array too", async () => {
    expect((await verifyExport(parse(clean), { anchors })).verdict).toBe("VALID");
  });
  it("(b) a tampered field is INVALID at that position", async () => {
    const lines = parse(clean);
    const ev = lines[4] as EventLine;
    expect(ev.position).toBe(3);
    ev.actor = "evil";
    const r = await run(dump(lines));
    expect(r.verdict).toBe("INVALID");
    expect(r.failed).toMatchObject({ check: "chain", position: 3 });
  });
  it("(b') a tampered payload is INVALID at that position", async () => {
    const lines = parse(clean);
    const ev = lines[6] as EventLine;
    ev.payload!.data = { i: 999 };
    const r = await run(dump(lines));
    expect(r.failed).toMatchObject({ check: "payloads", position: 5 });
    expect(r.verdict).toBe("INVALID");
  });
  it("(c) a dropped line is INVALID", async () => {
    const lines = parse(clean);
    lines.splice(3, 1); // position 2
    const r = await run(dump(lines));
    expect(r.verdict).toBe("INVALID");
    expect(r.failed).toMatchObject({ check: "chain", position: 3 });
    // dropping the last event: chain still links, manifest range catches it
    const tail = parse(clean).filter((l) => !(l.type === "event" && l.position === 11));
    const r2 = await run(dump(tail));
    expect(r2.verdict).toBe("INVALID");
    expect(r2.failed).toMatchObject({ check: "chain", position: 11 });
  });
  it("(d) a forged signature is INVALID at that position", async () => {
    const lines = parse(clean);
    const ev = lines[5] as EventLine;
    const { privateKey } = generateKeyPairSync("ed25519");
    ev.server_sig = sign(null, Buffer.from(ev.event_hash, "hex"), privateKey).toString("base64");
    const r = await run(dump(lines));
    expect(r.verdict).toBe("INVALID");
    expect(r.failed).toMatchObject({ check: "signatures", position: 4 });
  });
  it("(d') a re-hashed rewrite fails against the anchored root", async () => {
    const { chainEvent, commitPayload } = await import("@auditkit/core");
    const lines = parse(clean);
    const { privateKey } = generateKeyPairSync("ed25519");
    const manifest = lines[0] as Extract<ExportLine, { type: "manifest" }>;
    manifest.server_public_key = (await import("node:crypto")).createPublicKey(privateKey).export({ format: "der", type: "spki" }).toString("base64");
    let prev = null as ReturnType<typeof chainEvent> | null;
    for (const l of lines) {
      if (l.type !== "event") continue;
      if (l.position === 1) l.actor = "evil";
      const { type: _t, tenant: _tn, server_sig: _s, payload, event_hash: _h, prev_hash: _p, ...hdr } = l;
      const ev = chainEvent({ ...hdr, payload_commit: commitPayload(payload!.salt, payload!.data) }, prev);
      l.prev_hash = ev.prev_hash; l.event_hash = ev.event_hash;
      l.server_sig = sign(null, Buffer.from(ev.event_hash, "hex"), privateKey).toString("base64");
      prev = ev;
    }
    const r = await run(dump(lines));
    expect(status(r, "chain")).toBe("ok");
    expect(status(r, "signatures")).toBe("ok");
    expect(r.verdict).toBe("INVALID");
    expect(r.failed).toMatchObject({ check: "roots", position: 0 });
  });
  it("(e) an erased payload is reported erased and stays VALID", async () => {
    const r = await run(erasedExport);
    expect(r.verdict).toBe("VALID");
    expect(r.erased).toBe(1);
    expect(r.checks.find((c) => c.name === "payloads")?.summary).toContain("1 erased");
  });
  it("(f) an export before any tick is VALID_UNANCHORED", async () => {
    const r = await run(beforeTick);
    expect(r.verdict).toBe("VALID_UNANCHORED");
    expect(status(r, "roots")).toBe("skipped");
    expect(r.coverage).toMatchObject({ anchored: [], chain_only: [[0, 11]] });
  });
  it("an anchor the verifier rejects is VALID_UNANCHORED, not INVALID", async () => {
    const r = await run(clean, { anchors: { rekor: { ...fakeAnchor, verify: async () => ({ ok: false, reason: "not in log" }) } } });
    expect(r.verdict).toBe("VALID_UNANCHORED");
    expect(r.anchors[0]).toMatchObject({ status: "failed", reason: "not in log" });
    expect(r.coverage).toMatchObject({ rooted_unanchored: [[0, 11]] });
  });
  it("(g) a wrong pinned key is INVALID", async () => {
    const r = await run(clean, { pinnedServerKey: "MCowBQYDK2VwAyEA" + "A".repeat(43) + "=" });
    expect(r.verdict).toBe("INVALID");
    expect(r.failed).toMatchObject({ check: "signatures", position: null });
    expect((await run(clean, { pinnedServerKey: serverKey })).verdict).toBe("VALID");
  });
  it("rejects a file that does not start with a manifest or is not JSONL", async () => {
    expect((await run(dump(parse(clean).slice(1)))).failed).toMatchObject({ check: "manifest" });
    expect((await run("{not json\n")).failed).toMatchObject({ check: "manifest", reason: "line 1: not JSON" });
  });
  it("verifies client signatures over clientSignable when keys are given", async () => {
    const lines = parse(clean);
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const tenant = (lines[0] as Extract<ExportLine, { type: "manifest" }>).tenant;
    expect(tenant).toBe("acme");
    for (const l of lines) if (l.type === "event") l.client_sig = sign(null, Buffer.from(clientSignable(l), "hex"), privateKey).toString("base64");
    expect(status(await run(dump(lines)), "client_sigs")).toBe("unverified");
    const spki = publicKey.export({ format: "der", type: "spki" }).toString("base64");
    expect(status(await run(dump(lines), { clientKeys: { [tenant]: spki } }), "client_sigs")).toBe("ok");
    (lines[2] as EventLine).client_sig = (lines[3] as EventLine).client_sig!;
    expect(status(await run(dump(lines), { clientKeys: { [tenant]: spki } }), "client_sigs")).toBe("fail");
  });
  it("a client_sig over event_hash instead of clientSignable fails", async () => {
    const lines = parse(clean);
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    for (const l of lines) if (l.type === "event") l.client_sig = sign(null, Buffer.from(l.event_hash, "hex"), privateKey).toString("base64");
    const spki = publicKey.export({ format: "der", type: "spki" }).toString("base64");
    expect(status(await run(dump(lines), { clientKeys: { acme: spki } }), "client_sigs")).toBe("fail");
  });
  it("a root whose events are missing from the export is INVALID", async () => {
    const lines = parse(clean).filter((l) => !(l.type === "event" && l.position === 11));
    (lines[0] as Extract<ExportLine, { type: "manifest" }>).to_position = 10;
    const r = await run(dump(lines));
    expect(status(r, "chain")).toBe("ok");
    expect(r.verdict).toBe("INVALID");
    expect(r.failed).toMatchObject({ check: "roots" });
  });
});

describe("cli", () => {
  // The CLI uses the real Rekor verifier, which rejects the fake receipt: chain ok, anchor not.
  const cli = (args: string[]) => spawnSync(process.execPath, [join(import.meta.dirname, "..", "dist", "cli.js"), ...args], { encoding: "utf8" });
  it("exits 2 for VALID_UNANCHORED, 1 for INVALID, prints one line per check", () => {
    const file = join(cfg.dataDir, "clean.jsonl");
    writeFileSync(file, clean);
    const ok = cli([file]);
    expect(ok.status).toBe(2);
    expect(ok.stdout).toMatch(/^ok {3}manifest/m);
    expect(ok.stdout).toContain("VALID_UNANCHORED");
    const bad = join(cfg.dataDir, "bad.jsonl");
    writeFileSync(bad, clean.replace('"actor":"u_0"', '"actor":"evil"'));
    const r = cli([bad, "--json"]);
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout)).toMatchObject({ verdict: "INVALID", failed: { check: "chain", position: 0 } });
    expect(ok.stdout).toContain("unpinned");
    expect(cli([file, "--pin", "nope"]).status).toBe(1);
    expect(cli([]).status).toBe(64);
  });
});
