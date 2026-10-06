// Customer-held signing keys. When a tenant has a registered Ed25519 public key, the server
// verifies client_sig on ingest; with require_client_sig set, unsigned events are refused.
// This is what makes "neither party can forge the other's entries" enforceable, not just checkable.
import { createPublicKey, verify as edVerify } from "node:crypto";
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { clientSignable } from "@auditkit/core";
import { now, registerProjectMigration } from "./db.js";
import { getOrCreateTenant, ValidationError, type EventInput } from "./events.js";

export function migrateTenantKeys(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_key (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenant(id), public_key TEXT NOT NULL,
      created_at TEXT NOT NULL, revoked_at TEXT
    );
  `);
  const cols = db.prepare("PRAGMA table_info(tenant)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "require_client_sig")) db.exec("ALTER TABLE tenant ADD COLUMN require_client_sig INTEGER NOT NULL DEFAULT 0");
}

function parseSpki(b64: string) {
  try {
    const key = createPublicKey({ key: Buffer.from(b64, "base64"), format: "der", type: "spki" });
    if (key.asymmetricKeyType !== "ed25519") throw new Error();
    return key;
  } catch {
    throw new ValidationError("public_key must be a base64 DER SPKI Ed25519 key");
  }
}

export function addTenantKey(db: DatabaseSync, tenantExt: string, publicKeyB64: string): { id: string } {
  parseSpki(publicKeyB64);
  const t = getOrCreateTenant(db, tenantExt);
  const id = "tk_" + randomBytes(6).toString("hex");
  db.prepare("INSERT INTO tenant_key (id, tenant_id, public_key, created_at) VALUES (?, ?, ?, ?)").run(id, t.id, publicKeyB64, now());
  return { id };
}

export function listTenantKeys(db: DatabaseSync, tenantExt: string) {
  return db.prepare(
    "SELECT k.id, k.public_key, k.created_at, k.revoked_at FROM tenant_key k JOIN tenant t ON t.id = k.tenant_id WHERE t.external_id = ? ORDER BY k.created_at",
  ).all(tenantExt) as Array<{ id: string; public_key: string; created_at: string; revoked_at: string | null }>;
}

export function revokeTenantKey(db: DatabaseSync, id: string): boolean {
  return db.prepare("UPDATE tenant_key SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(now(), id).changes === 1;
}

export function setRequireClientSig(db: DatabaseSync, tenantExt: string, required: boolean): void {
  const t = getOrCreateTenant(db, tenantExt);
  db.prepare("UPDATE tenant SET require_client_sig = ? WHERE id = ?").run(required ? 1 : 0, t.id);
}

/** Throws ValidationError if a signed event does not verify, or if the tenant requires signatures and none is given. */
export function checkClientSigs(db: DatabaseSync, inputs: EventInput[]): void {
  const cache = new Map<string, { keys: ReturnType<typeof parseSpki>[]; required: boolean }>();
  for (const e of inputs) {
    let info = cache.get(e.tenant);
    if (!info) {
      const t = db.prepare("SELECT id, require_client_sig FROM tenant WHERE external_id = ?").get(e.tenant) as { id: string; require_client_sig: number } | undefined;
      const keys = t
        ? (db.prepare("SELECT public_key FROM tenant_key WHERE tenant_id = ? AND revoked_at IS NULL").all(t.id) as Array<{ public_key: string }>).map((k) => parseSpki(k.public_key))
        : [];
      info = { keys, required: !!t?.require_client_sig };
      cache.set(e.tenant, info);
    }
    if (!e.client_sig) {
      if (info.required) throw new ValidationError(`tenant ${e.tenant} requires client_sig`);
      continue;
    }
    if (info.keys.length === 0) throw new ValidationError(`tenant ${e.tenant} has no registered client key; register one before sending client_sig`);
    if (!e.occurred_at) throw new ValidationError("client_sig requires occurred_at (it is part of the signed message)");
    const msg = Buffer.from(clientSignable({ tenant: e.tenant, actor: e.actor, action: e.action, target: e.target ?? null, occurred_at: e.occurred_at }), "hex");
    const sig = Buffer.from(e.client_sig, "base64");
    if (!info.keys.some((k) => edVerify(null, msg, k, sig))) throw new ValidationError(`client_sig does not verify for tenant ${e.tenant}`);
  }
}

registerProjectMigration(migrateTenantKeys);
