import { useEffect, useState } from "preact/hooks";
import { api, type Project, type Tenant, type Verdict } from "../lib/api";
import { ProjectFrame } from "./app";
import { ErrorBox, Loading, VerdictView } from "./ui";

export default function Verify() {
  return <ProjectFrame title="Verify">{(p) => <Body p={p} />}</ProjectFrame>;
}
function Body({ p }: { p: Project }) {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [tenant, setTenant] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.projects.tenants(p.id).then((r) => { setTenants(r.tenants); setTenant((t) => t || r.tenants[0]?.external_id || ""); }).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e))); }, [p.id]);

  async function run(e: Event) {
    e.preventDefault(); setBusy(true); setError(null); setVerdict(null);
    try { setVerdict(await api.projects.verify(p.id, tenant, from ? Number(from) : undefined, to ? Number(to) : undefined)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  const t = tenants?.find((x) => x.external_id === tenant);
  return (
    <div class="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form onSubmit={run} class="card h-fit p-5">
        <h2 class="font-semibold">Server-side chain check</h2>
        <p class="mt-1 text-xs text-muted">Re-hashes the tenant's events and walks the chain on the server. Convenient; the offline verifier is the one your auditor should run.</p>
        {!tenants ? <Loading /> : (
          <>
            <label class="mt-4 block text-sm">Tenant
              <select class="field mt-1" value={tenant} onChange={(e) => setTenant((e.target as HTMLSelectElement).value)} required>
                {tenants.map((x) => <option key={x.id} value={x.external_id}>{x.external_id} · {x.events} events</option>)}
              </select>
            </label>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <label class="text-sm">From position<input type="number" min={0} class="field mt-1" value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} placeholder="0" /></label>
              <label class="text-sm">To position<input type="number" min={0} class="field mt-1" value={to} onInput={(e) => setTo((e.target as HTMLInputElement).value)} placeholder={t ? String(Math.max(0, t.events - 1)) : "head"} /></label>
            </div>
            <button type="submit" class="btn btn-primary mt-4 w-full" disabled={busy || !tenant}>{busy ? "Verifying…" : "Run verify"}</button>
            <a class="btn mt-2 w-full" href={tenant ? api.projects.exportUrl(p.id, tenant) : "#"} aria-disabled={!tenant} download>Export JSONL for offline verification</a>
          </>
        )}
      </form>
      <div class="space-y-4">
        <ErrorBox error={error} />
        {verdict ? <div class="card p-5"><VerdictView v={verdict} /></div> : <div class="card p-5 text-sm text-muted">Pick a tenant and run verify. The result shows the head hash, how far the chain is covered by a Merkle root (rooted) and how far those roots are publicly anchored (anchored).</div>}
        <div class="card p-5 text-sm">
          <p class="font-medium">Verify offline</p>
          <pre class="mt-2 rounded border border-line bg-bg p-3 text-xs">{`npx @auditkit/verify auditkit-${p.id}-${tenant || "<tenant>"}.jsonl --pin <server public key>\n# server key: GET /.well-known/auditkit.json`}</pre>
          <p class="mt-2 text-xs text-faint">Exit 0 VALID, 2 VALID_UNANCHORED (chain and signatures hold, no anchors yet), 1 INVALID.</p>
        </div>
      </div>
    </div>
  );
}
