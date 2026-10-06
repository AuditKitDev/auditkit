import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { fmtDate, rekorUrl, short, type AnchorRef, type Proof, type ProofStep, type Verdict } from "../lib/api";

export const Loading = ({ what = "Loading" }: { what?: string }) => <p class="py-8 text-center text-sm text-muted" role="status">{what}…</p>;

export const ErrorBox = ({ error }: { error: string | null }) => error ? <p class="rounded-md border border-danger/40 bg-danger-dim px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null;

export function Modal({ title, children, onClose }: { title: string; children: ComponentChildren; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} class="card m-auto w-[min(40rem,92vw)] p-0 text-fg backdrop:bg-black/60" aria-labelledby="modal-title">
      <div class="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id="modal-title" class="font-semibold">{title}</h2>
        <button type="button" class="btn btn-sm" onClick={() => ref.current?.close()}>Close</button>
      </div>
      <div class="p-5">{children}</div>
    </dialog>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return <button type="button" class="btn btn-sm" onClick={(e) => { void navigator.clipboard.writeText(text); const b = e.currentTarget as HTMLButtonElement; b.textContent = "Copied"; setTimeout(() => (b.textContent = label), 1200); }}>{label}</button>;
}

export function AnchorPills({ anchors }: { anchors: AnchorRef[] }) {
  if (!anchors.length) return <span class="pill pill-warn">anchors pending</span>;
  return (
    <span class="flex flex-wrap gap-1">
      {anchors.map((a) => a.kind === "rekor"
        ? <a key={a.ref} href={rekorUrl(a.ref)} target="_blank" rel="noopener" class="pill pill-ok hover:underline">Rekor #{a.ref.split("/")[0]}</a>
        : <span key={a.ref} class={`pill ${a.status === "final" ? "pill-ok" : "pill-warn"}`}>OTS {a.status === "final" ? "bitcoin" : "pending"}</span>)}
    </span>
  );
}

export function VerdictView({ v }: { v: Verdict }) {
  if (!v.valid) return <p class="font-mono text-sm" role="status"><span class="font-semibold text-danger">INVALID</span> at position {v.position}: {v.reason}</p>;
  return (
    <dl class="grid gap-x-4 gap-y-1 font-mono text-sm sm:grid-cols-[10rem_1fr]" role="status">
      <dt class="text-faint">verdict</dt><dd class="font-semibold text-accent">VALID</dd>
      <dt class="text-faint">events</dt><dd>{v.count}</dd>
      <dt class="text-faint">head</dt><dd class="hash">{v.head}</dd>
      <dt class="text-faint">rooted through</dt><dd>{v.rooted_through < 0 ? "none yet" : `#${v.rooted_through}`} <span class="text-faint">· in a Merkle root</span></dd>
      <dt class="text-faint">anchored through</dt><dd>{v.anchored_through < 0 ? "none yet" : `#${v.anchored_through}`} <span class="text-faint">· root published to Rekor / OTS</span></dd>
    </dl>
  );
}

export function ProofView({ proof }: { proof: Proof }) {
  if (!proof.anchored) return <p class="text-sm text-muted">Not in a Merkle root yet: the event is newer than the last anchor tick. Chain and signature still apply.</p>;
  const Path = ({ steps }: { steps: ProofStep[] }) => (
    <ol class="mt-1 space-y-0.5 font-mono text-[0.72rem] text-muted">{steps.map((s, i) => <li key={i}>{s.side === "left" ? "L" : "R"} {s.hash}</li>)}</ol>
  );
  return (
    <div class="space-y-3 text-sm">
      <div><p class="text-faint">event_hash</p><p class="hash">{proof.event_hash}</p></div>
      <div><p class="text-faint">path to tenant root ({proof.path_to_tenant_root.length} steps)</p><Path steps={proof.path_to_tenant_root} /><p class="mt-1 text-faint">tenant_root</p><p class="hash">{proof.tenant_root}</p></div>
      <div><p class="text-faint">path to project root ({proof.path_to_project_root.length} steps)</p><Path steps={proof.path_to_project_root} /><p class="mt-1 text-faint">project_root</p><p class="hash">{proof.project_root}</p></div>
      <div><p class="text-faint">path to global root ({proof.path_to_global_root.length} steps)</p><Path steps={proof.path_to_global_root} /><p class="mt-1 text-faint">global_root</p><p class="hash">{proof.global_root}</p></div>
      <div>
        <p class="text-faint">anchor receipts</p>
        {proof.anchors.length === 0 && <p class="text-muted">Root built; public anchors not written yet.</p>}
        <ul class="mt-1 space-y-1">
          {proof.anchors.map((a) => (
            <li key={a.kind + a.ref} class="flex flex-wrap items-center gap-2">
              <span class={`pill ${a.status === "final" ? "pill-ok" : "pill-warn"}`}>{a.kind} · {a.status}</span>
              <span class="hash">{a.ref}</span>
              <span class="text-faint">{a.anchored_at ? fmtDate(a.anchored_at) : ""}</span>
              {a.kind === "rekor" && <a class="text-accent underline" href={rekorUrl(a.ref)} target="_blank" rel="noopener">open in Rekor search</a>}
            </li>
          ))}
        </ul>
      </div>
      <p class="text-xs text-faint">Rekor is final on write and gives inclusion, not time. OpenTimestamps stamps immediately and the Bitcoin confirmation lands within hours, then <code>pending</code> becomes <code>final</code>.</p>
    </div>
  );
}

export const Hash = ({ v, n = 6 }: { v: string; n?: number }) => <span class="font-mono text-xs" title={v}>{short(v, n)}</span>;
