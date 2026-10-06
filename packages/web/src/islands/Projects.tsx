import { useEffect, useState } from "preact/hooks";
import { api, fmtNum, type ProjectSummary } from "../lib/api";
import { useSession } from "./app";
import { ErrorBox, Loading } from "./ui";

export default function Projects() {
  const { user, error: sessionError } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const load = () => api.projects.list().then((r) => setProjects(r.projects)).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  useEffect(() => { if (user) void load(); }, [user]);

  async function create(e: Event) {
    e.preventDefault();
    setCreating(true); setError(null);
    try { const p = await api.projects.create(name.trim()); location.href = `/app/projects/${encodeURIComponent(p.id)}`; }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setCreating(false); }
  }

  return (
    <div>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><h1 class="text-2xl font-semibold">Projects</h1>{user && <p class="text-sm text-muted">Signed in as {user.email}</p>}</div>
        <form onSubmit={create} class="flex gap-2">
          <label class="sr-only" for="new-project">New project name</label>
          <input id="new-project" class="field w-56" required minLength={2} maxLength={64} placeholder="New project name" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          <button type="submit" class="btn btn-primary" disabled={creating}>{creating ? "Creating…" : "Create"}</button>
        </form>
      </div>
      <div class="mt-6"><ErrorBox error={sessionError ?? error} /></div>
      {!projects ? <Loading /> : projects.length === 0 ? <p class="card mt-4 p-6 text-sm text-muted">No projects yet. Create one above.</p> : (
        <ul class="mt-4 grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const pct = Math.min(100, Math.round((p.events_this_month / p.limit_events) * 100));
            return (
              <li key={p.id}>
                <a href={`/app/projects/${encodeURIComponent(p.id)}`} class="card block p-5 transition-colors hover:border-fg-faint">
                  <div class="flex items-center justify-between gap-3">
                    <h2 class="truncate font-semibold">{p.name}</h2>
                    <span class="pill">{p.plan}</span>
                  </div>
                  <p class="mt-1 font-mono text-xs text-faint">{p.id} · {p.role}</p>
                  <p class="mt-4 text-sm text-muted">{fmtNum(p.events_this_month)} of {fmtNum(p.limit_events)} events this month</p>
                  <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Monthly usage">
                    <div class={`h-full ${pct > 90 ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
