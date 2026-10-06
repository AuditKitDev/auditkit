// Shared bits for the signed-in dashboard islands.
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { api, projectIdFromUrl, requireUser, type Project, type User } from "../lib/api";
import { ErrorBox, Loading } from "./ui";

export function useSession(): { user: User | null; error: string | null } {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { requireUser().then(setUser).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e))); }, []);
  return { user, error };
}

export function useProject(): { id: string | null; project: Project | null; error: string | null; reload: () => void } {
  const { user, error: sessionError } = useSession();
  const [id] = useState(() => projectIdFromUrl());
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user || !id) return;
    api.projects.get(id).then(setProject).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [user, id, n]);
  return { id, project, error: sessionError ?? error ?? (id ? null : "No project id in the URL."), reload: () => setN((x) => x + 1) };
}

const tabs = (id: string) => [["", "Overview"], ["/events", "Events"], ["/tenants", "Tenants"], ["/keys", "API keys"], ["/viewer-tokens", "Viewer tokens"], ["/verify", "Verify"]].map(([s, l]) => [`/app/projects/${encodeURIComponent(id)}${s}`, l] as const);

export function ProjectFrame({ title, children }: { title: string; children: (p: Project, reload: () => void) => ComponentChildren }) {
  const { id, project, error, reload } = useProject();
  const path = typeof location !== "undefined" ? location.pathname.replace(/\/$/, "") : "";
  if (error) return <ErrorBox error={error} />;
  if (!id || !project) return <Loading what="Loading project" />;
  return (
    <div>
      <nav class="mb-1 text-sm text-muted" aria-label="Breadcrumb"><a href="/app" class="hover:text-fg">Projects</a> <span class="text-faint">/</span> <span class="text-fg">{project.name}</span></nav>
      <h1 class="text-2xl font-semibold">{title}</h1>
      <nav class="mt-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Project sections">
        {tabs(id).map(([href, label]) => {
          const active = path === href;
          return <a key={href} href={href} aria-current={active ? "page" : undefined} class={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>{label}</a>;
        })}
      </nav>
      <div class="mt-6">{children(project, reload)}</div>
    </div>
  );
}
