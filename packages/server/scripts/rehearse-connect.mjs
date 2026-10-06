// Rehearse what Claude.ai does when a user adds https://auditkit.dev/mcp as a connector, over real HTTP:
// 401 → resource metadata → AS metadata → dynamic registration → authorization URL → (user signs in via
// magic link, approves consent) → code → token → tools/list → tools/call. Exits non-zero on any failure.
// Usage: node scripts/rehearse-connect.mjs http://localhost:3001   (server started with AUDITKIT_ANCHORS=none)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3001";
const logPath = process.argv[3]; // server log file; the magic link is read from it (mail stub)
const must = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exit(1); } console.log("ok  ", msg); };

let redirectedTo = null;
const provider = {
  get redirectUrl() { return "https://claude.ai/api/mcp/auth_callback"; },
  get clientMetadata() { return { client_name: "Claude (rehearsal)", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" }; },
  _client: undefined, _tokens: undefined, _verifier: undefined,
  clientInformation() { return this._client; }, saveClientInformation(i) { this._client = i; },
  tokens() { return this._tokens; }, saveTokens(t) { this._tokens = t; },
  redirectToAuthorization(url) { redirectedTo = url; },
  saveCodeVerifier(v) { this._verifier = v; }, codeVerifier() { return this._verifier; },
};

const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider: provider });
const client = new Client({ name: "rehearsal", version: "0" });
try { await client.connect(transport); must(false, "connect should have required authorization"); }
catch (e) { must(e instanceof UnauthorizedError, `401 → discovery → registration → authorization redirect (${e?.constructor?.name})`); }
must(redirectedTo && redirectedTo.pathname === "/oauth/authorize", `authorization URL ${redirectedTo}`);
must(provider._client?.client_id?.startsWith("oc_"), `dynamic client registered ${provider._client?.client_id}`);

// --- the user's browser: not signed in → login → magic link → consent
const authz = new URL(redirectedTo); authz.protocol = new URL(base).protocol; authz.host = new URL(base).host;
let r = await fetch(authz, { redirect: "manual" });
must(r.status === 302 && r.headers.get("location").startsWith("/login?next="), "anonymous authorize redirects to /login with next");
const email = `rehearsal+${Date.now()}@example.com`;
r = await fetch(`${base}/auth/magic`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, next: authz.pathname + authz.search }) });
must(r.status === 202, "magic link requested");
await new Promise((res) => setTimeout(res, 300));
const log = readFileSync(logPath, "utf8");
const token = [...log.matchAll(/auth\/callback\?token=([A-Za-z0-9_-]+)/g)].pop()?.[1];
must(token, "magic link found in server log (mail stub)");
r = await fetch(`${base}/auth/callback`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `token=${token}`, redirect: "manual" });
must(r.status === 302 && r.headers.get("location").startsWith("/oauth/authorize?"), "callback sets session and returns to the consent page");
const cookie = r.headers.get("set-cookie").split(";")[0];
r = await fetch(authz, { headers: { cookie } });
const html = await r.text();
const projectId = /name="project_id" value="(p_[a-z0-9]+)"/.exec(html)?.[1];
must(r.status === 200 && projectId, `consent page lists the user's project ${projectId}`);
const form = new URLSearchParams(authz.searchParams); form.set("scopes", "read,write"); form.set("project_id", projectId); form.set("decision", "allow");
r = await fetch(`${base}/oauth/authorize`, { method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" }, body: form.toString(), redirect: "manual" });
const back = new URL(r.headers.get("location"));
must(r.status === 302 && back.origin === "https://claude.ai" && back.searchParams.get("code"), "consent redirects to claude.ai with code and state");

// --- back in the client: finish auth, then use the tools
await transport.finishAuth(back.searchParams.get("code"));
must(provider._tokens?.access_token?.startsWith("oat_"), "PKCE code exchange returned an access token");
const t2 = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider: provider });
const c2 = new Client({ name: "rehearsal", version: "0" });
await c2.connect(t2);
const { tools } = await c2.listTools();
must(tools.length === 7 && tools.every((t) => t.title && t.annotations), `7 tools with title + annotations: ${tools.map((t) => t.name).join(", ")}`);
const logged = await c2.callTool({ name: "log_event", arguments: { tenant: "acme", actor: "claude", action: "rehearsal.ran", payload: { ok: true } } });
must(JSON.parse(logged.content[0].text).server_sig, "log_event returned a signed receipt");
const v = await c2.callTool({ name: "verify_range", arguments: { tenant: "acme" } });
must(JSON.parse(v.content[0].text).valid === true, "verify_range VALID");
await c2.close();
console.log("\nREHEARSAL PASSED: the connector flow works end to end as Claude.ai drives it.");
