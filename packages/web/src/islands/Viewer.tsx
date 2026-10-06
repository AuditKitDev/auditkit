import { useEffect, useState } from "preact/hooks";
import { api, HttpError, type Verdict, type ViewerMe } from "../lib/api";
import { VERIFY_CLI_NOTE } from "../lib/snippets";
import EventTable from "./EventTable";
import { ErrorBox, Loading, VerdictView } from "./ui";

export default function Viewer() {
  const [token] = useState(() => new URLSearchParams(location.search).get("token") ?? "");
  const [me, setMe] = useState<ViewerMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const v = api.viewer(token);
  useEffect(() => {
    if (!token) return setError("No viewer token in the URL. Ask the project owner for a link that looks like /viewer?token=vt_…");
    v.me().then(setMe).catch((e: unknown) => setError(e instanceof HttpError && e.status === 401 ? "This viewer link is invalid, expired or revoked. Ask the project owner for a new one." : e instanceof Error ? e.message : String(e)));
  }, [token]);
  async function verify() {
    setBusy(true);
    try { setVerdict(await v.verify()); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  if (error) return <ErrorBox error={error} />;
  if (!me) return <Loading what="Opening viewer" />;
  return (
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">Audit log · <span class="font-mono">{me.tenant}</span></h1>
          <p class="text-sm text-muted">Project <span class="font-mono">{me.project_id}</span> · read-only view</p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn" onClick={() => void verify()} disabled={busy}>{busy ? "Verifying…" : "Verify chain"}</button>
          <a href={v.exportUrl} class="btn btn-primary" download>Export JSONL</a>
        </div>
      </div>
      {verdict && <div class="card p-4"><VerdictView v={verdict} /></div>}
      <EventTable fetchPage={(q) => v.events(q)} fetchProof={(id) => v.proof(id)} fetchVerify={() => v.verify()} fixedTenant />
      <p class="text-xs text-faint">Verify the export yourself with <code>@auditkit/verify</code>; it needs no access to AuditKit. {VERIFY_CLI_NOTE}</p>
    </div>
  );
}
