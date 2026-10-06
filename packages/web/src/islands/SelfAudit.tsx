import { useEffect, useState } from "preact/hooks";
import { api, type Verdict } from "../lib/api";
import { VERIFY_CMD_REPO } from "../lib/snippets";
import EventTable from "./EventTable";
import { ErrorBox, Loading, VerdictView } from "./ui";

export default function SelfAudit() {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.self.verify().then(setVerdict).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e))); }, []);
  return (
    <div class="space-y-6">
      <section class="card p-4" aria-label="Verify status">
        <p class="mb-2 text-xs uppercase tracking-wider text-faint">live verify status</p>
        <ErrorBox error={error} />
        {!verdict && !error && <Loading what="Verifying the platform chain" />}
        {verdict && (
          <>
            <p class="mb-3 font-mono text-sm" role="status">
              {verdict.valid
                ? <><span class="font-semibold text-accent">VALID</span> · anchored through {verdict.anchored_through < 0 ? "none yet" : `#${verdict.anchored_through}`}</>
                : <span class="font-semibold text-danger">INVALID</span>}
            </p>
            <VerdictView v={verdict} />
          </>
        )}
      </section>
      <section>
        <h2 class="mb-3 text-xl font-semibold">Latest platform events</h2>
        <EventTable fetchPage={(q) => api.self.events(q)} fetchProof={(id) => api.self.proof(id)} fetchVerify={() => api.self.verify()} fixedTenant />
      </section>
      <section class="card space-y-3 p-4">
        <h2 class="text-xl font-semibold">Verify it yourself</h2>
        <p class="text-sm text-muted">Download the whole platform chain and check it offline. The verifier needs no access to AuditKit.</p>
        <a href={api.self.exportUrl} class="btn btn-primary inline-block" download>Export evidence</a>
        <pre class="overflow-x-auto rounded border border-line bg-bg p-3 text-xs"><code>{`curl -o auditkit-platform.ndjson ${typeof location !== "undefined" ? location.origin : ""}${api.self.exportUrl}\n${VERIFY_CMD_REPO} auditkit-platform.ndjson`}</code></pre>
      </section>
    </div>
  );
}
