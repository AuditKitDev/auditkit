// MCP over Streamable HTTP, stateless: a fresh server+transport per request,
// bound to the API key's project. Same process, same data, same auth as REST.
import type { Context } from "hono";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { DatabaseSync } from "node:sqlite";
import type { Deps } from "./app.js";
import type { Principal } from "./keys.js";
import { ingest, search, getEvent, verifyRange, exportLines, listTenants } from "./events.js";
import { anchorsFor, proofForEvent } from "./anchorLoop.js";

const text = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function buildMcp(deps: Deps, principal: Principal, db: DatabaseSync): McpServer {
  const server = new McpServer({ name: "auditkit", version: "2.0.0" }, { instructions: "Tamper-evident audit log. Events are hash-chained per tenant and anchored to public logs; use get_proof or verify_range to check integrity." });
  const can = (scope: "read" | "write") => principal.scopes.has("admin") || principal.scopes.has(scope);

  server.registerTool(
    "search_events",
    {
      title: "Search audit events",
      description: "Search audit events by tenant, actor, action (suffix * allowed), and time range. Newest first.",
      inputSchema: {
        tenant: z.string().optional(), actor: z.string().optional(), action: z.string().optional(),
        from: z.string().optional().describe("ISO 8601 inclusive"), to: z.string().optional().describe("ISO 8601 exclusive"),
        limit: z.number().int().min(1).max(200).optional(), cursor: z.string().optional(),
      },
      annotations: RO,
    },
    async (args) => {
      if (!can("read")) return text({ error: "key lacks read scope" });
      const q: Parameters<typeof search>[1] = {};
      for (const k of ["tenant", "actor", "action", "from", "to", "cursor"] as const) if (args[k]) q[k] = args[k];
      if (args.limit) q.limit = args.limit;
      return text(search(db, q));
    },
  );

  server.registerTool(
    "get_event",
    { title: "Get one audit event", description: "Fetch one event by id, including its payload unless erased.", inputSchema: { event_id: z.string() }, annotations: RO },
    async ({ event_id }) => (can("read") ? text(getEvent(db, event_id) ?? { error: "not found" }) : text({ error: "key lacks read scope" })),
  );

  server.registerTool(
    "get_proof",
    {
      title: "Get tamper-evidence proof for an event",
      description: "Merkle path from the event to the anchored global root, plus the public-log anchor receipts (Rekor, OpenTimestamps). Anchored=false means the event is newer than the last anchor tick.",
      inputSchema: { event_id: z.string() },
      annotations: RO,
    },
    async ({ event_id }) => (can("read") ? text(proofForEvent(db, deps.reg, event_id) ?? { error: "not found" }) : text({ error: "key lacks read scope" })),
  );

  server.registerTool(
    "verify_range",
    {
      title: "Verify chain integrity for a tenant",
      description: "Re-hash a tenant's events and walk the chain. Returns valid:true with the head hash and the last anchored position, or the first bad position and why.",
      inputSchema: { tenant: z.string(), from: z.number().int().min(0).optional(), to: z.number().int().min(0).optional() },
      annotations: RO,
    },
    async ({ tenant, from, to }) => (can("read") ? text(verifyRange(db, principal.projectId, tenant, from, to, (id) => anchorsFor(deps.reg, id).length > 0)) : text({ error: "key lacks read scope" })),
  );

  server.registerTool(
    "list_tenants",
    { title: "List tenants", description: "Tenants in this project with event counts.", inputSchema: {}, annotations: RO },
    async () => (can("read") ? text(listTenants(db)) : text({ error: "key lacks read scope" })),
  );

  server.registerTool(
    "export_evidence",
    {
      title: "Export verifier-ready evidence",
      description: "JSONL export for a tenant and position range, verifiable offline with `npx @auditkit/verify`. Large ranges are truncated to 2000 lines here; use the REST /v1/export for full files.",
      inputSchema: { tenant: z.string(), from: z.number().int().min(0).optional(), to: z.number().int().min(0).optional() },
      annotations: RO,
    },
    async ({ tenant, from, to }) => {
      if (!can("read")) return text({ error: "key lacks read scope" });
      const out: string[] = [];
      for (const line of exportLines(db, principal.projectId, tenant, deps.signer, (id) => anchorsFor(deps.reg, id), deps.cfg.publicHost ?? "localhost", from, to)) {
        out.push(JSON.stringify(line));
        if (out.length >= 2000) { out.push('{"type":"truncated"}'); break; }
      }
      return text(out.join("\n"));
    },
  );

  server.registerTool(
    "log_event",
    {
      title: "Record an audit event",
      description: "Append an event to a tenant's chain. Returns a signed receipt (position, event_hash, server_sig). Cannot be undone; the payload can later be erased but the event stays.",
      inputSchema: {
        tenant: z.string(), actor: z.string(), action: z.string(), target: z.string().optional(),
        occurred_at: z.string().optional(), payload: z.record(z.unknown()).optional(), idempotency_key: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      if (!can("write")) return text({ error: "key lacks write scope" });
      const [r] = ingest(db, principal.projectId, deps.signer, [{ ...args, target: args.target ?? null }]);
      return text(r);
    },
  );

  return server;
}

export async function mcpHandler(c: Context<{ Variables: { principal: Principal; db: DatabaseSync } }>, deps: Deps): Promise<Response> {
  const server = buildMcp(deps, c.get("principal"), c.get("db"));
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true }); // no sessionIdGenerator: stateless
  await server.connect(transport);
  try {
    return await transport.handleRequest(c.req.raw);
  } finally {
    queueMicrotask(() => { void transport.close(); void server.close(); });
  }
}
