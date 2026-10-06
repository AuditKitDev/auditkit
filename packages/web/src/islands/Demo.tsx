import { useEffect, useRef, useState } from "preact/hooks";
import { api, HttpError, short, type EventRecord, type Proof, type Receipt, type Verdict } from "../lib/api";

interface Block { id: string; position: number; actor: string; action: string; target: string | null; event_hash: string; prev_hash: string; server_sig?: string; occurred_at?: string }

const GENESIS = "0".repeat(64);
const anchorLine = (p: Proof | undefined): { text: string; level: "none" | "part" | "full" } => {
  if (!p || !p.anchored) return { text: "awaiting next anchor tick", level: "none" };
  const rekor = p.anchors.find((a) => a.kind === "rekor");
  const ots = p.anchors.find((a) => a.kind === "ots");
  if (!rekor && !ots) return { text: "in a Merkle root · anchors pending", level: "part" };
  const parts: string[] = [];
  if (rekor) parts.push(`anchored to Rekor #${rekor.ref.split("/")[0]}`);
  if (ots) parts.push(ots.status === "final" ? "OpenTimestamps confirmed in Bitcoin" : "OpenTimestamps pending");
  return { text: parts.join(" · "), level: rekor ? "full" : "part" };
};

export default function Demo() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [actor, setActor] = useState("alice@acme.io");
  const [action, setAction] = useState("invoice.delete");
  const [target, setTarget] = useState("inv_4821");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [proofs, setProofs] = useState<Record<string, Proof>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.demo.events().then(({ events }) => {
      const asc = [...events].sort((a, b) => a.position - b.position);
      setBlocks(asc.map(fromRecord));
    }).catch(() => setOffline(true));
  }, []);

  // Poll proofs for blocks that are not fully anchored yet.
  useEffect(() => {
    const pending = blocks.filter((b) => { const p = proofs[b.id]; return !p || !p.anchored || p.anchors.some((a) => a.status === "pending"); });
    if (!pending.length) return;
    let stop = false;
    const tick = async () => {
      for (const b of pending) {
        try { const p = await api.demo.proof(b.id); if (!stop) setProofs((m) => ({ ...m, [b.id]: p })); } catch { /* keep polling */ }
      }
    };
    void tick();
    const t = setInterval(tick, 6000);
    return () => { stop = true; clearInterval(t); };
  }, [blocks, Object.keys(proofs).length]);

  useEffect(() => { scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: "smooth" }); }, [blocks.length]);

  async function log(e: Event) {
    e.preventDefault();
    setBusy(true); setError(null); setVerdict(null);
    try {
      const r: Receipt = await api.demo.log({ actor, action, ...(target ? { target } : {}), payload: { ua: navigator.userAgent.slice(0, 40), demo: true } });
      setBlocks((b) => [...b, { id: r.id, position: r.position, actor, action, target: target || null, event_hash: r.event_hash, prev_hash: r.prev_hash, server_sig: r.server_sig, occurred_at: new Date().toISOString() }]);
      setOpen(r.id);
    } catch (err) {
      setError(err instanceof HttpError ? (err.status === 429 ? "Rate limit: 30 events per minute per visitor. Try again shortly." : err.message) : "The demo API is not reachable.");
    } finally { setBusy(false); }
  }

  async function verify() {
    setVerifying(true); setError(null);
    try { setVerdict(await api.demo.verify()); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setVerifying(false); }
  }

  const head = blocks[blocks.length - 1];
  return (
    <div class="card overflow-hidden">
      <form onSubmit={log} class="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label class="text-xs text-muted">actor
          <input class="field mt-1" value={actor} onInput={(e) => setActor((e.target as HTMLInputElement).value)} maxLength={80} required />
        </label>
        <label class="text-xs text-muted">action
          <input class="field mt-1" value={action} onInput={(e) => setAction((e.target as HTMLInputElement).value)} maxLength={80} required placeholder="invoice.delete" />
        </label>
        <label class="text-xs text-muted">target <span class="text-faint">(optional)</span>
          <input class="field mt-1" value={target} onInput={(e) => setTarget((e.target as HTMLInputElement).value)} maxLength={80} />
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="btn btn-primary w-full sm:w-auto" disabled={busy || offline}>{busy ? "Logging…" : "Log event"}</button>
        </div>
      </form>

      {offline && <p class="border-b border-line bg-warn-dim px-4 py-2 text-sm text-warn" role="status">The demo API is offline right now. The rest of the page still describes what it does; try again in a minute.</p>}
      {error && <p class="border-b border-line bg-danger-dim px-4 py-2 text-sm text-danger" role="alert">{error}</p>}

      <div ref={scroller} class="overflow-x-auto bg-grid p-4" aria-live="polite">
        {blocks.length === 0 ? (
          <p class="py-8 text-center text-sm text-muted">No events yet for this visitor. Log one; the receipt appears here as the first block of your own chain.</p>
        ) : (
          <ol class="flex min-w-max items-stretch gap-0">
            <li class="flex items-center">
              <div class="rounded-md border border-dashed border-line-strong px-3 py-2 font-mono text-[0.7rem] text-faint">GENESIS<br />{short(GENESIS, 4)}</div>
              <Arrow />
            </li>
            {blocks.map((b, i) => {
              const st = anchorLine(proofs[b.id]);
              const isOpen = open === b.id;
              return (
                <li key={b.id} class="flex items-center">
                  <button type="button" onClick={() => setOpen(isOpen ? null : b.id)} aria-expanded={isOpen}
                    class={`rise w-56 rounded-md border bg-surface p-3 text-left transition-colors hover:border-fg-faint ${isOpen ? "border-accent" : "border-line-strong"}`}>
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs text-muted">#{b.position}</span>
                      <span class={`pill ${st.level === "full" ? "pill-ok" : st.level === "part" ? "pill-info" : "pill-warn"}`}>{st.level === "full" ? "anchored" : st.level === "part" ? "rooted" : "chained"}</span>
                    </div>
                    <p class="mt-1 truncate text-sm font-medium" title={b.action}>{b.action}</p>
                    <p class="truncate text-xs text-muted" title={b.actor}>{b.actor}{b.target ? ` → ${b.target}` : ""}</p>
                    <dl class="mt-2 space-y-0.5 font-mono text-[0.68rem]">
                      <div class="flex gap-2"><dt class="w-9 text-faint">hash</dt><dd class="text-fg">{short(b.event_hash, 6)}</dd></div>
                      <div class="flex gap-2"><dt class="w-9 text-faint">prev</dt><dd class={b.prev_hash === (blocks[i - 1]?.event_hash ?? GENESIS) ? "text-accent" : "text-fg"}>{short(b.prev_hash, 6)}</dd></div>
                      {b.server_sig && <div class="flex gap-2"><dt class="w-9 text-faint">sig</dt><dd class="text-fg">{b.server_sig.slice(0, 12)}…</dd></div>}
                    </dl>
                  </button>
                  {i < blocks.length - 1 && <Arrow />}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {open && blocks.find((b) => b.id === open) && <Detail block={blocks.find((b) => b.id === open)!} proof={proofs[open]} />}

      <div class="flex flex-wrap items-center gap-3 border-t border-line p-4">
        <button type="button" class="btn" onClick={verify} disabled={verifying || blocks.length === 0}>{verifying ? "Verifying…" : "Verify chain"}</button>
        {verdict && (verdict.valid ? (
          <p class="font-mono text-sm" role="status">
            <span class="font-semibold text-accent">VALID</span> · {verdict.count} events · head <span class="text-fg">{short(verdict.head, 8)}</span>
            <span class="text-muted"> · rooted through {verdict.rooted_through < 0 ? "none" : `#${verdict.rooted_through}`} · anchored through {verdict.anchored_through < 0 ? "none" : `#${verdict.anchored_through}`}</span>
          </p>
        ) : (
          <p class="font-mono text-sm" role="status"><span class="font-semibold text-danger">INVALID</span> at position {verdict.position}: {verdict.reason}</p>
        ))}
        {head && !verdict && <p class="text-sm text-muted">{anchorLine(proofs[head.id]).text}</p>}
      </div>
    </div>
  );
}

function Arrow() {
  return <svg class="mx-1 h-4 w-6 shrink-0 text-accent" viewBox="0 0 24 16" aria-hidden="true"><path d="M0 8h20M15 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>;
}

function fromRecord(e: EventRecord): Block {
  return { id: e.id, position: e.position, actor: e.actor, action: e.action, target: e.target, event_hash: e.event_hash, prev_hash: e.prev_hash, occurred_at: e.occurred_at };
}

function Detail({ block, proof }: { block: Block; proof: Proof | undefined }) {
  const st = anchorLine(proof);
  return (
    <div class="border-t border-line p-4 text-sm">
      <p class="mb-2 font-medium">Receipt for event #{block.position}</p>
      <dl class="grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr]">
        <dt class="text-faint">id</dt><dd class="hash">{block.id}</dd>
        <dt class="text-faint">event_hash</dt><dd class="hash">{block.event_hash}</dd>
        <dt class="text-faint">prev_hash</dt><dd class="hash">{block.prev_hash}</dd>
        {block.server_sig && <><dt class="text-faint">server_sig</dt><dd class="hash">{block.server_sig}</dd></>}
        <dt class="text-faint">anchor</dt>
        <dd class={st.level === "full" ? "text-accent" : "text-muted"}>{st.text}{st.level === "none" && <span class="pulse ml-2 inline-block h-2 w-2 rounded-full bg-warn align-middle" aria-hidden="true" />}</dd>
        {proof?.anchored && <>
          <dt class="text-faint">tenant_root</dt><dd class="hash">{proof.tenant_root}</dd>
          <dt class="text-faint">global_root</dt><dd class="hash">{proof.global_root}</dd>
          <dt class="text-faint">merkle path</dt><dd class="text-muted">{proof.path_to_tenant_root.length + proof.path_to_project_root.length + proof.path_to_global_root.length} steps to the global root</dd>
          {proof.anchors.map((a) => <><dt class="text-faint">{a.kind}</dt><dd class="hash">{a.ref} <span class="text-muted">({a.status})</span></dd></>)}
        </>}
      </dl>
      <p class="mt-3 text-xs text-faint">Receipts are signed with the server's Ed25519 key, published at <code>/.well-known/auditkit.json</code>. The demo tenant is keyed to your IP hash and reset nightly.</p>
    </div>
  );
}
