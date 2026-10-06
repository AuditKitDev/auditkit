// End-to-end OAuth as an MCP client does it: discovery → dynamic registration → authorize (user signs in,
// picks a project) → PKCE code exchange → tools/call with the access token → refresh rotation → replay detection.
// Uses the official MCP client SDK against the in-process app via a fetch shim.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { openRegistry, closeAll, type Config } from "./db.js";
import { loadSigner } from "./signing.js";
import { buildApp } from "./app.js";
import { migrateAuth, type Mailer } from "./auth.js";
import { migrateBilling } from "./billing.js";
import { migrateOAuth } from "./oauth.js";

const SITE = "http://site.test";
let cfg: Config;
let app: ReturnType<typeof buildApp>;
let reg: ReturnType<typeof openRegistry>;
let cookie = "";
const sent: string[] = [];
const mailer: Mailer = { async send(_t, _s, text) { sent.push(text); } };

// Route absolute URLs for SITE into the in-process app.
const shimFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const headers = Object.fromEntries(new Headers(init?.headers ?? {}).entries());
  return app.request(url.replace(SITE, ""), { ...init, headers });
}) as unknown as typeof fetch;

beforeAll(async () => {
  cfg = { dataDir: mkdtempSync(join(tmpdir(), "auditkit-oauth-")) };
  reg = openRegistry(cfg); migrateAuth(reg); migrateBilling(reg); migrateOAuth(reg);
  reg.prepare("INSERT INTO project (id, name, plan, created_at) VALUES ('demo', 'demo', 'free', '2026-01-01T00:00:00Z')").run();
  app = buildApp({ cfg, reg, signer: loadSigner(cfg.dataDir), anchorPolicy: { kinds: [], interval_seconds: 1 }, web: { mailer, billing: { prices: {}, siteUrl: SITE }, siteUrl: SITE, secureCookies: false, demoProjectId: "demo" } });
  // sign the user in once
  await app.request("/auth/magic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "owner@example.com" }) });
  const token = /token=([A-Za-z0-9_-]+)/.exec(sent[0]!)![1]!;
  const cb = await app.request("/auth/callback", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `token=${token}`, redirect: "manual" });
  cookie = cb.headers.get("set-cookie")!.split(";")[0]!;
});
afterAll(() => { closeAll(); rmSync(cfg.dataDir, { recursive: true, force: true }); });

async function runAuthorizationCode(scope = "read write") {
  const meta = await (await app.request("/.well-known/oauth-authorization-server")).json();
  expect(meta.code_challenge_methods_supported).toEqual(["S256"]);
  const prm = await (await app.request("/.well-known/oauth-protected-resource")).json();
  expect(prm.authorization_servers).toEqual([SITE]);

  const redirect_uri = "https://claude.ai/api/mcp/auth_callback";
  const reg1 = await app.request("/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Claude", redirect_uris: [redirect_uri] }) });
  expect(reg1.status).toBe(201);
  const client = await reg1.json();

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri, state: "xyz", scope, code_challenge: challenge, code_challenge_method: "S256" });

  // not signed in → login redirect with next
  const anon = await app.request(`/oauth/authorize?${params}`, { redirect: "manual" });
  expect(anon.status).toBe(302);
  expect(anon.headers.get("location")).toContain("/login?next=%2Foauth%2Fauthorize");

  // signed in → consent page lists the project
  const consent = await app.request(`/oauth/authorize?${params}`, { headers: { cookie } });
  expect(consent.status).toBe(200);
  const html = await consent.text();
  const projectId = /name="project_id" value="(p_[a-z0-9]+)"/.exec(html)![1]!;
  expect(html).toContain("example.com");

  const form = new URLSearchParams({ ...Object.fromEntries(params), scopes: scope.replace(" ", ","), project_id: projectId, decision: "allow" });
  const dec = await app.request("/oauth/authorize", { method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" }, body: form.toString(), redirect: "manual" });
  expect(dec.status).toBe(302);
  const loc = new URL(dec.headers.get("location")!);
  expect(loc.origin + loc.pathname).toBe(redirect_uri);
  expect(loc.searchParams.get("state")).toBe("xyz");
  const code = loc.searchParams.get("code")!;
  return { client, code, verifier, redirect_uri, projectId };
}

describe("oauth", () => {
  it("authorization code + PKCE issues tokens that work on /mcp and /v1", async () => {
    const { client, code, verifier, redirect_uri } = await runAuthorizationCode();
    const bad = await app.request("/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri, client_id: client.client_id, code_verifier: "wrong" }).toString() });
    expect(bad.status).toBe(400);
    const tok = await app.request("/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri, client_id: client.client_id, code_verifier: verifier }).toString() });
    expect(tok.status).toBe(200);
    const t = await tok.json();
    expect(t).toMatchObject({ token_type: "Bearer", scope: "read write" });
    expect(t.access_token.startsWith("oat_")).toBe(true);

    // official MCP client over the shim, bearer from OAuth
    const transport = new StreamableHTTPClientTransport(new URL(`${SITE}/mcp`), { fetch: shimFetch, requestInit: { headers: { authorization: `Bearer ${t.access_token}` } } });
    const mcp = new Client({ name: "test", version: "0" });
    await mcp.connect(transport as unknown as Parameters<typeof mcp.connect>[0]);
    const tools = await mcp.listTools();
    expect(tools.tools.map((x) => x.name)).toContain("verify_range");
    const logged = await mcp.callTool({ name: "log_event", arguments: { tenant: "acme", actor: "claude", action: "note.add" } });
    expect(JSON.parse((logged.content as Array<{ text: string }>)[0]!.text)).toHaveProperty("server_sig");
    await mcp.close();

    // same token on REST, with scope enforced (no erase)
    expect((await app.request("/v1/events?tenant=acme", { headers: { authorization: `Bearer ${t.access_token}` } })).status).toBe(200);
    expect((await app.request("/v1/erase/x", { method: "POST", headers: { authorization: `Bearer ${t.access_token}` } })).status).toBe(403);

    // code replay is refused AND revokes the tokens it issued (RFC 6749 §4.1.2)
    const again = await app.request("/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri, client_id: client.client_id, code_verifier: verifier }).toString() });
    expect(again.status).toBe(400);
    expect((await app.request("/v1/events?tenant=acme", { headers: { authorization: `Bearer ${t.access_token}` } })).status).toBe(401);
  });

  it("unauthenticated /mcp advertises the authorization server", async () => {
    const r = await app.request("/mcp", { method: "POST", body: "{}" });
    expect(r.status).toBe(401);
    expect(r.headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource");
  });

  it("refresh rotates; reuse of an old refresh token revokes the family", async () => {
    const { client, code, verifier, redirect_uri } = await runAuthorizationCode("read");
    const t1 = await (await app.request("/oauth/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri, client_id: client.client_id, code_verifier: verifier }) })).json();
    const t2 = await (await app.request("/oauth/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: t1.refresh_token, client_id: client.client_id }) })).json();
    expect(t2.access_token).not.toBe(t1.access_token);
    expect((await app.request("/v1/tenants", { headers: { authorization: `Bearer ${t1.access_token}` } })).status).toBe(401); // old access revoked
    expect((await app.request("/v1/tenants", { headers: { authorization: `Bearer ${t2.access_token}` } })).status).toBe(200);
    const reuse = await app.request("/oauth/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: t1.refresh_token, client_id: client.client_id }) });
    expect(reuse.status).toBe(400);
    expect((await app.request("/v1/tenants", { headers: { authorization: `Bearer ${t2.access_token}` } })).status).toBe(401); // family burned
  });

  it("denies bad redirect URIs at registration and unknown redirect at authorize", async () => {
    expect((await app.request("/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redirect_uris: ["http://evil.example/cb"] }) })).status).toBe(400);
    const c = await (await app.request("/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redirect_uris: ["https://ok.example/cb"] }) })).json();
    const r = await app.request(`/oauth/authorize?response_type=code&client_id=${c.client_id}&redirect_uri=https://other.example/cb&code_challenge=${"a".repeat(43)}&code_challenge_method=S256`, { headers: { cookie } });
    expect(r.status).toBe(400);
  });
});
