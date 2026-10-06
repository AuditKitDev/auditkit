# Site claims → proof

Every product claim on packages/web traces to code in this workspace or to a cited claim in `docs/research/*.md`. Owner rules: no false claims; no fabricated social proof; "verify without trusting AuditKit" (never "anyone"); OTS is "stamped by calendars, Bitcoin confirmation within hours"; Rekor gives inclusion, not time; never "compliant", "SLA", "passkeys", "SSO". Updated 2026-10-05.

## Product claims

| Claim on site | Where | Proof |
|---|---|---|
| Events are hash-chained per tenant; `event_hash = sha256(JCS(header))`, header includes `prev_hash`; position 0 prev is 64 zero hex | /, /docs#receipts, /security, blog | `packages/core/src/chain.ts` (`chainEvent`, `eventHash`), `packages/core/src/hash.ts` (`GENESIS`), `packages/core/src/jcs.ts` (RFC 8785); `packages/server/src/events.ts` `ingest` |
| `payload_commit = sha256(salt ∥ JCS(payload))`, 16-byte random salt per event | /docs, /security, /privacy, blog | `packages/core/src/chain.ts` `commitPayload`; `packages/core/src/hash.ts` `randomSalt` (16 bytes) |
| Receipt = `{id, tenant, position, event_hash, prev_hash, server_sig, duplicate}`; Ed25519 over raw hash bytes; key from env, not DB; public key at `/.well-known/auditkit.json` | /, /docs, /security | `packages/server/src/openapi.ts` Receipt schema; `packages/server/src/signing.ts`; `packages/server/src/app.ts` well-known route; `packages/server/src/main.ts` (key from env) |
| Merkle tree: leaf `sha256(0x00∥h)`, node `sha256(0x01∥l∥r)`, odd node carries up unchanged; three levels tenant→project→global; proof returns three paths + anchors | /, /docs, blog merkle | `packages/core/src/merkle.ts`; `packages/server/src/anchorLoop.ts` `proofForEvent` |
| Global root written to Sigstore Rekor as a `hashedrekord` entry with inclusion proof and checkpoint stored; final on write | /, /anchors, /security, blog | `packages/anchor-rekor/src/entry.ts` (kind `hashedrekord`), `packages/anchor-rekor/src/rekor.ts` (inclusionProof, checkpoint) |
| Rekor gives inclusion, not a trusted timestamp; the site claims no Rekor timestamps | /anchors, /security, blog | Owner rule (4); `packages/verify/src/index.ts` `attested_at` comes from the anchor verifier result; Rekor `integratedTime` is not surfaced on the site |
| OpenTimestamps: submitted to public calendars, proof stored `pending`, upgraded to `final` when the Bitcoin attestation lands ("within hours", never "instantly") | /, /anchors, /security, blog | `packages/anchor-ots/src/anchor.ts` (calendar whitelist, `upgrade`, bitcoin attestation check); `packages/core/src/anchor.ts` `AnchorReceipt.status` |
| Offline verifier: re-hashes, walks chain, checks signatures against pinned key, rebuilds roots, verifies Rekor/OTS receipts from proof bytes; `--online` cross-checks; exit 0/2/1 = VALID/VALID_UNANCHORED/INVALID; check names manifest, chain, signatures, payloads, client_sigs, roots, anchors, coverage | /, /docs#export, blog | `packages/verify/src/index.ts` (`CheckName`, `Verdict`, `verifyExport`), `packages/verify/src/cli.ts` (`EXIT`, `printHuman`), `packages/verify/src/anchors.ts` |
| Terminal transcript on / and /docs | `src/components/Terminal.astro` | Line format matches `printHuman` (`ok  `/`FAIL`/`?   ` + name padded 11 + summary, details indented 5, blank line, verdict) and the summary templates in `verifyExport`; values are labelled "example output" on the page |
| "Verify without trusting AuditKit": verifier trusts Rekor's log key and Bitcoin | hero, FAQ, llms.txt | Owner rule (3); `packages/anchor-rekor/src/checkpoint.ts` (log key), `packages/anchor-ots/src/anchor.ts` (block header) |
| Crypto-shredding: `POST /v1/erase/:id` (scope erase) deletes payload+salt; chain/roots/anchors unchanged; event reads `payload: null, erased: true`; verifier reports erased count | /, /docs#erase, /privacy, blog | `packages/server/src/events.ts` `erase`, `toRecord`; `packages/verify/src/index.ts` `checkPayloads` |
| Plan limits enforced: writes past monthly limit → `429 plan_limit`; retention shreds payloads older than the window; headers/hashes/anchors kept | /pricing, /app overview, /terms | `packages/server/src/app.ts` `overLimit`; `packages/server/src/anchorLoop.ts` `applyRetention`; `packages/server/src/plans.ts` |
| Plan table: Free 10k/30d/daily, Pro $49 500k/1y/5min, Business $199 5M/3y/1min, Self-host AGPL | /, /pricing, JSON-LD offers | `packages/server/src/plans.ts`; spec §6 (`board/projects/auditkit/spec.md`). Spec extras "embedded viewer", "auditor viewer tokens", "SLA" are NOT shown pending owner (OWNER-TODO 10, 16); viewer tokens are described under docs instead |
| Client-side signing: SDK signs `sha256(JCS({tenant, actor, action, target, occurred_at}))`; server stores and exports `client_sig`, does not check it; verifier checks with `clientKeys` | /docs#signing, FAQ, /security, blog | `packages/sdk/README.md`, `packages/sdk/src/index.ts`; `packages/sdk-python/README.md`; `packages/verify/src/index.ts` `checkClientSigs` |
| SDKs: zero-dependency TS (Node 22+) and Python (3.10+, stdlib); methods list; 3 retries with backoff on 429/5xx/network; idempotency key always sent; `erase` never retried; `keepReceipts` | /, /docs#quickstart, blog receipts | `packages/sdk/README.md`, `packages/sdk/src/index.ts`; `packages/sdk-python/README.md`, `packages/sdk-python/src/auditkit/__init__.py`. **Status: built, not yet published to npm/PyPI**; the site says "publish with v2.0.0; until then install from source" (`src/lib/snippets.ts` PUBLISH_NOTE) |
| MCP: same process as REST, stateless Streamable HTTP at `/mcp`, same Bearer key; seven tools with the listed titles; all read-only except `log_event` (destructiveHint false); no erase tool; `export_evidence` truncates at 2000 lines; search limit 200 | /, /docs#mcp, blog mcp | `packages/server/src/mcp.ts` |
| API reference table | /docs#api | Rendered at build time from `packages/server/src/openapi.ts` |
| Search semantics (`action` suffix `*`, from inclusive / to exclusive, newest first, limit ≤ 500, cursor = last id) | /docs | `packages/server/src/events.ts` `search`; `openapi.ts` |
| API keys: SHA-256 hash + prefix stored, shown once, scopes read/write/erase/admin, immediate revoke; 1200 req/min per key | /docs#auth, /security, /app keys | `packages/server/src/keys.ts`; `packages/server/src/app.ts` `keyLimit` |
| Magic link: single-use, 15 min; session cookie httpOnly, SameSite=Lax, Secure in prod; no passwords | /login, /privacy, /security | `docs/web-api.md`; `packages/server/src/auth.ts` (`TOKEN_TTL_MS`, `setCookie`) |
| Viewer tokens: read-only, tenant-scoped, TTL default 168h max 2160h, shown once; `/viewer/*` routes; `tenant` query ignored | /docs#viewer, /app viewer-tokens, /viewer | `docs/web-api.md` "Viewer tokens"; `packages/server/src/viewer.ts` |
| Demo: throwaway project, tenant = IP hash, 30 req/min, reset nightly, anchors on the normal tick | / demo section | `docs/web-api.md` "Demo"; `packages/server/src/auth.ts` rate limiter |
| /anchors and /public/stats numbers are live from the server | /anchors, / | `src/islands/Anchors.tsx` reads `/public/anchors`, `/public/stats` (`docs/web-api.md`) |
| Self-host: one Node 22+ Hono process, SQLite WAL, one DB file per project, in-process anchor timer, AGPL | /docs#selfhost, /pricing | spec §4; `packages/server/src/db.ts`, `anchorLoop.ts`; license per spec §6 (OWNER-TODO 7 for the repo URL) |
| Erasure window / residual risk statements on /security (insider can delete newest unanchored events; receipts prove it) | /security | Follows from the design above; `docs/research/buyer-need.md` §(c) |

## Cited external facts (research files)

| Statement | Page | Source (fetched) |
|---|---|---|
| PCI DSS v4 10.3.2 / 10.3.4 / 10.5.1 quotes | /, Controls | buyer-need.md §1: learn.microsoft.com/en-us/entra/standards/pci-requirement-10 (2026-10-06) |
| NIST SP 800-53 AU-9, AU-9(2), AU-9(3) quotes and "signed hash functions" guidance | /, Controls | buyer-need.md §1: usnistgov/oscal-content catalog JSON |
| HIPAA 164.312(b) and (c)(2) quotes | /, Controls | buyer-need.md §1: law.cornell.edu/cfr/text/45/164.312 |
| ISO 27001:2022 A.8.15 control text and admin guidance | /, Controls, blog postgres | buyer-need.md §1: hightable.io, isms.online |
| DORA RTS 2024/1774 Art. 12(2)(d); NIS2 Impl. Reg. 2024/2690 Annex 3.2 | /, Controls | buyer-need.md §1: springlex.eu; eur-lex |
| SOC 2 CC7.2 text; "supports CC7.2-style log-integrity evidence"; "no SOC 2 report today" | /, Controls, FAQ | buyer-need.md §1: cyberday.ai; owner rule (10) |
| Three personas and their search sentences | / Who this is for | buyer-need.md §(a) |
| Ubiquiti insider quote and six-year sentence; Volt Typhoon log clearing and "store logs in a central system" | /security | buyer-need.md §4: theregister.com 2023-05-12; cisa.gov AA24-038A |
| WorkOS "worse than useless" quote; WorkOS tamper-evidence definition | /security, /compare/workos | buyer-need.md §2; seo-geo-aeo.md §4 (workos.com/blog/audit-logs-are-a-product-feature) |
| HN "security theater" quote | /security, /compare/postgres, blog postgres | buyer-need.md §3: hn.algolia.com item 44602532 |
| WorkOS $99/mo per 1M events retained, $125/mo per SIEM stream, 30-day default retention | Comparison strip, /pricing FAQ, /compare/workos | buyer-need.md §3/§5 (workos.com/pricing); seo-geo-aeo.md §4 (workos.com/docs/audit-logs/introduction) |
| Datadog Audit Trail 2–3% of spend; retention 3–90 days | Comparison strip | buyer-need.md §5 (datadoghq.com/pricing/list; docs) |
| Drata/Vanta: no customer-facing audit-log page | Comparison strip | seo-geo-aeo.md §4 ("no audit-log page; guessed URLs 404") |
| Velt "6-12 weeks" and "Rolling your own means…" | Comparison strip, /compare/postgres | buyer-need.md §3 (velt.dev) |
| Amazon QLDB retired 2025-07-31 | /compare/postgres | buyer-need.md §5 (AWS shutdown list) |
| Azure Confidential Ledger quotes; Google Cloud Audit Logs "immutable", 400-day `_Required` bucket | /compare/postgres | buyer-need.md §5 |
| immudb quote and Apache 2.0 | /compare/postgres | buyer-need.md §5 (immudb.io) |
| Retraced alive: pushed 2026-08, ~450 stars | /compare/postgres | buyer-need.md §3 (`gh api repos/retracedhq/retraced`) |
| Pangea Merkle/Arweave claim; URLs redirect to CrowdStrike; acquisition date UNVERIFIED (not stated) | /compare/postgres | buyer-need.md §5; seo-geo-aeo.md §4 |
| Sigstore: Rekor "an immutable, tamper-resistant ledger", free public instance | /, /anchors, blog | buyer-need.md §5 (docs.sigstore.dev/logging/overview) |
| EDPB Guidelines 02/2025 quotes on salted hash and salt deletion; "hash is personal data while salt exists" | /, /privacy, blog erasure | buyer-need.md §6 |
| ICO: erased data may remain in backups until overwritten | blog erasure | buyer-need.md §6 |
| JSON-LD: Organization + SoftwareApplication only, no FAQPage/HowTo; BlogPosting on posts; llms.txt; robots allows OAI/Claude bots; sitemap; canonical/OG | Base.astro, index.astro, BlogPost.astro, llms.txt.ts, robots.txt | seo-geo-aeo.md §3, §8, §9, §10 |

## Not claimed, on purpose

- No testimonials, logos, customer counts, ratings or "trusted by". Zero customers today. Social proof is limited to live `/public/stats`, live `/anchors`, the open-source repo and the verifier output. **No fabricated social proof.**
- No "SOC 2 / HIPAA / PCI / ISO compliant", no "SLA", no "passkeys", no "SSO", no Rekor timestamps, no "Bitcoin-anchored instantly", no "tamper-proof" as a product claim (only "tamper-evident"), no "without trusting anyone".
- Not on the site until they exist: npm/PyPI packages (noted inline), production signing key, embedded viewer widget, status page, data location (`[OWNER: fill]`).
- `aggregateRating` omitted from SoftwareApplication JSON-LD until a real review exists (seo-geo-aeo.md §3).
