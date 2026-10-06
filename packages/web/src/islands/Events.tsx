import { useEffect, useState } from "preact/hooks";
import { api, type Project } from "../lib/api";
import { ProjectFrame } from "./app";
import EventTable from "./EventTable";

export default function Events() {
  return <ProjectFrame title="Events">{(p) => <Body p={p} />}</ProjectFrame>;
}
function Body({ p }: { p: Project }) {
  const [tenants, setTenants] = useState<string[] | undefined>(undefined);
  useEffect(() => { api.projects.tenants(p.id).then((r) => setTenants(r.tenants.map((t) => t.external_id))).catch(() => setTenants(undefined)); }, [p.id]);
  return <EventTable fetchPage={(q) => api.projects.events(p.id, q)} fetchProof={(id) => api.projects.proof(p.id, id)} {...(tenants ? { tenants } : {})} />;
}
