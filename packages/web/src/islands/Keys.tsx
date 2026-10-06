import { useEffect, useState } from "preact/hooks";
import { api, fmtDate, type ApiKey, type Project, type Scope } from "../lib/api";
import { ProjectFrame } from "./app";
import { CopyButton, ErrorBox, Loading, Modal } from "./ui";

const SCOPES: Array<[Scope, string]> = [["read", "search, get, proof, verify, export"], ["write", "log events"], ["erase", "crypto-shred payloads"], ["admin", "manage keys; implies all"]];

export default function Keys() {
  return <ProjectFrame title="API keys">{(p) => <Body p={p} />}</ProjectFrame>;
}

function Body({ p }: { p: Project }) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "test">("test");
  const [scopes, setScopes] = useState<Scope[]>(["read", "write"]);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<{ id: string; key: string } | null>(null);
  const load = () => api.projects.keys(p.id).then((r) => setKeys(r.keys)).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  useEffect(() => { void load(); }, [p.id]);

  async function create(e: Event) {
    e.preventDefault(); setBusy(true); setError(null);
    try { setShown(await api.projects.createKey(p.id, mode, scopes)); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  async function revoke(k: ApiKey) {
    if (!confirm(`Revoke ${k.prefix}…? Requests with this key fail immediately. This cannot be undone.`)) return;
    try { await api.projects.revokeKey(p.id, k.id); await load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }
  const toggleScope = (s: Scope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={create} class="card h-fit p-5">
        <h2 class="font-semibold">Create a key</h2>
        <fieldset class="mt-4">
          <legend class="text-xs uppercase tracking-wider text-faint">Mode</legend>
          <div class="mt-2 flex gap-2">
            {(["test", "live"] as const).map((m) => (
              <label key={m} class={`btn btn-sm flex-1 cursor-pointer ${mode === m ? "border-accent text-fg" : ""}`}>
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} class="sr-only" />ak_{m}_
              </label>
            ))}
          </div>
          <p class="mt-2 text-xs text-faint">Test keys hit a seeded demo project; live keys hit this one.</p>
        </fieldset>
        <fieldset class="mt-4">
          <legend class="text-xs uppercase tracking-wider text-faint">Scopes</legend>
          <div class="mt-2 space-y-1.5">
            {SCOPES.map(([s, d]) => (
              <label key={s} class="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} class="mt-1 accent-[var(--accent)]" />
                <span><code>{s}</code> <span class="text-muted">· {d}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" class="btn btn-primary mt-5 w-full" disabled={busy || scopes.length === 0}>{busy ? "Creating…" : "Create key"}</button>
      </form>
      <div>
        <ErrorBox error={error} />
        {!keys ? <Loading /> : (
          <div class="card overflow-x-auto">
            <table class="w-full min-w-[560px] text-sm">
              <thead class="border-b border-line text-left text-xs uppercase tracking-wider text-faint"><tr><th class="px-3 py-2 font-medium">prefix</th><th class="px-3 py-2 font-medium">mode</th><th class="px-3 py-2 font-medium">scopes</th><th class="px-3 py-2 font-medium">created</th><th class="px-3 py-2 font-medium">status</th><th class="px-3 py-2"></th></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} class="border-b border-line last:border-0">
                    <td class="px-3 py-2 font-mono text-xs">{k.prefix}…</td>
                    <td class="px-3 py-2"><span class={`pill ${k.mode === "live" ? "pill-ok" : "pill-info"}`}>{k.mode}</span></td>
                    <td class="px-3 py-2 font-mono text-xs">{k.scopes.join(" ")}</td>
                    <td class="px-3 py-2 text-muted">{fmtDate(k.created_at)}</td>
                    <td class="px-3 py-2">{k.revoked_at ? <span class="pill pill-danger">revoked</span> : <span class="pill pill-ok">active</span>}</td>
                    <td class="px-3 py-2 text-right">{!k.revoked_at && <button type="button" class="btn btn-sm btn-danger" onClick={() => void revoke(k)}>Revoke</button>}</td>
                  </tr>
                ))}
                {keys.length === 0 && <tr><td colSpan={6} class="px-3 py-8 text-center text-muted">No keys yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <p class="mt-3 text-xs text-faint">We store only a SHA-256 hash of each key and its prefix. A key is shown once, at creation.</p>
      </div>
      {shown && (
        <Modal title="Your new API key" onClose={() => setShown(null)}>
          <p class="text-sm text-muted">Copy it now. It is not stored in a recoverable form and will not be shown again.</p>
          <div class="mt-3 flex items-center gap-2 rounded-md border border-line bg-bg p-3">
            <code class="hash flex-1 select-all text-sm">{shown.key}</code>
            <CopyButton text={shown.key} />
          </div>
          <pre class="mt-4 rounded-md border border-line bg-bg p-3 text-xs">{`export AUDITKIT_KEY=${shown.key}\ncurl -H "Authorization: Bearer $AUDITKIT_KEY" https://api.auditkit.dev/v1/tenants`}</pre>
        </Modal>
      )}
    </div>
  );
}
