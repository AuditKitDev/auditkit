# AuditKit: Claude Connectors Directory submission

Prepared 2026-10-05. Portal: https://claude.ai/directory/manage (MCP connector). Re-fetched https://claude.com/docs/connectors/building/submission and /authentication on 2026-10-05.

## Changes since the brief

- Submitting needs "any paid Claude plan" (brief said Pro or Max). Fine.
- Portal steps confirmed: Listing limits unchanged (name 100, one-liner 200, description 2,000, 1-5 categories, slug permanent). The seven acknowledgments are unchanged.
- **Auth:** the server now implements OAuth 2.1, which is the directory's default path (`oauth_dcr`), so no special approval is needed. The earlier API-key plan (`custom_connection` / `static_headers`) is dropped.
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

You need an AuditKit account; you sign in with your email and choose which project to share. Events and payloads returned to Claude are your own log data. AuditKit does not collect your conversations.

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

Mode: OAuth 2.0 (authorization code + PKCE S256, dynamic client registration). Public clients; no client secret needed. [Portal: choose "OAuth with dynamic client registration".]

Server behavior (packages/server/src/oauth.ts):
- `/mcp` without a token returns 401 with `WWW-Authenticate: Bearer resource_metadata=...`.
- Discovery: `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`.
- `/oauth/register` (DCR; https or localhost redirect URIs), `/oauth/authorize`, `/oauth/token` (refresh-token rotation), `/oauth/revoke`.
- Redirect URI Claude uses: `https://claude.ai/api/mcp/auth_callback`; Claude Code uses a loopback port.

User steps:
1. In Claude: Settings > Connectors > AuditKit > Connect (or add custom connector with URL `https://api.auditkit.dev/mcp`).
2. Sign in at AuditKit with your email (magic link).
3. On the consent page, pick the project and review the scopes: read, write, erase. Approve.
4. Ask "list my tenants" to confirm.

Disconnect any time in Claude, or revoke access from the AuditKit dashboard. Tools return `{"error":"key lacks read scope"}` (or write) if the granted scope is too narrow.

[OWNER: the consent page lists `erase`, but no MCP tool uses it. Consider offering only read and write to Claude, so the connector asks for nothing it cannot use.]

## Reviewer test account

Paste into the portal Test & launch step:
- Endpoint: https://api.auditkit.dev/mcp. No credentials are issued. Connect from Claude.ai and sign in with any email you control (magic link). Every new account automatically gets read access to a shared "Sample project", seeded by `scripts/seed-reviewer.ts`. Choose "Sample project" on the consent page.
- Seed: tenants `acme` and `globex`; about 200 events over 30 days; several anchored roots with Rekor and OpenTimestamps receipts; one event with its payload erased (get_event shows it erased; verify_range still returns valid:true).
- Reviewer script: list_tenants; search_events tenant=acme limit=5; get_event on a result; get_proof on an anchored event; verify_range tenant=acme; export_evidence tenant=globex. Approve the write scope only to try log_event; with read-only access it returns a scope error, which is expected.
- [OWNER: scripts/seed-reviewer.ts is not in packages/server yet (no scripts directory in the repo); confirm it exists and that the Sample project is read-only for reviewers, so one reviewer cannot alter another's view. Confirm whether log_event is reachable on the Sample project; if not, say so here.]

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
6. Conversation data: we collect none. We see only tool arguments and request metadata needed to serve calls.
7. Public documentation: https://auditkit.dev/docs and the privacy and terms pages are public.

## Pre-submission checklist

- [ ] https://api.auditkit.dev live over HTTPS: `/mcp` returns 401 with `resource_metadata`; both `/.well-known/` documents load and the `resource` value equals the MCP URL exactly.
- [ ] Authorization server reachable from Anthropic's egress range (160.79.104.0/21); no WAF blocking discovery, register or token calls (10 s limit each).
- [ ] `/oauth/token` accepts `application/x-www-form-urlencoded`; refresh rotation returns `invalid_grant` on a reused token.
- [ ] Connect from Claude.ai as a custom connector: magic-link sign-in, consent page, project choice, redirect back. Repeat with a brand-new email to confirm the Sample project is attached automatically.
- [ ] Run each of the seven tools from Claude.ai after consent, including log_event with write scope, and one scope-denied call.
- [ ] Disconnect, then confirm the old token fails (revoke works) and reconnecting works.
- [ ] Dashboard health: anchor job running; /anchors shows recent Rekor and OTS entries.
- [ ] Sample project seeded and verify_range returns valid:true on both tenants.
- [ ] docs, privacy, terms, support pages live with [OWNER] fields filled (legal name, jurisdiction, data location).
- [ ] Icon, slug (permanent) chosen; portal warnings read before submitting.

## Positioning source notes (fetched claims only)

Sigstore Rekor: "an immutable, tamper-resistant ledger" with inclusion proofs (docs.sigstore.dev/logging/overview/, fetched 2026-10-06, per docs/research/buyer-need.md). WorkOS audit logs make no integrity claim on their pricing or product page (same file). Nobody ranking explains external anchoring (docs/research/seo-geo-aeo.md). The listing makes no compliance or market-position claim.
