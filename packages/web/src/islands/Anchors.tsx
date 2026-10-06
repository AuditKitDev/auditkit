import { useEffect, useState } from "preact/hooks";
import { api, fmtDate, fmtNum, type PublicAnchor, type PublicStats } from "../lib/api";
import { ErrorBox, Loading, RekorPill } from "./ui";

export default function Anchors() {
  const [anchors, setAnchors] = useState<PublicAnchor[] | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.public.anchors(50).then((r) => setAnchors(r.anchors)).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    api.public.stats().then(setStats).catch(() => undefined);
  }, []);
  return (
    <div class="space-y-6">
      {stats && (
        <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([["events logged", stats.events_total], ["global roots", stats.roots_total], ["final anchors", stats.anchors_final], ["projects", stats.projects]] as const).map(([k, n]) => (
            <div key={k} class="card p-4"><dt class="text-xs uppercase tracking-wider text-faint">{k}</dt><dd class="mt-1 text-2xl font-semibold tracking-tight">{fmtNum(n)}</dd></div>
          ))}
        </dl>
      )}
      <ErrorBox error={error} />
      {!anchors ? <Loading what="Fetching anchors" /> : anchors.length === 0 ? <p class="card p-6 text-sm text-muted">No roots published yet.</p> : (
        <div class="card overflow-x-auto">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="border-b border-line text-left text-xs uppercase tracking-wider text-faint"><tr><th class="px-3 py-2 font-medium">created</th><th class="px-3 py-2 font-medium">global root</th><th class="px-3 py-2 font-medium">projects</th><th class="px-3 py-2 font-medium">Rekor</th><th class="px-3 py-2 font-medium">OpenTimestamps</th></tr></thead>
            <tbody>
              {anchors.map((a) => {
                const rekor = a.receipts.find((r) => r.kind === "rekor");
                const ots = a.receipts.find((r) => r.kind === "ots");
                return (
                  <tr key={a.global_root} class="border-b border-line last:border-0 align-top">
                    <td class="whitespace-nowrap px-3 py-2 text-muted">{fmtDate(a.created_at)}</td>
                    <td class="px-3 py-2"><code class="hash">{a.global_root}</code></td>
                    <td class="px-3 py-2 text-muted">{a.projects}</td>
                    <td class="px-3 py-2">{rekor ? <RekorPill refStr={rekor.ref} suffix=" · final" /> : <span class="pill pill-warn">pending</span>}</td>
                    <td class="px-3 py-2">{ots ? <span class={`pill ${ots.status === "final" ? "pill-ok" : "pill-warn"}`}>{ots.status === "final" ? "bitcoin confirmed" : "calendar stamped · bitcoin pending"}</span> : <span class="pill pill-warn">pending</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
