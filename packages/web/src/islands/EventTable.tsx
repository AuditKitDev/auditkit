import { useEffect, useState } from "preact/hooks";
import { fmtDate, type EventRecord, type Proof } from "../lib/api";
import { ErrorBox, Hash, Loading, ProofView } from "./ui";

type Query = Record<string, string | number | undefined | null>;
interface Props {
  fetchPage: (q: Query) => Promise<{ events: EventRecord[]; next_cursor: string | null }>;
  fetchProof: (id: string) => Promise<Proof>;
  tenants?: string[];
  /** Hide the tenant filter (viewer tokens are tenant-scoped). */
  fixedTenant?: boolean;
}

export default function EventTable({ fetchPage, fetchProof, tenants, fixedTenant = false }: Props) {
  const initialTenant = typeof location !== "undefined" ? new URLSearchParams(location.search).get("tenant") ?? "" : "";
  const [filters, setFilters] = useState<Query>({ tenant: initialTenant, actor: "", action: "", from: "", to: "" });
  const [applied, setApplied] = useState<Query>(initialTenant ? { tenant: initialTenant } : {});
  const [erasedBy, setErasedBy] = useState<Record<string, number | null>>({});
  const [pages, setPages] = useState<EventRecord[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, Proof | "loading" | "error">>({});

  const load = async (q: Query, after: string | null, append: boolean) => {
    setLoading(true); setError(null);
    try {
      const r = await fetchPage({ ...q, limit: 50, cursor: after ?? undefined });
      setPages((p) => (append ? [...p, r.events] : [r.events]));
      setCursor(r.next_cursor);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(applied, null, false); }, [applied]);

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    const row = pages.flat().find((e) => e.id === id);
    if (row?.erased && erasedBy[id] === undefined) {
      // The erasure is itself an event: action payload.erased, target = the erased id, same chain.
      fetchPage({ tenant: row.tenant, action: "payload.erased", limit: 500 })
        .then((r) => setErasedBy((m) => ({ ...m, [id]: r.events.find((a) => a.target === id)?.position ?? null })))
        .catch(() => setErasedBy((m) => ({ ...m, [id]: null })));
    }
    if (!proofs[id]) {
      setProofs((m) => ({ ...m, [id]: "loading" }));
      try { const p = await fetchProof(id); setProofs((m) => ({ ...m, [id]: p })); } catch { setProofs((m) => ({ ...m, [id]: "error" })); }
    }
  };
  const rows = pages.flat();
  const set = (k: string) => (e: Event) => setFilters((f) => ({ ...f, [k]: (e.target as HTMLInputElement).value }));
  const toIso = (v: unknown) => (v ? new Date(String(v)).toISOString() : "");

  return (
    <div class="space-y-3">
      <form class="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={(e) => { e.preventDefault(); setApplied({ ...filters, from: toIso(filters.from), to: toIso(filters.to) }); }}>
        {!fixedTenant && (
          <label class="text-xs text-muted">tenant
            {tenants ? (
              <select class="field mt-1" value={String(filters.tenant ?? "")} onChange={set("tenant")}>
                <option value="">all</option>{tenants.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : <input class="field mt-1" value={String(filters.tenant ?? "")} onInput={set("tenant")} />}
          </label>
        )}
        <label class="text-xs text-muted">actor<input class="field mt-1" value={String(filters.actor ?? "")} onInput={set("actor")} placeholder="u_1" /></label>
        <label class="text-xs text-muted">action<input class="field mt-1" value={String(filters.action ?? "")} onInput={set("action")} placeholder="invoice.* " /></label>
        <label class="text-xs text-muted">from<input type="datetime-local" class="field mt-1" value={String(filters.from ?? "")} onInput={set("from")} /></label>
        <label class="text-xs text-muted">to<input type="datetime-local" class="field mt-1" value={String(filters.to ?? "")} onInput={set("to")} /></label>
        <div class="flex items-end gap-2">
          <button type="submit" class="btn btn-primary">Search</button>
          <button type="button" class="btn" onClick={() => { setFilters({ tenant: "", actor: "", action: "", from: "", to: "" }); setApplied({}); }}>Clear</button>
        </div>
      </form>
      <ErrorBox error={error} />
      <div class="card overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
            <tr><th class="px-3 py-2 font-medium">time</th>{!fixedTenant && <th class="px-3 py-2 font-medium">tenant</th>}<th class="px-3 py-2 font-medium">#</th><th class="px-3 py-2 font-medium">actor</th><th class="px-3 py-2 font-medium">action</th><th class="px-3 py-2 font-medium">target</th><th class="px-3 py-2 font-medium">hash</th><th class="px-3 py-2 font-medium">status</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const isOpen = open === e.id;
              const p = proofs[e.id];
              return (
                <>
                  <tr key={e.id} class={`cursor-pointer border-b border-line hover:bg-surface-2 ${isOpen ? "bg-surface-2" : ""}`} onClick={() => void toggle(e.id)} tabIndex={0} onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); void toggle(e.id); } }} aria-expanded={isOpen}>
                    <td class="whitespace-nowrap px-3 py-2 text-muted">{fmtDate(e.occurred_at)}</td>
                    {!fixedTenant && <td class="px-3 py-2 font-mono text-xs">{e.tenant}</td>}
                    <td class="px-3 py-2 font-mono text-xs text-muted">{e.position}</td>
                    <td class="max-w-[12rem] truncate px-3 py-2">{e.actor}</td>
                    <td class="px-3 py-2 font-mono text-xs">{e.action}</td>
                    <td class="max-w-[10rem] truncate px-3 py-2 text-muted">{e.target ?? "—"}</td>
                    <td class="px-3 py-2"><Hash v={e.event_hash} /></td>
                    <td class="px-3 py-2"><span class="flex gap-1">{e.erased && <span class="pill pill-danger">erased</span>}<span class={`pill ${e.anchored ? "pill-ok" : "pill-warn"}`}>{e.anchored ? "rooted" : "chained"}</span></span></td>
                  </tr>
                  {isOpen && (
                    <tr key={e.id + "x"} class="border-b border-line bg-elev">
                      <td colSpan={8} class="px-4 py-4">
                        <div class="grid gap-6 lg:grid-cols-2">
                          <div>
                            <p class="mb-1 text-xs uppercase tracking-wider text-faint">event</p>
                            <dl class="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[7rem_1fr]">
                              <dt class="text-faint">id</dt><dd class="hash">{e.id}</dd>
                              <dt class="text-faint">event_hash</dt><dd class="hash">{e.event_hash}</dd>
                              <dt class="text-faint">prev_hash</dt><dd class="hash">{e.prev_hash}</dd>
                              <dt class="text-faint">occurred_at</dt><dd class="font-mono text-xs">{e.occurred_at}</dd>
                            </dl>
                            <p class="mt-3 mb-1 text-xs uppercase tracking-wider text-faint">payload</p>
                            {e.erased ? <p class="text-sm text-danger">Erased{erasedBy[e.id] != null ? ` · logged as event #${erasedBy[e.id]}` : erasedBy[e.id] === undefined ? " · finding the erasure event…" : ""}. The commitment stays in the chain; the payload and its salt are gone.</p>
                              : <pre class="max-h-64 overflow-auto rounded border border-line bg-bg p-3 text-xs">{JSON.stringify(e.payload, null, 2)}</pre>}
                          </div>
                          <div>
                            <p class="mb-1 text-xs uppercase tracking-wider text-faint">proof</p>
                            {p === "loading" || !p ? <Loading what="Fetching proof" /> : p === "error" ? <ErrorBox error="Could not load the proof." /> : <ProofView proof={p} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!loading && rows.length === 0 && <tr><td colSpan={8} class="px-3 py-8 text-center text-muted">No events match.</td></tr>}
          </tbody>
        </table>
        {loading && <Loading />}
        {cursor && !loading && <div class="border-t border-line p-3 text-center"><button type="button" class="btn" onClick={() => void load(applied, cursor, true)}>Load more</button></div>}
      </div>
    </div>
  );
}
