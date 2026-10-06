import type { APIRoute } from "astro";
import { SITE_URL, API_URL } from "../lib/site";

export const GET: APIRoute = () => new Response(`# AuditKit

> Hosted tamper-evident audit log for B2B SaaS. Events are hash-chained per tenant, acknowledged with Ed25519-signed receipts, batched into Merkle roots, and anchored to Sigstore Rekor and OpenTimestamps. Anyone can verify an export offline with \`npx @auditkit/verify\` without trusting AuditKit. Open source (AGPL); Free tier, Pro $49/mo, Business $199/mo.

AuditKit is a REST API plus an MCP server in the same process. GDPR erasure uses crypto-shredding (per-event salt deleted with the payload) so the chain stays valid after a payload is deleted. The server stores customer client signatures and the verifier checks them; the verifier trusts Rekor's log key and Bitcoin, not AuditKit.

## Docs
- [Quickstart](${SITE_URL}/docs#quickstart): first event in five lines, TypeScript or Python
- [API reference](${SITE_URL}/docs#api): REST, OpenAPI at ${API_URL}/openapi.json
- [Offline verifier](${SITE_URL}/docs#export): how @auditkit/verify checks a JSONL export against Rekor and OTS
- [MCP connector](${SITE_URL}/docs#mcp): seven tools, Streamable HTTP, Claude setup
- [Erasure](${SITE_URL}/docs#erase): crypto-shredding design
- [Viewer tokens](${SITE_URL}/docs#viewer): read-only tenant-scoped links for auditors

## Proof
- [Anchors](${SITE_URL}/anchors): latest anchored roots with Rekor entries, live
- [Security](${SITE_URL}/security): hashing, signing keys, threat model

## Compare
- [WorkOS Audit Logs](${SITE_URL}/compare/workos)
- [Postgres audit tables, cloud ledgers, open source](${SITE_URL}/compare/postgres)

## Optional
- [Pricing](${SITE_URL}/pricing)
- [Blog](${SITE_URL}/blog)
`, { headers: { "content-type": "text/plain; charset=utf-8" } });
