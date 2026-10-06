// @auditkit/sdk: depends only on @auditkit/core; global fetch and node:crypto.
import { randomUUID, sign, verify, type KeyObject } from "node:crypto";

import { clientSignable as coreClientSignable, type ExportLine, type Hex } from "@auditkit/core";

export type { ExportLine, Hex };

export interface EventInput {
  tenant: string;
  actor: string;
  action: string;
  target?: string | null;
  occurredAt?: string;
  payload?: unknown;
  idempotencyKey?: string;
}
export interface Receipt {
  id: string; tenant: string; position: number; event_hash: Hex; prev_hash: Hex; server_sig: string; duplicate?: boolean;
}
export interface EventRecord {
  id: string; tenant: string; position: number; occurred_at: string; actor: string; action: string; target: string | null;
  payload: unknown; erased: boolean; event_hash: Hex; prev_hash: Hex; anchored: boolean;
}
export interface SearchQuery { tenant?: string; actor?: string; action?: string; from?: string; to?: string; limit?: number; cursor?: string }
export interface SearchResult { events: EventRecord[]; next_cursor: string | null }
export interface Range { tenant: string; from?: number; to?: number }

export class AuditKitError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "AuditKitError";
  }
}

/**
 * The bytes a client signs: @auditkit/core `clientSignable`, as hex. Same input with camelCase `occurredAt`.
 * The signature is Ed25519 over the 32 raw digest bytes, base64.
 */
export function clientSignable(e: { tenant: string; actor: string; action: string; target?: string | null; occurredAt: string }): Hex {
  return coreClientSignable({ tenant: e.tenant, actor: e.actor, action: e.action, target: e.target, occurred_at: e.occurredAt });
}

/** Check a client_sig (base64) against a public KeyObject. */
export function verifyClientSig(publicKey: KeyObject, e: Parameters<typeof clientSignable>[0], sigB64: string): boolean {
  return verify(null, Buffer.from(clientSignable(e), "hex"), publicKey, Buffer.from(sigB64, "base64"));
}

export interface AuditKitOptions {
  apiKey: string;
  baseUrl?: string;
  clientKey?: KeyObject;
  keepReceipts?: (r: Receipt) => void;
  fetch?: typeof fetch;
  /** Attempts per call (default 3). */
  maxAttempts?: number;
  /** Base backoff in ms, doubled per retry (default 200). */
  retryDelayMs?: number;
}

type Req = { method?: string; body?: unknown; headers?: Record<string, string>; retry: boolean };

export class AuditKit {
  readonly #o: AuditKitOptions;
  readonly #base: string;
  readonly #fetch: typeof fetch;

  constructor(opts: AuditKitOptions) {
    this.#o = opts;
    this.#base = (opts.baseUrl ?? "https://api.auditkit.dev").replace(/\/+$/, "");
    this.#fetch = opts.fetch ?? ((...a) => fetch(...a));
  }

  async #send(path: string, init: Req): Promise<Response> {
    const max = init.retry ? (this.#o.maxAttempts ?? 3) : 1;
    for (let attempt = 1; ; attempt++) {
      let res: Response | undefined;
      try {
        res = await this.#fetch(this.#base + path, {
          method: init.method ?? "GET",
          headers: { authorization: `Bearer ${this.#o.apiKey}`, ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...init.headers },
          ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        });
      } catch (e) {
        if (attempt >= max) throw e;
      }
      if (res && (res.ok || (res.status !== 429 && res.status < 500) || attempt >= max)) {
        if (res.ok) return res;
        const j = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        throw new AuditKitError(res.status, j?.error?.code ?? "http_" + res.status, j?.error?.message ?? res.statusText);
      }
      await new Promise((r) => setTimeout(r, (this.#o.retryDelayMs ?? 200) * 2 ** (attempt - 1)));
    }
  }

  async #json<T>(path: string, init: Req = { retry: true }): Promise<T> {
    return (await (await this.#send(path, init)).json()) as T;
  }

  #wire(e: EventInput): Record<string, unknown> {
    const occurred_at = e.occurredAt ?? (this.#o.clientKey ? new Date().toISOString() : undefined);
    const w: Record<string, unknown> = { tenant: e.tenant, actor: e.actor, action: e.action, idempotency_key: e.idempotencyKey ?? randomUUID() };
    if (e.target !== undefined) w.target = e.target;
    if (occurred_at !== undefined) w.occurred_at = occurred_at;
    if (e.payload !== undefined) w.payload = e.payload;
    if (this.#o.clientKey) {
      w.client_sig = sign(null, Buffer.from(clientSignable({ ...e, occurredAt: occurred_at! }), "hex"), this.#o.clientKey).toString("base64");
    }
    return w;
  }

  #keep(r: Receipt): Receipt {
    this.#o.keepReceipts?.(r);
    return r;
  }

  /** Always sends an idempotency key (generated if absent), so retries never double-log. */
  async log(e: EventInput): Promise<Receipt> {
    const w = this.#wire(e);
    return this.#keep(await this.#json<Receipt>("/v1/events", { method: "POST", body: w, headers: { "idempotency-key": w.idempotency_key as string }, retry: true }));
  }

  /** Each event gets its own idempotency key; the batch is one transaction, so a retry replays it safely. */
  async logBulk(events: EventInput[]): Promise<Receipt[]> {
    const { receipts } = await this.#json<{ receipts: Receipt[] }>("/v1/events/bulk", { method: "POST", body: { events: events.map((e) => this.#wire(e)) }, retry: true });
    return receipts.map((r) => this.#keep(r));
  }

  search(q: SearchQuery = {}): Promise<SearchResult> {
    return this.#json("/v1/events" + qs(q));
  }
  get(id: string): Promise<EventRecord> {
    return this.#json(`/v1/events/${encodeURIComponent(id)}`);
  }
  proof(id: string): Promise<Record<string, unknown>> {
    return this.#json(`/v1/events/${encodeURIComponent(id)}/proof`);
  }
  verify(r: Range): Promise<{ valid: boolean; count: number; anchored_through: number; [k: string]: unknown }> {
    return this.#json("/v1/verify" + qs(r));
  }
  async tenants(): Promise<Array<{ id: string; external_id: string; events: number; created_at: string }>> {
    return (await this.#json<{ tenants: never[] }>("/v1/tenants")).tenants;
  }
  /** Not retried: a retry after a lost success would 404. */
  erase(id: string): Promise<{ erased: boolean }> {
    return this.#json(`/v1/erase/${encodeURIComponent(id)}`, { method: "POST", retry: false });
  }

  /** Streams the NDJSON export, one parsed line at a time. */
  async *export(r: Range): AsyncIterable<ExportLine> {
    const res = await this.#send("/v1/export" + qs(r), { retry: true });
    if (!res.body) return;
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buf += dec.decode(chunk, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) yield JSON.parse(line) as ExportLine;
      }
    }
    if (buf.trim()) yield JSON.parse(buf) as ExportLine;
  }
}

function qs(q: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, String(v));
  const s = p.toString();
  return s ? "?" + s : "";
}
