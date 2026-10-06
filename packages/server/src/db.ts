// SQLite via node:sqlite. One registry file (projects, keys) and one file per
// project (its tenants, events, payloads, roots, anchors). A project's data is a
// file: back it up by copying it, delete the project by deleting it.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  dataDir: string;
  /** Hostname written into export manifests, e.g. api.auditkit.dev. */
  publicHost?: string;
}

function open(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  return db;
}

export function openRegistry(cfg: Config): DatabaseSync {
  mkdirSync(join(cfg.dataDir, "projects"), { recursive: true });
  const db = open(join(cfg.dataDir, "registry.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_key (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
      key_hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL, mode TEXT NOT NULL,
      scopes TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS global_root (
      id TEXT PRIMARY KEY, root_hash TEXT NOT NULL, created_at TEXT NOT NULL,
      project_roots TEXT NOT NULL  -- JSON [{project_id, root_hash}] in leaf order
    );
    CREATE TABLE IF NOT EXISTS project_root_index (
      global_root_id TEXT NOT NULL REFERENCES global_root(id), project_id TEXT NOT NULL, PRIMARY KEY (global_root_id, project_id)
    );
    CREATE TABLE IF NOT EXISTS anchor (
      global_root_id TEXT NOT NULL REFERENCES global_root(id), kind TEXT NOT NULL,
      ref TEXT NOT NULL, proof TEXT NOT NULL, status TEXT NOT NULL, anchored_at TEXT NOT NULL,
      PRIMARY KEY (global_root_id, kind)
    );
  `);
  return db;
}

const projectDbs = new Map<string, DatabaseSync>();
/** Later tables/columns, applied after the base schema. Registered by modules to keep db.ts free of their SQL. */
const extras: Array<(db: DatabaseSync) => void> = [];
export function registerProjectMigration(fn: (db: DatabaseSync) => void): void { extras.push(fn); }
function migrateProjectExtras(db: DatabaseSync): void { for (const fn of extras) fn(db); }

export function openProject(cfg: Config, projectId: string): DatabaseSync {
  const cached = projectDbs.get(projectId);
  if (cached) return cached;
  if (!/^[a-z0-9_]+$/.test(projectId)) throw new Error("bad project id");
  const db = open(join(cfg.dataDir, "projects", `${projectId}.db`));
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenant (
      id TEXT PRIMARY KEY, external_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
      head_hash TEXT NOT NULL, head_position INTEGER NOT NULL DEFAULT -1
    );
    CREATE TABLE IF NOT EXISTS event (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenant(id),
      position INTEGER NOT NULL, occurred_at TEXT NOT NULL, received_at TEXT NOT NULL,
      actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT,
      payload_commit TEXT NOT NULL, prev_hash TEXT NOT NULL, event_hash TEXT NOT NULL,
      server_sig TEXT NOT NULL, client_sig TEXT, idempotency_key TEXT,
      root_id TEXT,
      UNIQUE (tenant_id, position), UNIQUE (tenant_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS event_lookup ON event(tenant_id, occurred_at);
    CREATE INDEX IF NOT EXISTS event_actor ON event(tenant_id, actor);
    CREATE INDEX IF NOT EXISTS event_action ON event(tenant_id, action);
    CREATE INDEX IF NOT EXISTS event_unrooted ON event(root_id) WHERE root_id IS NULL;
    CREATE TABLE IF NOT EXISTS payload (
      event_id TEXT PRIMARY KEY REFERENCES event(id), salt TEXT NOT NULL, data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tenant_root (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenant(id),
      from_position INTEGER NOT NULL, to_position INTEGER NOT NULL, root_hash TEXT NOT NULL,
      project_root_id TEXT NOT NULL, path_to_project TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_root (
      id TEXT PRIMARY KEY, root_hash TEXT NOT NULL, global_root_id TEXT NOT NULL,
      path_to_global TEXT NOT NULL, global_root_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS viewer_token (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, tenant_id TEXT NOT NULL,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT
    );
  `);
  migrateProjectExtras(db);
  projectDbs.set(projectId, db);
  return db;
}

export function closeAll(): void {
  for (const db of projectDbs.values()) db.close();
  projectDbs.clear();
}

export const now = (): string => new Date().toISOString();
