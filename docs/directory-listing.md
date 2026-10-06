# AuditKit: Claude Connectors Directory submission

Prepared 2026-10-05. Portal: https://claude.ai/directory/manage (MCP connector). Re-fetched https://claude.com/docs/connectors/building/submission and /authentication on 2026-10-05.

## Changes since the brief

- Submitting needs "any paid Claude plan" (brief said Pro or Max). Fine.
- Portal steps confirmed: Listing limits unchanged (name 100, one-liner 200, description 2,000, 1-5 categories, slug permanent). The seven acknowledgments are unchanged.
- **Auth is stricter than the brief says.** The authentication page lists `custom_connection` as OAuth client ID/secret entered at connection time, and requires emailing mcp-review@anthropic.com to enable it. A plain API-key header (`static_headers`) is "Beta, for a limited set of organizations", and the key is entered by an organization Owner. No self-serve "paste an API key" path is documented. [OWNER: email mcp-review@anthropic.com asking to list a bearer-key (`ak_live_`) server, or accept building OAuth 2.0 (DCR/CIMD) first. Do this before submitting.]
- Portal also asks for: company name/website, primary contact, data-handling answers (own API; no personal health data; no sponsored content), use cases. Entries below cover them.
- Category list has no "Security". See Categories.

## Name (<=100)

AuditKit: Tamper-Evident Audit Logs

## One-liner (<=200)

Search, verify and export your SaaS audit log from Claude, with proofs checked against public logs (Sigstore Rekor, OpenTimestamps) and an offline verifier.

## Description (<=2,000)

AuditKit stores audit events for your product's tenants in a hash chain. Each event is signed when it is recorded. Merkle roots are anchored to two public logs the operator cannot edit: Sigstore Rekor and OpenTimestamps.

This connector gives Claude read access to your AuditKit project, plus one tool to record an event.

Ask Claude:
- "What did admin jsmith do in tenant acme last week?"
- "Prove event 01J... wasn't altered."
- "Export the evidence for the auditor for tenant globex, January."

What you get:
- Public anchoring. get_proof returns the Merkle path from an event to an anchored root and the Rekor and OpenTimestamps receipts. Events newer than the last anchor run are reported as not yet anchored.
- Offline verifier. export_evidence produces a JSONL file that `npx @auditkit/verify` checks on your machine, without calling AuditKit.
- Crypto-shredding. A payload can be erased on a data-subject request. The event, chain, roots and anchors stay valid.

Tools: search_events, get_event, get_proof, verify_range, list_tenants, export_evidence (all read-only) and log_event (appends an event; cannot be undone).

You need an AuditKit account and a project API key. Events and payloads returned to Claude are your own log data. AuditKit does not collect your conversations.

(about 1,350 characters)

## Categories

1. Developer tools
2. Data & analytics
3. Legal [OWNER: drop if you think it reads as a compliance claim; list is: Commerce & shopping, Communication, Consumer health, Creative, Data & analytics, Developer tools, Education, Financial services, Health & life sciences, Legal, Media & entertainment, Nonprofit, Other, Productivity, Sales & marketing, Travel. Fetched from claude.com/connectors; the awesome-claude-connectors mirror's "Security" category is not in that filter.]

## Listing details

- Documentation: https://auditkit.dev/docs
- Privacy: https://auditkit.dev/privacy
- Support: support@auditkit.dev [OWNER: confirm mailbox]
- Terms: https://auditkit.dev/terms
- MCP endpoint: https://api.auditkit.dev/mcp (Streamable HTTP, stateless)
- Icon: `packages/web/public/icon.svg` (two interlocked chain links, monochrome, no text) [OWNER: portal may need PNG; export 512x512 if so]
- Slug: `auditkit` [OWNER: permanent; confirm]
- Company name/website: [OWNER: legal name] / https://auditkit.dev
- Data handling: own API; no personal health data; no sponsored content. Reads and writes (log_event).

## Authentication

Mode: custom connection, API key (see "Changes": needs Anthropic approval).

User steps:
1. Sign in at https://auditkit.dev/login and open the dashboard.
2. API keys > Create key. Choose scopes: `read` for search/verify/export, add `write` only to allow log_event.
3. Copy the key (`ak_live_...`; shown once).
4. In Claude: Settings > Connectors > Add custom connector. URL `https://api.auditkit.dev/mcp`. Paste the key as the bearer credential.
5. Ask "list my tenants" to confirm.

Keys without the needed scope get `{"error":"key lacks read scope"}` or `write scope` from tools.

## Reviewer test account

Provide in the portal Test & launch step:
- Endpoint https://api.auditkit.dev/mcp and an `ak_test_...` key with `read` and `write` scopes, in a dedicated seeded project [OWNER: create the project and key; no seed script exists in the repo yet].
- Seed: tenants `acme` and `globex`; about 200 events over the last 30 days (mixed actors and actions such as user.login, role.update, export.download); several anchored roots with Rekor and OpenTimestamps receipts; one event with its payload erased (get_event shows it erased; verify_range still returns valid:true).
- Reviewer script: list_tenants; search_events tenant=acme limit=5; get_event on a result; get_proof on an anchored event; verify_range tenant=acme; export_evidence tenant=globex; log_event once (adds a test event).

## Tools (as in packages/server/src/mcp.ts)

All have `title`. Read-only = readOnlyHint true, destructiveHint false, idempotentHint true, openWorldHint false.

| Name | Title | Annotations | Description | Example prompt |
|---|---|---|---|---|
| search_events | Search audit events | read-only | Search by tenant, actor, action (suffix * allowed), time range; newest first | "What did admin jsmith do in tenant acme last week?" |
| get_event | Get one audit event | read-only | One event by id, with payload unless erased | "Show event 01J..." |
| get_proof | Get tamper-evidence proof for an event | read-only | Merkle path to the anchored root plus Rekor and OpenTimestamps receipts | "Prove this event wasn't altered." |
| verify_range | Verify chain integrity for a tenant | read-only | Re-hashes events; valid with head hash and last anchored position, or first bad position | "Verify acme's chain for the whole quarter." |
| list_tenants | List tenants | read-only | Tenants with event counts | "Which tenants do I have?" |
| export_evidence | Export verifier-ready evidence | read-only | JSONL for `npx @auditkit/verify`; truncated at 2000 lines | "Export evidence for the auditor for globex." |
| log_event | Record an audit event | readOnly false, destructive false, idempotent false | Appends an event, returns a signed receipt; cannot be undone | "Log that I approved the refund for tenant acme." |

Note: log_event is a write with no `destructiveHint: true`; it appends only, so false is accurate.

## Compliance acknowledgments

1. Directory guidelines: yes; we will follow the Software Directory Terms and Policy.
2. First-party API: yes. The connector calls our own API only; no third-party API is proxied (Rekor and OTS are contacted by our anchor job, not on behalf of a tool call).
3. Financial transactions: none. No tool moves money.
4. AI media generation: none.
5. Prompt injection: tool outputs are the user's own log data (actor, action, payload fields) and may contain arbitrary text they or their users wrote; we return it as JSON data and never as instructions, and the server takes no action from output content.
6. Conversation data: we collect none. We see only tool arguments and keys' request metadata needed to serve calls.
7. Public documentation: https://auditkit.dev/docs and the privacy and terms pages are public.

## Pre-submission checklist

- [ ] Auth path settled with mcp-review@anthropic.com (key header, or OAuth built).
- [ ] https://api.auditkit.dev/mcp live over HTTPS; POST without key returns 401.
- [ ] Each of the seven tools run from Claude.ai as a custom connector, including log_event and a scope-denied call.
- [ ] Dashboard health: anchor job running, /anchors shows recent Rekor and OTS entries.
- [ ] Seeded reviewer project and `ak_test_` key created; script above passes.
- [ ] docs, privacy, terms, support pages live with filled [OWNER] fields (legal name, jurisdiction, data location).
- [ ] Icon, slug (permanent) chosen.
- [ ] Review step warnings read before submitting.

## Positioning source notes (fetched claims only)

Sigstore Rekor: "an immutable, tamper-resistant ledger" with inclusion proofs (docs.sigstore.dev/logging/overview/, fetched 2026-10-06, per docs/research/buyer-need.md). WorkOS audit logs make no integrity claim on their pricing or product page (same file). Nobody ranking explains external anchoring (docs/research/seo-geo-aeo.md). The listing makes no compliance or market-position claim.
