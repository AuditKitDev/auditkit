import { useEffect, useState } from "preact/hooks";
import { api, fmtDate, fmtNum, type Project, type Tenant, type TenantKey } from "../lib/api";
import { ProjectFrame } from "./app";
import { ErrorBox, Loading } from "./ui";

export default function Tenants() {
  return <ProjectFrame title="Tenants">{(p) => <Body p={p} />}</ProjectFrame>;
}

function Body({ p }: { p: Project }) {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [sel, setSel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const load = () => api.projects.tenants(p.id).then((r) => { setTenants(r.tenants); setSel((s) => s || r.tenants[0]?.external_id || ""); }).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  useEffect(() => { void load(); }, [p.id]);
  const tenant = tenants?.find((t) => t.external_id === sel);
  return (
    <div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div>
        <ErrorBox error={error} />
        {!tenants ? <Loading /> : (
          <ul class="card divide-y divide-line" role="listbox" aria-label="Tenants">
            {tenants.map((t) => (
              <li key={t.id}>
                <button type="button" role="option" aria-selected={t.external_id === sel} onClick={() => setSel(t.external_id)} class={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-2 ${t.external_id === sel ? "bg-surface-2" : ""}`}>
                  <span class="font-mono">{t.external_id}</span>
                  <span class="text-xs text-muted">{fmtNum(t.events)} events{t.require_client_sig ? " · signed" : ""}</span>
                </button>
              </li>
            ))}
            {tenants.length === 0 && <li class="px-4 py-8 text-center text-sm text-muted">No tenants yet. A tenant appears with its first event.</li>}
          </ul>
        )}
        <p class="mt-3 text-xs text-faint">A tenant is your customer. Each has its own chain, roots and proofs.</p>
      </div>
      {tenant ? <TenantDetail key={tenant.external_id} p={p} tenant={tenant} onChange={load} /> : <div class="card p-6 text-sm text-muted">Pick a tenant.</div>}
    </div>
  );
}

function TenantDetail({ p, tenant, onChange }: { p: Project; tenant: Tenant; onChange: () => void }) {
  const [keys, setKeys] = useState<TenantKey[] | null>(null);
  const [pub, setPub] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [required, setRequired] = useState<boolean>(!!tenant.require_client_sig);
  const load = () => api.projects.tenantKeys(p.id, tenant.external_id).then((r) => setKeys(r.keys)).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  useEffect(() => { void load(); }, [p.id, tenant.external_id]);
  const active = keys?.filter((k) => !k.revoked_at) ?? [];

  async function add(e: Event) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api.projects.addTenantKey(p.id, tenant.external_id, pub.trim()); setPub(""); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  async function revoke(k: TenantKey) {
    if (!confirm(`Revoke this key? Events signed with it after now will be rejected${required ? ", and with signatures required the tenant cannot log until another key is registered" : ""}.`)) return;
    try { await api.projects.revokeTenantKey(p.id, tenant.external_id, k.id); await load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }
  async function toggle(next: boolean) {
    setBusy(true); setError(null);
    try { await api.projects.setTenantPolicy(p.id, tenant.external_id, next); setRequired(next); onChange(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }

  return (
    <div class="space-y-4">
      <div class="card p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="font-semibold">Tenant <span class="font-mono">{tenant.external_id}</span></h2>
          <p class="text-sm text-muted">{fmtNum(tenant.events)} events · since {fmtDate(tenant.created_at)}</p>
        </div>
        <div class="mt-3 flex flex-wrap gap-2 text-sm">
          <a class="btn btn-sm" href={`/app/projects/${encodeURIComponent(p.id)}/events?tenant=${encodeURIComponent(tenant.external_id)}`}>Events</a>
          <a class="btn btn-sm" href={`/app/projects/${encodeURIComponent(p.id)}/verify`}>Verify</a>
          <a class="btn btn-sm" href={api.projects.exportUrl(p.id, tenant.external_id)} download>Export JSONL</a>
        </div>
      </div>

      <section class="card p-5" aria-labelledby="sk">
        <h2 id="sk" class="font-semibold">Signing keys</h2>
        <p class="mt-1 text-sm text-muted">When set, AuditKit refuses unsigned events for this tenant and verifies every signature against these keys; the SDK signs with your private key, which AuditKit never sees.</p>
        <label class="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" role="switch" aria-checked={required} checked={required} disabled={busy || (!required && active.length === 0)} onChange={(e) => void toggle((e.target as HTMLInputElement).checked)} class="h-4 w-4 accent-[var(--accent)]" />
          <span>Require client signatures{!required && active.length === 0 && <span class="text-faint"> (register a key first)</span>}</span>
          {required && <span class="pill pill-ok">enforced</span>}
        </label>
        <p class="mt-1 text-xs text-faint">With a key registered the server verifies <code>client_sig</code> on every signed event; with the switch on it also rejects events that carry no signature.</p>
        <ErrorBox error={error} />
        {!keys ? <Loading /> : (
          <ul class="mt-4 divide-y divide-line rounded-md border border-line">
            {keys.map((k) => (
              <li key={k.id} class="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <code class="hash flex-1 text-xs">{k.public_key}</code>
                <span class="text-xs text-muted">{fmtDate(k.created_at)}</span>
                {k.revoked_at ? <span class="pill pill-danger">revoked</span> : <><span class="pill pill-ok">active</span><button type="button" class="btn btn-sm btn-danger" onClick={() => void revoke(k)}>Revoke</button></>}
              </li>
            ))}
            {keys.length === 0 && <li class="px-3 py-6 text-center text-sm text-muted">No keys registered. Unsigned events are accepted; signed ones are stored and left to the offline verifier.</li>}
          </ul>
        )}
        <form onSubmit={add} class="mt-4">
          <label class="block text-sm">Register a public key <span class="text-faint">(Ed25519, base64 DER SPKI)</span>
            <textarea class="field mt-1 font-mono text-xs" rows={2} required value={pub} onInput={(e) => setPub((e.target as HTMLTextAreaElement).value)} placeholder="MCowBQYDK2VwAyEA…" />
          </label>
          <div class="mt-2 flex items-center gap-3">
            <button type="submit" class="btn btn-primary btn-sm" disabled={busy}>Register key</button>
            <code class="text-xs text-faint">openssl genpkey -algorithm ed25519 | tee key.pem | openssl pkey -pubout -outform DER | base64 -w0</code>
          </div>
        </form>
      </section>
    </div>
  );
}
