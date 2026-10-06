import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { openRegistry, closeAll, loadSigner, createProject, createKey, buildApp, type Config } from "@auditkit/server";
import { AuditKit, AuditKitError, clientSignable, verifyClientSig, type Receipt } from "./index.js";

let cfg: Config;
let app: ReturnType<typeof buildApp>;
let key: string;
let calls: number;
let failNext: number;
const viaApp = ((url: string | URL | Request, init?: RequestInit) => {
  calls++;
  if (failNext > 0) { failNext--; return Promise.resolve(new Response('{"error":{"code":"internal","message":"boom"}}', { status: 503 })); }
  const u = new URL(String(url));
  return Promise.resolve(app.request(u.pathname + u.search, init));
}) as typeof fetch;
const kit = (extra = {}) => new AuditKit({ apiKey: key, baseUrl: "http://x", fetch: viaApp, retryDelayMs: 1, ...extra });

beforeAll(() => {
  cfg = { dataDir: mkdtempSync(join(tmpdir(), "auditkit-sdk-")) };
  const reg = openRegistry(cfg);
  const projectId = createProject(reg, "t").id;
  key = createKey(reg, projectId, "test", ["admin"]).key;
  app = buildApp({ cfg, reg, signer: loadSigner(cfg.dataDir), anchorPolicy: { kinds: [], interval_seconds: 60 } });
});
afterAll(() => { closeAll(); rmSync(cfg.dataDir, { recursive: true, force: true }); });

describe("sdk", () => {
  it("covers every method", async () => {
    const seen: Receipt[] = [];
    const a = kit({ keepReceipts: (r: Receipt) => seen.push(r) });
    const r1 = await a.log({ tenant: "acme", actor: "u1", action: "invoice.delete", target: "inv_1", payload: { n: 1 } });
    expect(r1).toMatchObject({ tenant: "acme", position: 0 });
    const bulk = await a.logBulk([1, 2, 3].map((i) => ({ tenant: "acme", actor: "bot", action: "job", target: `j${i}` })));
    expect(bulk.map((r) => r.position)).toEqual([1, 2, 3]);
    expect(seen).toHaveLength(4);

    const page = await a.search({ tenant: "acme", limit: 2 });
    expect(page.events).toHaveLength(2);
    expect(page.next_cursor).toBeTruthy();
    const page2 = await a.search({ tenant: "acme", limit: 2, cursor: page.next_cursor! });
    expect(page2.events.length).toBeGreaterThan(0);

    expect((await a.get(r1.id)).payload).toEqual({ n: 1 });
    expect(await a.proof(r1.id)).toBeTypeOf("object");
    expect(await a.verify({ tenant: "acme" })).toMatchObject({ valid: true, count: 4 });
    expect((await a.tenants()).map((t) => t.external_id)).toContain("acme");

    const lines = [];
    for await (const l of a.export({ tenant: "acme" })) lines.push(l);
    expect(lines[0]!.type).toBe("manifest");
    expect(lines.filter((l) => l.type === "event")).toHaveLength(4);

    expect(await a.erase(r1.id)).toEqual({ erased: true });
    expect((await a.get(r1.id)).erased).toBe(true);
  });

  it("throws AuditKitError from the envelope", async () => {
    const err = await kit().get("ev_nope").catch((e) => e);
    expect(err).toBeInstanceOf(AuditKitError);
    expect(err).toMatchObject({ status: 404, code: "not_found" });
    const bad = await new AuditKit({ apiKey: "ak_test_bad", baseUrl: "http://x", fetch: viaApp }).tenants().catch((e) => e);
    expect(bad).toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("retries 5xx and network errors; log retries are safe", async () => {
    calls = 0; failNext = 2;
    const r = await kit().log({ tenant: "retry", actor: "u", action: "x" });
    expect(calls).toBe(3);
    expect(r.position).toBe(0);
    calls = 0; failNext = 3;
    await expect(kit().tenants()).rejects.toMatchObject({ status: 503, code: "internal" });
    expect(calls).toBe(3);
    let n = 0;
    const flaky = ((u: never, i: never) => (n++ < 1 ? Promise.reject(new TypeError("net")) : viaApp(u, i))) as typeof fetch;
    expect((await kit({ fetch: flaky }).tenants()).length).toBeGreaterThan(0);
    // lost response after server commit: the retry replays the same idempotency key
    let first = true;
    const lost = (async (u: never, i: never) => { const res = await viaApp(u, i); if (first) { first = false; throw new TypeError("reset"); } return res; }) as typeof fetch;
    const a = await kit({ fetch: lost }).log({ tenant: "retry", actor: "u", action: "y" });
    expect(a.duplicate).toBe(true);
    expect((await kit().verify({ tenant: "retry" })).count).toBe(2);
  });

  it("client-signed event round-trips and clientSignable matches what was signed", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const a = kit({ clientKey: privateKey });
    const r = await a.log({ tenant: "signed", actor: "u", action: "role.grant", target: "u2", payload: { role: "admin" } });
    const ev = await a.get(r.id);
    const lines = [];
    for await (const l of a.export({ tenant: "signed" })) lines.push(l);
    const line = lines.find((l) => l.type === "event")!;
    const sig = (line as { client_sig?: string }).client_sig as string;
    expect(sig).toBeTypeOf("string");
    const input = { tenant: "signed", actor: "u", action: "role.grant", target: "u2", occurredAt: ev.occurred_at };
    expect(verifyClientSig(publicKey, input, sig)).toBe(true);
    expect(verifyClientSig(publicKey, { ...input, actor: "evil" }, sig)).toBe(false);
    expect(clientSignable(input)).toMatch(/^[0-9a-f]{64}$/);
    expect(clientSignable({ ...input, target: undefined })).toBe(clientSignable({ ...input, target: null }));
  });
});
