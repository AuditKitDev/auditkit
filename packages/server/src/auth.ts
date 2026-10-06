// Passwordless auth: magic link by email, httpOnly session cookie. No passwords to reset or leak.
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sha256Hex } from "@auditkit/core";
import { now } from "./db.js";
import { createProject } from "./keys.js";

export const SESSION_COOKIE = "ak_session";
const TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export interface User { id: string; email: string; created_at: string }

export function migrateAuth(reg: DatabaseSync): void {
  reg.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_token (
      token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, next TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS session (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id), expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS membership (
      user_id TEXT NOT NULL REFERENCES user(id), project_id TEXT NOT NULL REFERENCES project(id),
      role TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (user_id, project_id)
    );
  `);
}

export interface Mailer {
  send(to: string, subject: string, text: string, html: string): Promise<void>;
}

/** Resend over plain fetch. With no API key, the link is logged so dev works offline. */
export function makeMailer(apiKey = process.env.RESEND_API_KEY, from = process.env.AUDITKIT_MAIL_FROM ?? "AuditKit <login@auditkit.dev>"): Mailer {
  if (!apiKey) {
    return { async send(to, subject, text) { console.log(`[mail:stub] to=${to} subject="${subject}"\n${text}`); } };
  }
  return {
    async send(to, subject, text, html) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
      });
      if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
    },
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same-origin path only (no scheme, no protocol-relative). Query strings may carry encoded OAuth params.
const SAFE_NEXT = /^\/(?!\/|\\)[A-Za-z0-9_\-./?=&%:+,~]*$/;

export async function requestMagicLink(reg: DatabaseSync, mailer: Mailer, baseUrl: string, email: string, next = "/app"): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL.test(normalized) || normalized.length > 254) return; // silently: no enumeration
  const dest = SAFE_NEXT.test(next) ? next : "/app";
  const token = randomBytes(32).toString("base64url");
  reg.prepare("INSERT INTO login_token (token_hash, email, next, expires_at) VALUES (?, ?, ?, ?)")
    .run(sha256Hex(token), normalized, dest, new Date(Date.now() + TOKEN_TTL_MS).toISOString());
  const link = `${baseUrl}/auth/callback?token=${token}`;
  await mailer.send(
    normalized,
    "Your AuditKit sign-in link",
    `Sign in to AuditKit:\n\n${link}\n\nThis link works once and expires in 15 minutes. If you did not request it, ignore this email.`,
    `<p>Sign in to AuditKit:</p><p><a href="${link}">${link}</a></p><p>This link works once and expires in 15 minutes. If you did not request it, ignore this email.</p>`,
  );
}

/** Project every new account can read, e.g. the seeded sample for directory reviewers. Set AUDITKIT_SANDBOX_PROJECT. */
/**
 * Which header carries the client IP. "x-real-ip": our nginx overwrites it with $remote_addr (production).
 * "x-forwarded-for": last hop only (an appending proxy). "none": ignore headers; everyone is one bucket,
 * which is the safe default when no proxy is in front (the container only listens on loopback).
 */
export type ProxyTrust = "x-real-ip" | "x-forwarded-for" | "none";
export function clientIp(c: { req: { header(n: string): string | undefined } }, trust: ProxyTrust = "none"): string {
  if (trust === "x-real-ip") return c.req.header("x-real-ip") || "local";
  if (trust === "x-forwarded-for") { const parts = (c.req.header("x-forwarded-for") ?? "").split(","); return parts[parts.length - 1]!.trim() || "local"; }
  return "local";
}

let sandboxProjectId: string | undefined = process.env.AUDITKIT_SANDBOX_PROJECT;
export function setSandboxProject(id: string | undefined): void { sandboxProjectId = id; }

/** Consumes the token; creates the user (and a first project) on first login. Returns the session token to set. */
export function redeemMagicLink(reg: DatabaseSync, token: string): { session: string; next: string; created: boolean } | null {
  const row = reg.prepare("SELECT email, next, expires_at, used_at FROM login_token WHERE token_hash = ?").get(sha256Hex(token)) as
    | { email: string; next: string; expires_at: string; used_at: string | null } | undefined;
  if (!row || row.used_at || row.expires_at < now()) return null;
  reg.prepare("UPDATE login_token SET used_at = ? WHERE token_hash = ?").run(now(), sha256Hex(token));
  let user = reg.prepare("SELECT id, email, created_at FROM user WHERE email = ?").get(row.email) as User | undefined;
  const created = !user;
  if (!user) {
    user = { id: "u_" + randomBytes(8).toString("hex"), email: row.email, created_at: now() };
    reg.prepare("INSERT INTO user (id, email, created_at) VALUES (?, ?, ?)").run(user.id, user.email, user.created_at);
    const { id } = createProject(reg, row.email.split("@")[1] ?? "my-project");
    reg.prepare("INSERT INTO membership (user_id, project_id, role, created_at) VALUES (?, ?, 'owner', ?)").run(user.id, id, now());
    if (sandboxProjectId && reg.prepare("SELECT 1 FROM project WHERE id = ?").get(sandboxProjectId)) {
      reg.prepare("INSERT OR IGNORE INTO membership (user_id, project_id, role, created_at) VALUES (?, ?, 'viewer', ?)").run(user.id, sandboxProjectId, now());
    }
  }
  const session = randomBytes(32).toString("base64url");
  reg.prepare("INSERT INTO session (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(sha256Hex(session), user.id, new Date(Date.now() + SESSION_TTL_MS).toISOString(), now());
  return { session, next: row.next, created };
}

export function userFromSession(reg: DatabaseSync, session: string | undefined): User | null {
  if (!session) return null;
  const row = reg.prepare(
    "SELECT u.id, u.email, u.created_at FROM session s JOIN user u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
  ).get(sha256Hex(session), now()) as User | undefined;
  return row ?? null;
}

export function destroySession(reg: DatabaseSync, session: string | undefined): void {
  if (session) reg.prepare("DELETE FROM session WHERE token_hash = ?").run(sha256Hex(session));
}

export function setSessionCookie(c: Context, session: string, secure: boolean): void {
  setCookie(c, SESSION_COOKIE, session, { httpOnly: true, sameSite: "Lax", secure, path: "/", maxAge: SESSION_TTL_MS / 1000 });
}
export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function membership(reg: DatabaseSync, userId: string, projectId: string): string | null {
  const r = reg.prepare("SELECT role FROM membership WHERE user_id = ? AND project_id = ?").get(userId, projectId) as { role: string } | undefined;
  return r?.role ?? null;
}

export function userProjects(reg: DatabaseSync, userId: string): Array<{ id: string; name: string; plan: string; role: string; created_at: string }> {
  return reg.prepare(
    "SELECT p.id, p.name, p.plan, m.role, p.created_at FROM membership m JOIN project p ON p.id = m.project_id WHERE m.user_id = ? ORDER BY p.created_at",
  ).all(userId) as Array<{ id: string; name: string; plan: string; role: string; created_at: string }>;
}

/** Simple fixed-window limiter, per key, in memory. Enough for login and demo endpoints on one box. */
export function rateLimiter(max: number, windowMs: number, maxKeys = 50_000) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string): boolean => {
    const t = Date.now();
    if (hits.size > maxKeys) for (const [k, v] of hits) if (v.reset < t) hits.delete(k);
    if (hits.size > maxKeys) hits.clear();
    const h = hits.get(key);
    if (!h || h.reset < t) { hits.set(key, { n: 1, reset: t + windowMs }); return true; }
    if (h.n >= max) return false;
    h.n += 1;
    return true;
  };
}
