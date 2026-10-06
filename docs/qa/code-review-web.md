# Code review: packages/web (2026-10-05)

Build 28 pages, `astro check` 0 errors. Lighthouse (perf/a11y/bp/seo): / 99/92/100/100, /pricing 100/94/100/100, /docs 100/92/100/100, blog 97/96/100/100, /security 97/95/100/100, /login 86/96/96/66 (noindex).

**Verdict: DO NOT SHIP.** 7 FALSE, 9 UNPROVEN. Three break the owner's hard rule outright (fake social proof, an unenforced plan feature sold on /pricing, an AGPL claim with no license file).

## Part A: claims

Paths under `packages/`. CITED = quoted with source in docs/research.

| Claim | Page | Status | Proof / why |
|---|---|---|---|
| "most chosen" pill on Pro | /, /pricing (PricingTable.astro:9) | **FALSE** | Zero customers (claims.md "Not claimed"). Fabricated social proof. |
| Anchor cadence by plan: daily / 5 min / 1 min | /, /pricing, /security, /terms, FAQ, blog receipts+anchors, dashboard overview | **FALSE** | One global interval, `server/src/main.ts:19` `AUDITKIT_ANCHOR_INTERVAL ?? 300`; plan value only echoed in usage JSON (`webRoutes.ts:110`). Not enforced. |
| "Export API" is a Business extra; "export API on Business" | /pricing (plans.ts:18, FAQ), / | **FALSE** | `GET /v1/export` needs only `read` scope, no plan check (`server/src/app.ts:173`). Docs page says every plan exports. |
| TS SDK "zero-dependency" | /, /docs | **FALSE** | `sdk/package.json` depends on `@auditkit/core`. |
| `ak_test_` keys "hit a seeded demo project" | /, /docs#auth, blog mcp | **FALSE** | Key `mode` stored, never routes (`server/src/keys.ts`); sandbox is `AUDITKIT_SANDBOX_PROJECT` membership (`auth.ts:103`). |
| "Every product claim above is true of the code in the public repository" | all 7 blog footers (BlogPost.astro:20) | **FALSE** | No public repo: `REPO_URL` = `github.com/OWNER-TODO/auditkit`, rendered on 20 pages. |
| "The verifier does not treat Rekor's integrated time as evidence"; no Rekor timestamps | blog anchors, /security, /anchors | **FALSE** (partial) | `anchor-rekor/src/verify.ts:92-95` returns `integratedTime` (v1) or server clock (v2) as `attested_at`; `verify/src/index.ts:344` prints `rekor …: verified at <time>`. Terminal.astro example omits it, so the example does not match real output. |
| AGPL-3.0 (footer, JSON-LD `license`, /pricing, /docs, /terms) | every page | UNPROVEN | No LICENSE file in repo, no `license` field in any package.json. Owner must add before this is true. |
| Node 22+ | /, /docs | UNPROVEN | No `engines`; Dockerfile uses `node:26-alpine`; `node:sqlite` needs 22.5+. |
| Python "stdlib only" and "pass a private key, every event is client-signed" | /, /docs | UNPROVEN | `pyproject` extra `sign = ["cryptography>=41"]`: signing is not stdlib. |
| Public key "pinned in the verifier package" | /security (cannot-do list), blog receipts | UNPROVEN | `verify/src/cli.ts:12` `PINNED_KEYS = {}`. /security tags it [OWNER]; blog states it flat. |
| "Roughly 1 KB per event; 5M events ≈ 5 GB" | /pricing | UNPROVEN | No measurement anywhere. |
| "Three things the alternatives do not do: public anchoring" | / | UNPROVEN (overstated) | /compare/postgres itself lists Pangea anchoring to Arweave (buyer-need.md §5). |
| WorkOS "No published verifier or proof format", "Agent access: Not described" | /compare/workos | UNPROVEN | Research records "none on pricing/product page" for integrity only; "agent" not in research. |
| "Export into Vanta or Drata as evidence" | / personas | UNPROVEN (wording) | No integration exists; reads as one. |
| Anchor status "pending \| anchored \| failed" | /security | UNPROVEN | API/UI use `pending \| final` (`web/src/lib/api.ts:11`, `anchor-ots/src/anchor.ts:144`). |
| Hash chain, JCS, genesis 64 zeros; `payload_commit`, 16-byte salt | /, /docs, /security, /privacy, blog | PROVEN | `core/src/chain.ts:25,29`, `hash.ts:13` (salt joined as hex text) |
| Receipt fields, Ed25519 over raw hash, key from env, `/.well-known/auditkit.json` | /, /docs, /security | PROVEN | `events.ts:33-45`, `signing.ts:28`, `app.ts:81` |
| Merkle RFC 6962 leaves/nodes, odd node carried, three levels, three paths | /, /docs, blog merkle | PROVEN | `core/src/merkle.ts:9,13,36`; `anchorLoop.ts:195-201` |
| Rekor `hashedrekord` + inclusion proof + checkpoint; OTS calendars, pending→final ("within hours" is owner wording) | /, /anchors, /security | PROVEN | `anchor-rekor/src/rekor.ts:116,152`; `anchor-ots/src/anchor.ts:20-32,144,165` |
| Verifier checks, verdicts, exit 0/2/1, flags, output format | /, /docs | PROVEN | `verify/src/index.ts`, `cli.ts:14,27-50` |
| Erase: scope, payload+salt deleted, `{erased, audit}`, `payload.erased` same tx, `payload.retention_shred`, reads `payload:null, erased:true` | /, /docs, /privacy, /security, blog | PROVEN | `events.ts:221-222`, `app.ts:225-229`, `anchorLoop.ts:136`, `events.ts:166` |
| Tenant keys routes, `client_sig` verified, `require_client_sig`, signed message | /docs, /security, FAQ | PROVEN | `tenantKeys.ts:69-76`, `chain.ts:74` |
| Plan numbers (10k/30d, 500k/1y/$49, 5M/3y/$199), `429 plan_limit`, retention shreds payloads only | /pricing, /terms | PROVEN | `plans.ts:11-13`, `app.ts:62`, `anchorLoop.ts:125` |
| SDK retries 3× backoff on 429/5xx/network, idempotency key, erase not retried, `keepReceipts`; Python 3.10+ | /, /docs, blog receipts | PROVEN | `sdk/src/index.ts:87-158`, `sdk-python/.../__init__.py:49-160`, pyproject |
| MCP `/mcp` stateless, `oat_` or key, seven tools/titles/hints, no erase, 2000-line truncation, search ≤200 | /, /docs, blog mcp | PROVEN | `mcp.ts:14-119`, `oauth.ts:44` |
| Search semantics, bulk 1000, limit ≤500 | /docs, /compare/workos | PROVEN | `events.ts:187-203`, `app.ts:130` |
| API keys hash+prefix, scopes, shown once, 1200 req/min | /docs, /security | PROVEN (caveat) | `keys.ts:6-38`; limiter on `/v1/*` only, not `/mcp` (`app.ts:87`) |
| Magic link 15 min single-use, cookie flags, GET auto-POST, `next` | /login, /privacy, /security | PROVEN | `auth.ts:11,57,126`, `webRoutes.ts:58-68` |
| OAuth 2.1 discovery, DCR, PKCE, project-scoped tokens | /docs, /security, blog mcp | PROVEN | `oauth.ts:65-165` |
| Viewer tokens TTL 7d/90d, `/api/viewer/*`, tenant param ignored | /docs | PROVEN | `webRoutes.ts:141-142`, `viewer.ts:68,97` |
| Demo: IP-hash tenant, 30/min, nightly reset | /, /privacy | PROVEN (caveat) | `webRoutes.ts:46,242`; with `AUDITKIT_PROXY_TRUST=none` all visitors share one bucket |
| /anchors + stats live; Hono, SQLite WAL, one DB per project, in-process timer | /anchors, /docs | PROVEN | `webRoutes.ts:219-238`; `db.ts:16,67`; `main.ts:63` |
| PCI/NIST/HIPAA/ISO/DORA/NIS2/SOC2 control quotes; "supports", never "compliant" | /, Controls | CITED | buyer-need.md §1 |
| WorkOS $99/$125, 30-day default, "worse than useless", tamper-evidence definition | /, /pricing, /compare/workos, /security | CITED | buyer-need.md:37,48,64; seo-geo-aeo.md:59-61 |
| Datadog 2–3%, 3–90 days; Drata/Vanta no page; Velt 6–12 weeks; QLDB 2025-07-31; Azure, Google 400-day, immudb, Retraced (2026-08, ~450 stars), Pangea/Arweave | /, /compare/postgres | CITED | buyer-need.md:44,49,64-75; seo-geo-aeo.md:62-66 |
| Ubiquiti six years; Volt Typhoon; HN "security theater"; Rekor "immutable, tamper-resistant" | /security, /compare/postgres, blog | CITED | buyer-need.md:45,54,55,75 |
| EDPB 02/2025 three quotes and salt caveat; ICO "until it is overwritten"; nhimg glossary "designed to resist alteration" | /, /privacy, blog erasure, blog definition | CITED | buyer-need.md:81-82; seo-geo-aeo.md:27 |

Legal: /privacy and /terms use 14 `[OWNER: …]` placeholders, no invented facts. Untagged commitments to confirm: "answer within 30 days", "30 days' notice" on prices, "90 days' notice" on shutdown, "Business plans get priority".

docs/claims.md gaps: it cites `plans.ts` as proof of per-plan cadence (not enforced), `sdk/package.json` as proof of zero dependencies (false), and "spec §6" for AGPL (no LICENSE). It does not list "most chosen", "1 KB/event", `ak_test_` seeded project, the blog footer, or the Vanta/Drata wording.

## Part B: quality, ranked

1. **nginx never serves the dashboard or the 404 page.** `deploy/nginx-auditkit.conf:26` has `try_files … =404` with no `error_page 404 /404.html` and none of the `/app/projects/<id>/…` rewrites README.md requires (OWNER-TODO 15). In production `/app/projects/abc` is a bare nginx 404.
2. **Open redirect in Login island.** `src/islands/Login.tsx:16` redirects to `next` after `startsWith("/")`, which accepts `//evil.com`. Server-side `SAFE_NEXT` (`auth.ts:57`) rejects `//`; the client path runs before it. Reuse the same regex.
3. **Contrast fails WCAG AA in both themes.** `--fg-faint` #5f6c7c on #0a0d12 = 3.63:1, on surface 3.27:1; light #7d8896 on #f6f7f9 = 3.36:1; light `--warn` 4.42:1. Used for labels, dates, footer, form hints. Lighthouse flags it on every page.
4. **Blog dates render raw ISO** (`2026-10-05T00:00:00.000Z`) on /blog and every post: YAML `date: 2026-10-05` becomes a Date and `BlogPost.astro:16`/`blog/index.astro:15` print it unformatted. Cosmetic but visible on 8 pages; RSS `pubDate` is correct.
5. **ARIA: `role="tablist"` with invalid children.** `Code.astro:7` (radio inputs + labels) and `app.tsx:36` (anchors) have no `role="tab"` children. Lighthouse `aria-required-children` on /, /docs, all app pages.
6. **CLS** /login 0.268, blog 0.103: `client:only` islands mount into zero-height slots; Google Fonts render-blocking. Reserve a min-height.
7. /pricing heading order: h1 → h3.
8. Minor: /404 has `canonical=/404`; /viewer lacks canonical/OG (noindex); /login logs a 401 from the session probe.

Fine: canonical/OG/description on all 27 Base pages; JSON-LD parses with required fields (Organization, SoftwareApplication+offers, BlogPosting; `image` absent, optional); sitemap has all 18 public pages, excludes app/login/viewer/404; robots.txt; RSS valid, 7 items; llms.txt (repeats the AGPL claim); islands catch every fetch (dashboard 401 → `/login?next=`, viewer 401 → "invalid, expired or revoked", demo 429/400/server-down each have a state); `/viewer?embed=1` hides chrome; `min-w` tables sit in `overflow-x-auto`; both theme token sets exist; marketing JS ≈ 25 KB raw, CSS 32 KB, no images.

9. **`scripts/mock-api.mjs` has drifted from docs/web-api.md** (11 mismatches). Worst: `GET /api/app/projects/:id/viewer-tokens` (mock:338) serialises tokens that keep `project: p` (mock:344), a circular reference, so the route throws once a token exists. Also: receipt lacks `tenant_id/project_id/occurred_at/payload_commit`; verify result has no `roots`; viewer export ignores `from/to`; no `/webhooks/stripe`, `/v1/erase`, `/oauth/*`, `/mcp`; demo limits (30/min, 2 KB, 200 events) unenforced; `X-Forwarded-For` trusted unconditionally (mock:198); `/auth/magic` returns 400 instead of always 202. web-api.md:16 still describes the old 302 callback that :82 replaced.
