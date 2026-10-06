import { useEffect, useState } from "preact/hooks";
import { api, fmtDate, type Project, type Tenant, type ViewerToken } from "../lib/api";
import { ProjectFrame } from "./app";
import { CopyButton, ErrorBox, Loading, Modal } from "./ui";

export default function ViewerTokens() {
  return <ProjectFrame title="Viewer tokens">{(p) => <Body p={p} />}</ProjectFrame>;
}
function Body({ p }: { p: Project }) {
  const [tokens, setTokens] = useState<ViewerToken[] | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenant, setTenant] = useState("");
  const [ttl, setTtl] = useState("168");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<{ url: string; token: string; expires_at: string } | null>(null);
  const load = () => api.projects.viewerTokens(p.id).then((r) => setTokens(r.tokens)).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  useEffect(() => { void load(); api.projects.tenants(p.id).then((r) => { setTenants(r.tenants); setTenant((t) => t || r.tenants[0]?.external_id || ""); }).catch(() => undefined); }, [p.id]);

  async function create(e: Event) {
    e.preventDefault(); setBusy(true); setError(null);
    try { setShown(await api.projects.createViewerToken(p.id, tenant, Number(ttl))); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  async function revoke(t: ViewerToken) {
    if (!confirm(`Revoke viewer access for ${t.tenant}? Anyone holding the link loses access now.`)) return;
    try { await api.projects.revokeViewerToken(p.id, t.id); await load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }
  const status = (t: ViewerToken) => t.revoked_at ? ["revoked", "pill-danger"] : t.expires_at < new Date().toISOString() ? ["expired", "pill-warn"] : ["active", "pill-ok"];
  const embed = shown ? `<iframe src="${shown.url}&embed=1" width="100%" height="640" style="border:0"></iframe>` : "";

  return (
    <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={create} class="card h-fit p-5">
        <h2 class="font-semibold">Share a tenant's log</h2>
        <p class="mt-1 text-xs text-muted">A viewer token is read-only and scoped to one tenant. Hand the link to that customer's auditor, or iframe it into your own admin UI.</p>
        <label class="mt-4 block text-sm">Tenant
          <select class="field mt-1" value={tenant} onChange={(e) => setTenant((e.target as HTMLSelectElement).value)} required>
            {tenants.map((x) => <option key={x.id} value={x.external_id}>{x.external_id}</option>)}
          </select>
        </label>
        <label class="mt-3 block text-sm">Expires in
          <select class="field mt-1" value={ttl} onChange={(e) => setTtl((e.target as HTMLSelectElement).value)}>
            <option value="24">24 hours</option><option value="168">7 days</option><option value="720">30 days</option><option value="2160">90 days (max)</option>
          </select>
        </label>
        <button type="submit" class="btn btn-primary mt-5 w-full" disabled={busy || !tenant}>{busy ? "Creating…" : "Create viewer link"}</button>
      </form>
      <div>
        <ErrorBox error={error} />
        {!tokens ? <Loading /> : (
          <div class="card overflow-x-auto">
            <table class="w-full min-w-[520px] text-sm">
              <thead class="border-b border-line text-left text-xs uppercase tracking-wider text-faint"><tr><th class="px-3 py-2 font-medium">tenant</th><th class="px-3 py-2 font-medium">created</th><th class="px-3 py-2 font-medium">expires</th><th class="px-3 py-2 font-medium">status</th><th class="px-3 py-2"></th></tr></thead>
              <tbody>
                {tokens.map((t) => { const [label, cls] = status(t); return (
                  <tr key={t.id} class="border-b border-line last:border-0">
                    <td class="px-3 py-2 font-mono text-xs">{t.tenant}</td>
                    <td class="px-3 py-2 text-muted">{fmtDate(t.created_at)}</td>
                    <td class="px-3 py-2 text-muted">{fmtDate(t.expires_at)}</td>
                    <td class="px-3 py-2"><span class={`pill ${cls}`}>{label}</span></td>
                    <td class="px-3 py-2 text-right">{label === "active" && <button type="button" class="btn btn-sm btn-danger" onClick={() => void revoke(t)}>Revoke</button>}</td>
                  </tr>
                ); })}
                {tokens.length === 0 && <tr><td colSpan={5} class="px-3 py-8 text-center text-muted">No viewer tokens yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <p class="mt-3 text-xs text-faint">Tokens are shown once. The viewer page at <code>/viewer</code> can search, expand proofs, run verify and export; it cannot write or erase.</p>
      </div>
      {shown && (
        <Modal title="Viewer link created" onClose={() => setShown(null)}>
          <p class="text-sm text-muted">Shown once. Expires {fmtDate(shown.expires_at)}.</p>
          <div class="mt-3 flex items-center gap-2 rounded-md border border-line bg-bg p-3"><code class="hash flex-1 select-all">{shown.url}</code><CopyButton text={shown.url} /></div>
          <p class="mt-4 text-sm font-medium">Embed in your admin UI</p>
          <div class="mt-1 flex items-start gap-2 rounded-md border border-line bg-bg p-3"><code class="hash flex-1 select-all">{embed}</code><CopyButton text={embed} /></div>
          <a href={shown.url} target="_blank" rel="noopener" class="btn mt-4">Open viewer</a>
        </Modal>
      )}
    </div>
  );
}
