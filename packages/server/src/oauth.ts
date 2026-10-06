// OAuth 2.1 authorization server for the MCP endpoint (and any OAuth client): authorization code + PKCE,
// dynamic client registration (RFC 7591), refresh-token rotation, opaque tokens. Required because the
// Claude Connectors Directory connects via OAuth, not pasted API keys. Users sign in with the normal
// magic link, then pick which project the client may access and with which scopes.
import { createHash, randomBytes } from "node:crypto";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { sha256Hex } from "@auditkit/core";
import { now } from "./db.js";
import { userFromSession, readSessionCookie, membership, userProjects } from "./auth.js";
import type { Principal, Scope } from "./keys.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;
const SCOPES: Scope[] = ["read", "write"];

export function migrateOAuth(reg: DatabaseSync): void {
  reg.exec(`
    CREATE TABLE IF NOT EXISTS oauth_client (
      client_id TEXT PRIMARY KEY, client_secret_hash TEXT, name TEXT NOT NULL, redirect_uris TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_code (
      code_hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id TEXT NOT NULL, project_id TEXT NOT NULL, scopes TEXT NOT NULL,
      code_challenge TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS oauth_token (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, client_id TEXT NOT NULL, user_id TEXT NOT NULL,
      project_id TEXT NOT NULL, scopes TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT, family TEXT NOT NULL
    );
  `);
}

const validRedirect = (u: string) => {
  try {
    const url = new URL(u);
    return (url.protocol === "https:" && !!url.hostname) || ((url.protocol === "http:") && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
  } catch { return false; }
};

/** Bearer `oat_...` → Principal, or null. Used by /v1 and /mcp next to API keys. */
export function principalFromAccessToken(reg: DatabaseSync, token: string | undefined): Principal | null {
  if (!token || !token.startsWith("oat_")) return null;
  const row = reg.prepare("SELECT id, project_id, scopes FROM oauth_token WHERE token_hash = ? AND kind = 'access' AND revoked_at IS NULL AND expires_at > ?")
    .get(sha256Hex(token), now()) as { id: string; project_id: string; scopes: string } | undefined;
  return row ? { projectId: row.project_id, keyId: row.id, mode: "live", scopes: new Set(row.scopes.split(",") as Scope[]) } : null;
}

function issueTokens(reg: DatabaseSync, clientId: string, userId: string, projectId: string, scopes: string, family = randomBytes(8).toString("hex")) {
  const access = "oat_" + randomBytes(32).toString("base64url");
  const refresh = "ort_" + randomBytes(32).toString("base64url");
  const ins = reg.prepare("INSERT INTO oauth_token (id, token_hash, kind, client_id, user_id, project_id, scopes, expires_at, created_at, revoked_at, family) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)");
  ins.run("ot_" + randomBytes(6).toString("hex"), sha256Hex(access), "access", clientId, userId, projectId, scopes, new Date(Date.now() + ACCESS_TTL_MS).toISOString(), now(), family);
  ins.run("ot_" + randomBytes(6).toString("hex"), sha256Hex(refresh), "refresh", clientId, userId, projectId, scopes, new Date(Date.now() + REFRESH_TTL_MS).toISOString(), now(), family);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_MS / 1000, refresh_token: refresh, scope: scopes.split(",").join(" ") };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

export function buildOAuthRoutes(reg: DatabaseSync, siteUrl: string): Hono {
  const app = new Hono();
  const oauthErr = (c: Context, status: 400 | 401, error: string, description: string) => c.json({ error, error_description: description }, status);

  app.get("/.well-known/oauth-authorization-server", (c) =>
    c.json({
      issuer: siteUrl,
      authorization_endpoint: `${siteUrl}/oauth/authorize`,
      token_endpoint: `${siteUrl}/oauth/token`,
      registration_endpoint: `${siteUrl}/oauth/register`,
      revocation_endpoint: `${siteUrl}/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      scopes_supported: SCOPES,
    }),
  );
  // RFC 9728: clients may probe the root form or the path-suffixed form for resource https://host/mcp.
  const prm = (c: Context) => c.json({ resource: `${siteUrl}/mcp`, authorization_servers: [siteUrl], scopes_supported: SCOPES, bearer_methods_supported: ["header"] });
  app.get("/.well-known/oauth-protected-resource", prm);
  app.get("/.well-known/oauth-protected-resource/mcp", prm);

  app.post("/oauth/register", async (c) => {
    const body = z.object({
      client_name: z.string().min(1).max(100).optional(),
      redirect_uris: z.array(z.string().url()).min(1).max(10),
      token_endpoint_auth_method: z.enum(["none", "client_secret_post"]).optional(),
    }).parse(await c.req.json());
    if (!body.redirect_uris.every(validRedirect)) return oauthErr(c, 400, "invalid_redirect_uri", "redirect_uris must be https, or http://localhost");
    const client_id = "oc_" + randomBytes(12).toString("hex");
    const confidential = body.token_endpoint_auth_method === "client_secret_post";
    const secret = confidential ? "ocs_" + randomBytes(24).toString("base64url") : null;
    reg.prepare("INSERT INTO oauth_client (client_id, client_secret_hash, name, redirect_uris, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(client_id, secret ? sha256Hex(secret) : null, body.client_name ?? "OAuth client", JSON.stringify(body.redirect_uris), now());
    return c.json({ client_id, ...(secret ? { client_secret: secret } : {}), client_name: body.client_name ?? "OAuth client", redirect_uris: body.redirect_uris, token_endpoint_auth_method: confidential ? "client_secret_post" : "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }, 201);
  });

  const authorizeQuery = z.object({
    response_type: z.literal("code"), client_id: z.string(), redirect_uri: z.string(), state: z.string().max(500).optional(),
    scope: z.string().optional(), code_challenge: z.string().min(43).max(128), code_challenge_method: z.literal("S256"), resource: z.string().optional(),
  });

  app.get("/oauth/authorize", (c) => {
    const parsed = authorizeQuery.safeParse(c.req.query());
    if (!parsed.success) return c.text("invalid authorization request: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "), 400);
    const q = parsed.data;
    const client = reg.prepare("SELECT name, redirect_uris FROM oauth_client WHERE client_id = ?").get(q.client_id) as { name: string; redirect_uris: string } | undefined;
    if (!client || !(JSON.parse(client.redirect_uris) as string[]).includes(q.redirect_uri)) return c.text("unknown client or redirect_uri", 400);
    const user = userFromSession(reg, readSessionCookie(c));
    if (!user) return c.redirect(`/login?next=${encodeURIComponent(c.req.path + "?" + new URL(c.req.url).searchParams.toString())}`, 302);
    const scopes = (q.scope?.split(/[ ,]+/).filter(Boolean) ?? ["read"]).filter((s): s is Scope => (SCOPES as string[]).includes(s));
    if (scopes.length === 0) return c.text("no valid scopes requested", 400);
    const projects = userProjects(reg, user.id);
    const hidden = Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(String(v))}">`).join("");
    const options = projects.map((p) => `<label class="opt"><input type="radio" name="project_id" value="${esc(p.id)}" ${projects.length === 1 ? "checked" : ""}> ${esc(p.name)} <small>${esc(p.plan)}</small></label>`).join("");
    return c.html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize ${esc(client.name)} · AuditKit</title>
<style>body{margin:0;background:#0b0d10;color:#e6e8eb;font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{max-width:420px;padding:32px;border:1px solid #23272e;border-radius:12px;background:#111418}h1{font-size:20px;margin:0 0 8px}p{color:#9aa3ad;margin:0 0 16px}.opt{display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid #23272e;border-radius:8px;margin:6px 0}.opt small{margin-left:auto;color:#9aa3ad}code{background:#1a1f26;padding:2px 6px;border-radius:4px}button{width:100%;padding:12px;border-radius:8px;border:0;background:#4f8cff;color:#fff;font-weight:600;cursor:pointer;margin-top:12px}.deny{background:transparent;color:#9aa3ad;border:1px solid #23272e}</style></head>
<body><main><h1>Allow <strong>${esc(client.name)}</strong> to access your audit log?</h1><p>Signed in as ${esc(user.email)}. Scopes: ${scopes.map((s) => `<code>${s}</code>`).join(" ")}</p>
<form method="post" action="/oauth/authorize">${hidden}<input type="hidden" name="scopes" value="${esc(scopes.join(","))}"><p>Project</p>${options || "<p>You have no projects yet.</p>"}
<button name="decision" value="allow" type="submit">Allow</button><button class="deny" name="decision" value="deny" type="submit">Deny</button></form></main></body></html>`);
  });

  app.post("/oauth/authorize", async (c) => {
    const form = Object.fromEntries((await c.req.formData()).entries()) as Record<string, string>;
    const parsed = authorizeQuery.safeParse(form);
    if (!parsed.success) return c.text("invalid request", 400);
    const q = parsed.data;
    const user = userFromSession(reg, readSessionCookie(c));
    if (!user) return c.text("not signed in", 401);
    const client = reg.prepare("SELECT redirect_uris FROM oauth_client WHERE client_id = ?").get(q.client_id) as { redirect_uris: string } | undefined;
    if (!client || !(JSON.parse(client.redirect_uris) as string[]).includes(q.redirect_uri)) return c.text("unknown client", 400);
    const redirect = new URL(q.redirect_uri);
    if (q.state) redirect.searchParams.set("state", q.state);
    if (form.decision !== "allow") { redirect.searchParams.set("error", "access_denied"); return c.redirect(redirect.toString(), 302); }
    const projectId = form.project_id ?? "";
    const role = membership(reg, user.id, projectId);
    if (!role) return c.text("no access to that project", 403);
    const scopes = (form.scopes ?? "read").split(",").filter((s): s is Scope => (SCOPES as string[]).includes(s)).filter((s) => role !== "viewer" || s === "read");
    if (scopes.length === 0) return c.text("read-only membership cannot grant write scopes", 403);
    const code = "oac_" + randomBytes(32).toString("base64url");
    reg.prepare("INSERT INTO oauth_code (code_hash, client_id, user_id, project_id, scopes, code_challenge, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(sha256Hex(code), q.client_id, user.id, projectId, scopes.join(","), q.code_challenge, q.redirect_uri, new Date(Date.now() + CODE_TTL_MS).toISOString());
    redirect.searchParams.set("code", code);
    return c.redirect(redirect.toString(), 302);
  });

  app.post("/oauth/token", async (c) => {
    const ct = c.req.header("content-type") ?? "";
    const form = ct.includes("json") ? ((await c.req.json()) as Record<string, string>) : (Object.fromEntries((await c.req.formData()).entries()) as Record<string, string>);
    const client = reg.prepare("SELECT client_secret_hash FROM oauth_client WHERE client_id = ?").get(form.client_id ?? "") as { client_secret_hash: string | null } | undefined;
    if (!client) return oauthErr(c, 401, "invalid_client", "unknown client_id");
    if (client.client_secret_hash && sha256Hex(form.client_secret ?? "") !== client.client_secret_hash) return oauthErr(c, 401, "invalid_client", "bad client_secret");

    if (form.grant_type === "authorization_code") {
      const row = reg.prepare("SELECT * FROM oauth_code WHERE code_hash = ?").get(sha256Hex(form.code ?? "")) as
        | { client_id: string; user_id: string; project_id: string; scopes: string; code_challenge: string; redirect_uri: string; expires_at: string; used_at: string | null } | undefined;
      if (!row || row.client_id !== form.client_id || row.redirect_uri !== form.redirect_uri) return oauthErr(c, 400, "invalid_grant", "code does not match client or redirect_uri");
      if (row.used_at) { // replay: burn the whole family
        reg.prepare("UPDATE oauth_token SET revoked_at = ? WHERE user_id = ? AND client_id = ? AND project_id = ? AND revoked_at IS NULL").run(now(), row.user_id, row.client_id, row.project_id);
        return oauthErr(c, 400, "invalid_grant", "code already used");
      }
      if (row.expires_at < now()) return oauthErr(c, 400, "invalid_grant", "code expired");
      const challenge = createHash("sha256").update(form.code_verifier ?? "").digest("base64url");
      if (challenge !== row.code_challenge) return oauthErr(c, 400, "invalid_grant", "PKCE verification failed");
      reg.prepare("UPDATE oauth_code SET used_at = ? WHERE code_hash = ?").run(now(), sha256Hex(form.code!));
      return c.json(issueTokens(reg, row.client_id, row.user_id, row.project_id, row.scopes), 200, { "cache-control": "no-store" });
    }
    if (form.grant_type === "refresh_token") {
      const row = reg.prepare("SELECT * FROM oauth_token WHERE token_hash = ? AND kind = 'refresh'").get(sha256Hex(form.refresh_token ?? "")) as
        | { client_id: string; user_id: string; project_id: string; scopes: string; expires_at: string; revoked_at: string | null; family: string } | undefined;
      if (!row || row.client_id !== form.client_id) return oauthErr(c, 400, "invalid_grant", "unknown refresh token");
      if (row.revoked_at) { // reuse of a rotated token: revoke the family
        reg.prepare("UPDATE oauth_token SET revoked_at = ? WHERE family = ? AND revoked_at IS NULL").run(now(), row.family);
        return oauthErr(c, 400, "invalid_grant", "refresh token reused; session revoked");
      }
      if (row.expires_at < now()) return oauthErr(c, 400, "invalid_grant", "refresh token expired");
      reg.prepare("UPDATE oauth_token SET revoked_at = ? WHERE family = ? AND revoked_at IS NULL").run(now(), row.family);
      return c.json(issueTokens(reg, row.client_id, row.user_id, row.project_id, row.scopes, row.family), 200, { "cache-control": "no-store" });
    }
    return oauthErr(c, 400, "unsupported_grant_type", "use authorization_code or refresh_token");
  });

  app.post("/oauth/revoke", async (c) => {
    const form = Object.fromEntries((await c.req.formData()).entries()) as Record<string, string>;
    const row = reg.prepare("SELECT family FROM oauth_token WHERE token_hash = ?").get(sha256Hex(form.token ?? "")) as { family: string } | undefined;
    if (row) reg.prepare("UPDATE oauth_token SET revoked_at = ? WHERE family = ? AND revoked_at IS NULL").run(now(), row.family);
    return c.body(null, 200);
  });

  return app;
}

/** Header value for 401s on the MCP endpoint, so clients discover the authorization server (MCP spec). */
export function wwwAuthenticate(siteUrl: string): string {
  return `Bearer resource_metadata="${siteUrl}/.well-known/oauth-protected-resource"`;
}
