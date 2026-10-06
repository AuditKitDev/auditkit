import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { sha256Hex } from "@auditkit/core";
import { now } from "./db.js";

export type Scope = "read" | "write" | "erase" | "admin";
export type KeyMode = "live" | "test";

export interface Principal {
  projectId: string;
  keyId: string;
  mode: KeyMode;
  scopes: Set<Scope>;
}

export function createProject(reg: DatabaseSync, name: string, plan = "free"): { id: string } {
  const id = "p_" + randomBytes(8).toString("hex");
  reg.prepare("INSERT INTO project (id, name, plan, created_at) VALUES (?, ?, ?, ?)").run(id, name, plan, now());
  return { id };
}

/** Returns the plaintext key once. Only its sha256 is stored. */
export function createKey(reg: DatabaseSync, projectId: string, mode: KeyMode, scopes: Scope[]): { id: string; key: string } {
  const secret = randomBytes(24).toString("base64url");
  const key = `ak_${mode}_${secret}`;
  const id = "k_" + randomBytes(6).toString("hex");
  reg
    .prepare("INSERT INTO api_key (id, project_id, key_hash, prefix, mode, scopes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, projectId, sha256Hex(key), key.slice(0, 12), mode, scopes.join(","), now());
  return { id, key };
}

export function authenticate(reg: DatabaseSync, bearer: string | undefined): Principal | null {
  if (!bearer) return null;
  const m = /^ak_(live|test)_[A-Za-z0-9_-]{20,}$/.exec(bearer);
  if (!m) return null;
  const row = reg
    .prepare("SELECT id, project_id, mode, scopes FROM api_key WHERE key_hash = ? AND revoked_at IS NULL")
    .get(sha256Hex(bearer)) as { id: string; project_id: string; mode: KeyMode; scopes: string } | undefined;
  if (!row) return null;
  return { projectId: row.project_id, keyId: row.id, mode: row.mode, scopes: new Set(row.scopes.split(",") as Scope[]) };
}

export function revokeKey(reg: DatabaseSync, projectId: string, keyId: string): boolean {
  const r = reg.prepare("UPDATE api_key SET revoked_at = ? WHERE id = ? AND project_id = ? AND revoked_at IS NULL").run(now(), keyId, projectId);
  return r.changes === 1;
}
