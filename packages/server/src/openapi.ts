// Hand-written OpenAPI 3.1. Small enough to keep by hand; the SDKs are built from it.
const bearer = [{ bearer: [] }];
const event = {
  type: "object",
  required: ["tenant", "actor", "action"],
  properties: {
    tenant: { type: "string", description: "Your tenant/customer identifier" },
    actor: { type: "string" },
    action: { type: "string", example: "invoice.delete" },
    target: { type: ["string", "null"] },
    occurred_at: { type: "string", format: "date-time" },
    payload: { description: "Any JSON. Committed by hash; erasable." },
    idempotency_key: { type: "string" },
    client_sig: { type: "string", description: "base64 Ed25519 signature by the customer's key (optional)" },
  },
} as const;
const receipt = {
  type: "object",
  properties: {
    id: { type: "string" }, tenant: { type: "string" }, position: { type: "integer" },
    event_hash: { type: "string" }, prev_hash: { type: "string" }, server_sig: { type: "string" }, duplicate: { type: "boolean" },
  },
} as const;
const err = { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } } } as const;
const q = (name: string, schema: object, required = false) => ({ name, in: "query", required, schema });

export const openapi = {
  openapi: "3.1.0",
  info: { title: "AuditKit API", version: "2.0.0", description: "Tamper-evident audit log. Events are hash-chained per tenant, signed, and anchored to public logs. Verify offline with @auditkit/verify." },
  servers: [{ url: "https://api.auditkit.dev" }],
  components: { securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "ak_live_... or ak_test_..." } }, schemas: { Event: event, Receipt: receipt, Error: err } },
  paths: {
    "/v1/events": {
      post: { operationId: "logEvent", summary: "Record an audit event", security: bearer, parameters: [{ name: "Idempotency-Key", in: "header", schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } }, responses: { "201": { description: "Receipt", content: { "application/json": { schema: { $ref: "#/components/schemas/Receipt" } } } }, "200": { description: "Duplicate (idempotent replay)" }, "400": { description: "Invalid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } } },
      get: { operationId: "searchEvents", summary: "Search events", security: bearer, parameters: [q("tenant", { type: "string" }), q("actor", { type: "string" }), q("action", { type: "string" }), q("from", { type: "string", format: "date-time" }), q("to", { type: "string", format: "date-time" }), q("limit", { type: "integer", maximum: 500 }), q("cursor", { type: "string" })], responses: { "200": { description: "Page" } } },
    },
    "/v1/events/bulk": { post: { operationId: "logEventsBulk", summary: "Record up to 1000 events in one transaction", security: bearer, requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { events: { type: "array", items: { $ref: "#/components/schemas/Event" }, maxItems: 1000 } } } } } }, responses: { "201": { description: "Receipts" } } } },
    "/v1/events/{id}": { get: { operationId: "getEvent", summary: "Get one event", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Event" }, "404": { description: "Not found" } } } },
    "/v1/events/{id}/proof": { get: { operationId: "getProof", summary: "Merkle path and anchor receipts for an event", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Proof" } } } },
    "/v1/verify": { get: { operationId: "verifyRange", summary: "Server-side chain check for a tenant", security: bearer, parameters: [q("tenant", { type: "string" }, true), q("from", { type: "integer" }), q("to", { type: "integer" })], responses: { "200": { description: "Verdict" } } } },
    "/v1/export": { get: { operationId: "exportEvidence", summary: "JSONL export for offline verification", security: bearer, parameters: [q("tenant", { type: "string" }, true), q("from", { type: "integer" }), q("to", { type: "integer" })], responses: { "200": { description: "application/x-ndjson" } } } },
    "/v1/tenants": { get: { operationId: "listTenants", security: bearer, responses: { "200": { description: "Tenants" } } }, post: { operationId: "createTenant", security: bearer, requestBody: { content: { "application/json": { schema: { type: "object", properties: { external_id: { type: "string" } } } } } }, responses: { "201": { description: "Tenant" } } } },
    "/v1/erase/{id}": { post: { operationId: "erasePayload", summary: "Crypto-shred an event's payload (scope: erase)", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Erased" } } } },
    "/v1/keys": { post: { operationId: "createKey", summary: "Create an API key (scope: admin)", security: bearer, responses: { "201": { description: "Key, shown once" } } } },
    "/v1/keys/{id}": { delete: { operationId: "revokeKey", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Revoked" } } } },
    "/.well-known/auditkit.json": { get: { operationId: "wellKnown", summary: "Server public key and anchoring policy", responses: { "200": { description: "Policy" } } } },
    "/mcp": { post: { operationId: "mcp", summary: "MCP Streamable HTTP endpoint (same Bearer key)", security: bearer, responses: { "200": { description: "JSON-RPC" } } } },
  },
};
