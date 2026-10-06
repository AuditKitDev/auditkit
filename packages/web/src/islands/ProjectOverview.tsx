import { useState } from "preact/hooks";
import { api, fmtDate, fmtNum, HttpError, type Project } from "../lib/api";
import { LIMITS } from "../lib/plans";
import { ProjectFrame } from "./app";
import { AnchorPills, ErrorBox } from "./ui";

const cadence = (s: number) => (s >= 86_400 ? `every ${Math.round(s / 86_400)} day${s >= 172_800 ? "s" : ""}` : s >= 3600 ? `every ${Math.round(s / 3600)} h` : `every ${Math.round(s / 60)} min`);

export default function ProjectOverview() {
  return <ProjectFrame title="Overview">{(p, reload) => <Body p={p} reload={reload} />}</ProjectFrame>;
}

function Body({ p, reload }: { p: Project; reload: () => void }) {
  const [billing, setBilling] = useState<{ busy: boolean; notice: string | null; error: string | null }>({ busy: false, notice: null, error: null });
  const pct = Math.min(100, Math.round((p.usage.events_this_month / p.usage.limit_events) * 100));
  const upgraded = new URLSearchParams(location.search).get("billing") === "success";

  async function checkout(plan: "pro" | "business") {
    setBilling({ busy: true, notice: null, error: null });
    try { const { url } = await api.projects.checkout(p.id, plan); location.href = url; }
    catch (e) {
      if (e instanceof HttpError && e.status === 501) setBilling({ busy: false, notice: "Billing is not configured on this server yet. Email support to change plans; nothing was charged.", error: null });
      else setBilling({ busy: false, notice: null, error: e instanceof Error ? e.message : String(e) });
    }
  }
  async function portal() {
    setBilling({ busy: true, notice: null, error: null });
    try { const { url } = await api.projects.portal(p.id); location.href = url; }
    catch (e) {
      if (e instanceof HttpError && e.status === 501) setBilling({ busy: false, notice: "Billing is not configured on this server yet.", error: null });
      else setBilling({ busy: false, notice: null, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div class="grid gap-4 lg:grid-cols-3">
      {upgraded && <p class="card border-accent/40 bg-accent-dim p-4 text-sm lg:col-span-3" role="status">Payment received. The plan updates when Stripe's webhook lands, usually within a minute. <button type="button" class="underline" onClick={reload}>Refresh</button></p>}
      <section class="card p-5">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-faint">Usage this month</h2>
        <p class="mt-2 text-3xl font-semibold tracking-tight">{fmtNum(p.usage.events_this_month)}</p>
        <p class="text-sm text-muted">of {fmtNum(p.usage.limit_events)} events</p>
        <div class="mt-3 h-1.5 w-full overflow-hidden rounded bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div class={`h-full ${pct > 90 ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} /></div>
        <p class="mt-3 text-xs text-faint">Writes past the limit return <code>429 plan_limit</code>. Reads keep working.</p>
      </section>
      <section class="card p-5">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-faint">Plan</h2>
        <p class="mt-2 text-3xl font-semibold capitalize tracking-tight">{p.plan}</p>
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt class="text-faint">Payload retention</dt><dd>{p.usage.retention_days} days</dd>
          <dt class="text-faint">Anchor cadence</dt><dd>{cadence(p.usage.anchor_interval_seconds)}</dd>
        </dl>
        <div class="mt-4 flex flex-wrap gap-2">
          {p.plan === "free" && <button type="button" class="btn btn-primary btn-sm" disabled={billing.busy} onClick={() => void checkout("pro")}>Upgrade to Pro · ${LIMITS.pro.price}/mo</button>}
          {p.plan !== "business" && <button type="button" class="btn btn-sm" disabled={billing.busy} onClick={() => void checkout("business")}>{p.plan === "free" ? "Business" : "Upgrade to Business"} · ${LIMITS.business.price}/mo</button>}
          {p.plan !== "free" && <button type="button" class="btn btn-sm" disabled={billing.busy} onClick={() => void portal()}>Manage billing</button>}
        </div>
        {billing.notice && <p class="mt-3 rounded-md border border-warn/40 bg-warn-dim px-3 py-2 text-xs text-warn" role="status">{billing.notice}</p>}
        <div class="mt-3"><ErrorBox error={billing.error} /></div>
      </section>
      <section class="card p-5">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-faint">Last anchor</h2>
        {p.last_anchor ? (
          <>
            <p class="hash mt-2">{p.last_anchor.global_root}</p>
            {p.last_anchor.created_at && <p class="mt-1 text-sm text-muted">{fmtDate(p.last_anchor.created_at)}</p>}
            <div class="mt-3"><AnchorPills anchors={p.last_anchor.anchors} /></div>
          </>
        ) : <p class="mt-2 text-sm text-muted">No root yet. Log an event and wait for the next tick ({cadence(p.usage.anchor_interval_seconds)}).</p>}
        <a href="/anchors" class="mt-4 inline-block text-xs text-accent underline">All public anchors</a>
      </section>
      <section class="card p-5 lg:col-span-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-faint">Next steps</h2>
        <ol class="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <li class="rounded-md border border-line p-3"><a href={`/app/projects/${encodeURIComponent(p.id)}/keys`} class="font-medium text-accent underline">Create an API key</a><p class="mt-1 text-muted">Start with a test key; it works with the SDKs and the MCP connector.</p></li>
          <li class="rounded-md border border-line p-3"><a href="/docs#quickstart" class="font-medium text-accent underline">Log your first event</a><p class="mt-1 text-muted">Keep the receipt. A later verify proves we never dropped it.</p></li>
          <li class="rounded-md border border-line p-3"><a href={`/app/projects/${encodeURIComponent(p.id)}/verify`} class="font-medium text-accent underline">Export and verify</a><p class="mt-1 text-muted">Hand the JSONL to your auditor with <code>npx @auditkit/verify</code>.</p></li>
        </ol>
      </section>
    </div>
  );
}
