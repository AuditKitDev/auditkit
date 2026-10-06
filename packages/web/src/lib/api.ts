// Browser client for docs/web-api.md. Same origin; session is the httpOnly cookie.
export interface ApiError { code: string; message: string }
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export interface User { id: string; email: string; created_at: string }
export interface ProjectSummary { id: string; name: string; plan: PlanId; role: string; created_at: string; events_this_month: number; limit_events: number }
export type PlanId = "free" | "pro" | "business";
export interface AnchorRef { kind: "rekor" | "ots"; ref: string; status: "pending" | "final"; anchored_at: string }
export interface AnchorReceipt extends AnchorRef { proof?: string }
export interface Project extends ProjectSummary {
  usage: { events_this_month: number; limit_events: number; retention_days: number; anchor_interval_seconds: number };
  last_anchor: { global_root: string; created_at?: string; anchors: AnchorRef[] } | null;
}
export interface ApiKey { id: string; prefix: string; mode: "live" | "test"; scopes: Scope[]; created_at: string; revoked_at: string | null }
export type Scope = "read" | "write" | "erase" | "admin";
export interface Tenant { id: string; external_id: string; events: number; created_at: string; require_client_sig?: boolean }
export interface TenantKey { id: string; public_key: string; created_at: string; revoked_at: string | null }
export interface EventRecord {
  id: string; tenant: string; position: number; occurred_at: string; actor: string; action: string; target: string | null;
  payload: unknown; erased: boolean; event_hash: string; prev_hash: string;
  /** True when the event is in a Merkle root ("rooted"). Whether that root has a verified public anchor is `anchored_through` on /verify. */
  anchored: boolean;
}
export interface Receipt { id: string; tenant: string; position: number; event_hash: string; prev_hash: string; server_sig: string; duplicate: boolean }
export interface ProofStep { hash: string; side: "left" | "right" }
export type Proof =
  | { event_id: string; event_hash: string; anchored: false }
  | { event_id: string; event_hash: string; anchored: true; path_to_tenant_root: ProofStep[]; tenant_root: string; path_to_project_root: ProofStep[]; project_root: string; path_to_global_root: ProofStep[]; global_root: string; anchors: AnchorReceipt[] };
export type Verdict =
  | { valid: true; head: string; count: number; rooted_through: number; anchored_through: number }
  | { valid: false; position: number; reason: string };
export interface ViewerToken { id: string; tenant: string; expires_at: string; created_at: string; revoked_at: string | null }
export interface ViewerMe { tenant: string; project_id: string }
export interface PublicAnchor { global_root: string; created_at: string; projects: number; receipts: AnchorRef[] }
export interface PublicStats { events_total: number; roots_total: number; anchors_final: number; projects: number }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : null,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const e = (data as { error?: ApiError } | null)?.error;
    throw new HttpError(res.status, e?.code ?? `http_${res.status}`, e?.message ?? (text || res.statusText));
  }
  return data as T;
}
const get = <T>(p: string) => call<T>("GET", p);
const post = <T>(p: string, b?: unknown) => call<T>("POST", p, b ?? {});
const del = <T>(p: string) => call<T>("DELETE", p);
const qs = (q: Record<string, string | number | undefined | null>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
};

export const api = {
  auth: {
    me: () => get<{ user: User }>("/auth/me"),
    magic: (email: string, next?: string) => post<{ sent: true }>("/auth/magic", { email, ...(next ? { next } : {}) }),
    logout: () => post<void>("/auth/logout"),
  },
  projects: {
    list: () => get<{ projects: ProjectSummary[] }>("/api/app/projects"),
    create: (name: string) => post<{ id: string; name: string; plan: PlanId }>("/api/app/projects", { name }),
    get: (id: string) => get<Project>(`/api/app/projects/${id}`),
    keys: (id: string) => get<{ keys: ApiKey[] }>(`/api/app/projects/${id}/keys`),
    createKey: (id: string, mode: "live" | "test", scopes: Scope[]) => post<{ id: string; key: string }>(`/api/app/projects/${id}/keys`, { mode, scopes }),
    revokeKey: (id: string, keyId: string) => del<{ revoked: true }>(`/api/app/projects/${id}/keys/${keyId}`),
    tenants: (id: string) => get<{ tenants: Tenant[] }>(`/api/app/projects/${id}/tenants`),
    events: (id: string, q: Record<string, string | number | undefined | null>) => get<{ events: EventRecord[]; next_cursor: string | null }>(`/api/app/projects/${id}/events${qs(q)}`),
    event: (id: string, eventId: string) => get<EventRecord>(`/api/app/projects/${id}/events/${eventId}`),
    proof: (id: string, eventId: string) => get<Proof>(`/api/app/projects/${id}/events/${eventId}/proof`),
    verify: (id: string, tenant: string, from?: number, to?: number) => get<Verdict>(`/api/app/projects/${id}/verify${qs({ tenant, from, to })}`),
    exportUrl: (id: string, tenant: string) => `/api/app/projects/${id}/export${qs({ tenant })}`,
    tenantKeys: (id: string, tenant: string) => get<{ keys: TenantKey[] }>(`/api/app/projects/${id}/tenants/${encodeURIComponent(tenant)}/keys`),
    addTenantKey: (id: string, tenant: string, public_key: string) => post<{ id: string }>(`/api/app/projects/${id}/tenants/${encodeURIComponent(tenant)}/keys`, { public_key }),
    revokeTenantKey: (id: string, tenant: string, keyId: string) => del<{ revoked: true }>(`/api/app/projects/${id}/tenants/${encodeURIComponent(tenant)}/keys/${keyId}`),
    setTenantPolicy: (id: string, tenant: string, require_client_sig: boolean) => post<{ require_client_sig: boolean }>(`/api/app/projects/${id}/tenants/${encodeURIComponent(tenant)}/policy`, { require_client_sig }),
    viewerTokens: (id: string) => get<{ tokens: ViewerToken[] }>(`/api/app/projects/${id}/viewer-tokens`),
    createViewerToken: (id: string, tenant: string, ttl_hours?: number) => post<{ id: string; token: string; expires_at: string; url: string }>(`/api/app/projects/${id}/viewer-tokens`, { tenant, ...(ttl_hours ? { ttl_hours } : {}) }),
    revokeViewerToken: (id: string, tokenId: string) => del<{ revoked: true }>(`/api/app/projects/${id}/viewer-tokens/${tokenId}`),
    checkout: (id: string, plan: "pro" | "business") => post<{ url: string }>(`/api/app/projects/${id}/billing/checkout`, { plan }),
    portal: (id: string) => post<{ url: string }>(`/api/app/projects/${id}/billing/portal`),
  },
  viewer: (token: string) => {
    const t = `token=${encodeURIComponent(token)}`;
    return {
      me: () => get<ViewerMe>(`/api/viewer/me?${t}`),
      events: (q: Record<string, string | number | undefined | null>) => get<{ events: EventRecord[]; next_cursor: string | null }>(`/api/viewer/events${qs({ ...q, token })}`),
      proof: (eventId: string) => get<Proof>(`/api/viewer/events/${eventId}/proof?${t}`),
      verify: () => get<Verdict>(`/api/viewer/verify?${t}`),
      exportUrl: `/api/viewer/export?${t}`,
    };
  },
  demo: {
    log: (b: { actor: string; action: string; target?: string; payload?: unknown }) => post<Receipt>("/demo/log", b),
    events: () => get<{ events: EventRecord[]; next_cursor: string | null }>("/demo/events"),
    verify: () => get<Verdict>("/demo/verify"),
    proof: (id: string) => get<Proof>(`/demo/proof/${id}`),
  },
  public: {
    anchors: (limit = 20) => get<{ anchors: PublicAnchor[] }>(`/public/anchors?limit=${limit}`),
    stats: () => get<PublicStats>("/public/stats"),
  },
};

/** Resolve the session or send the visitor to /login. Returns null while redirecting. */
export async function requireUser(): Promise<User | null> {
  try {
    const { user } = await api.auth.me();
    return user;
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
      const next = location.pathname + location.search;
      location.replace(`/login?next=${encodeURIComponent(next)}`);
      return null;
    }
    throw e;
  }
}

/** /app/projects/<id>/... : the id is the third segment. Static build serves these pages from /app/projects/_/. */
export function projectIdFromUrl(): string | null {
  const m = location.pathname.match(/^\/app\/projects\/([^/]+)/);
  const id = m?.[1];
  return id !== undefined && id !== "_" ? decodeURIComponent(id) : null;
}

export const short = (hex: string, n = 8) => (hex.length > n * 2 + 1 ? `${hex.slice(0, n)}…${hex.slice(-n)}` : hex);
export const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export const fmtNum = (n: number) => n.toLocaleString();
/**
 * Rekor receipt refs come in two shapes (packages/anchor-rekor/src/rekor.ts):
 * v1 `"<logIndex>/<entryId>"` (rekor.sigstore.dev, searchable by index) and v2 `"<origin>/<logIndex>"`
 * (sharded logs such as log2025-1.rekor.sigstore.dev, which have no public search page; the receipt carries no entry URL).
 */
export interface RekorRef { index: string; shard: string | null; label: string; url: string | null }
export function rekorRef(ref: string): RekorRef {
  const v1 = ref.match(/^(\d+)\/[0-9a-f]+$/i);
  if (v1) return { index: v1[1]!, shard: null, label: `Rekor entry ${v1[1]}`, url: `https://search.sigstore.dev/?logIndex=${v1[1]}` };
  const v2 = ref.match(/^([^/]+)\/(\d+)$/);
  if (v2) { const shard = v2[1]!.split(".")[0]!; return { index: v2[2]!, shard, label: `Rekor entry ${v2[2]} on ${shard}`, url: null }; }
  return { index: ref, shard: null, label: `Rekor ${ref}`, url: null };
}
