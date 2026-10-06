# AuditKit v2 QA report (black-box, running product)

Date: 2026-10-06 03:40–04:06 UTC. Tester: board QA subagent. Raw transcript (every command and response): `/tmp/claude-1000/qa/transcript.txt` (test ids `T…` below match the `=== T…` headings there).

## Environment

- Repo `/home/grim/Projects/auditkit-v2` @ `b781e96` (branch v2), Node v26.8.1, `pnpm -r --filter '!@auditkit/web' build` green (core, anchor-ots, anchor-rekor, server, sdk, verify).
- Server: `packages/server/dist/main.js` on :3201, `AUDITKIT_DATA=/tmp/claude-1000/qa/data`, `AUDITKIT_ANCHORS=rekor,ots` (real public anchors), interval 20 s, `AUDITKIT_PROXY_TRUST=x-forwarded-for`, no Resend (magic links in `server.log`), no Stripe.
- Site: `pnpm --filter @auditkit/web build` → 28 pages. A managed Astro preview was already running on :4321 (pid 3523060, foreign, proxying to a sibling server on :3001); Astro 7 refuses a second managed preview, so static-site checks used that :4321 instance serving the freshly rebuilt `dist/`. API-proxy behaviour through :4321 therefore hit the sibling server, not :3201; it is reported only as "proxy works".
- Builds: tests 1–32 and 34–36 ran against `dist/` built 03:39 UTC from `b781e96`. The repo was rebuilt during the run (commits 950165f, 2e8a8cf, 5acc6e2, d16d4e7, 6739db4; `dist/` at 03:58:28 UTC); only test 33 (restart) ran on that newer server build. The site build (34–36) was from `b781e96`; 6739db4 landed after.
- Projects used: `QA Project` p_63411818af73fd6c (tenants acme, globex), `example.com` p_2b9517ccb906a8c6 (plan-limit test), `demo`.

## Test plan and results

| # | Area | Steps (transcript id) | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| 1 | Health | GET /health (T1) | 200 ok | 200, helmet headers present | PASS | `{"ok":true}` |
| 2 | Well-known | GET auditkit.json, oauth-authorization-server, oauth-protected-resource, …/mcp (T2–T4b) | key, policy, AS metadata, resource = /mcp | all 200; `resource":"http://localhost:3201/mcp"`, S256, scopes read/write | PASS | `anchors:["rekor","ots"],anchor_interval_seconds:20` |
| 3 | OpenAPI | GET /openapi.json, parse, `npx @redocly/cli lint` (T5–T6) | valid 3.1 | parses, 12 paths; redocly: 4 errors (missing `summary` on listTenants/createTenant/revokeKey, no `security` on well-known) + 13 warnings (no 4XX responses, no license) | PASS (lint findings cosmetic) | `Validation failed with 4 errors and 13 warnings` |
| 4 | Auth | POST /auth/magic → GET /auth/callback → POST redeem → /auth/me → logout (T7–T10, T20) | 202; HTML auto-POST form; 302 /app + cookie; user json; 204 then 401 | as expected | PASS | `location: /app`, `set-cookie: ak_session=…HttpOnly; SameSite=Lax` |
| 5 | Auth | reuse redeemed token; expire token via SQLite `login_token.expires_at` (T11, T11b) | 302 /login?error=expired both | both `/login?error=expired` | PASS | |
| 6 | Auth | /auth/magic ×7 from one IP (T13) | 429 after 5 | 202×5 then 429×2 | PASS | |
| 7 | Auth | `next` = https://evil.com, //evil.com, javascript:, /app/../x, app (T12) | never off-origin | first three → `/app`; `/app/../x` passed through (same-origin, browser-normalised); `app` rejected | PASS | |
| 8 | App | projects list/create, keys create/list/revoke, revoked key → 401, unauth → 401, other user's project → 404, billing → 501 (T14–T19b) | per web-api.md | all as documented | PASS | `{"id":"p_63411818af73fd6c","name":"QA Project","plan":"free"}`; revoked key → `unauthorized` |
| 9 | Events | single POST /v1/events (T21) | 201 receipt | 201 with id, position 0, prev GENESIS, server_sig | PASS | |
| 10 | Events | bulk 1000 / 1001 (T22, T23) | 201 / 400 | 1000 receipts pos 1..1000 in 0.11 s; 1001 → 400 `at most 1000` | PASS | |
| 11 | Events | 66 KB payload; 1.1 MB body (T24, T25) | 400 / 413 | 400 `payload must be at most 64 KB`; 413 `too_large` | PASS | |
| 12 | Events | Idempotency-Key replay / conflict (T26) | 201, 200 duplicate, 409 | 201; 200 `duplicate:true`; 409 `idempotency_conflict` | PASS | |
| 13 | Search | tenant+actor, from/to window, pagination walk, action `invoice.*`, `%*`, `_*` (T27–T27k) | filters honoured; `%`/`_` literal; no dup/skip | 1 hit for window; 3 pages = 1002 rows, 1002 distinct; `%*` and `_*` → 0 | PASS | within one `occurred_at` ms, order is by random id, not position (see notes) |
| 14 | Get | GET /v1/events/:id, missing id, id from other project's key (T28, T28c) | 200 / 404 / 404 | as expected | PASS | |
| 15 | Proof | before tick, after tick (T29, T29b, T29c) | `anchored:false` then paths + rekor final + ots pending with real refs | before: `anchored:false`; after: tenant/project/global roots, `rekor=final ref=log2025-1.rekor.sigstore.dev/139980606`, `ots=pending` 4 calendars | PASS | Rekor checkpoint endpoint reachable (T29d) |
| 16 | Verify | /v1/verify, range 0–10, unknown tenant (T30) | valid, roots object, rooted/anchored_through | `valid:true,count:1002,roots:{roots_checked:1,roots_ok:true},rooted_through:1001,anchored_through:1001`; unknown → `valid:false` | PASS | |
| 17 | Export+CLI | export → `node packages/verify/dist/cli.js` offline; `--pin` right/wrong key (T31–T32c) | VALID exit 0; pin mismatch INVALID | 1004 lines (manifest, 1002 events, 1 root); VALID exit 0; pinned ok; wrong pin INVALID exit 1 | PASS | `ok anchors 2 of 2 anchor receipts verify` |
| 18 | Tamper | actor changed @500; tail truncated; payload changed @3 (T33–T33c) | INVALID exit 1 with position | `chain at position 500: event_hash does not match`; `chain ends at 999, manifest says 1001`; `payloads at position 3` — all exit 1 | PASS | |
| 19 | Erase | POST /v1/erase/:id; get; audit event; verify; export; CLI; erase twice (T34–T34h) | audit receipt; payload null/erased; valid; export line without payload; CLI VALID "1 erased"; 404 | all as expected; audit event `payload.erased` at pos 1002 | PASS | `1002 payload commitments verify, 1 erased` / `VALID` |
| 20 | Viewer tokens | create ttl 1h; ?token and Bearer; tenant=globex ignored; verify/export; no token; list (T35) | scoped to acme | `tenant:"acme"` only, globex never visible; 1005 export lines; 401 without token | PASS | |
| 21 | Viewer tokens | set `viewer_token.expires_at` to 2020 via node:sqlite; revoke; ttl 99999 (T36–T37d) | 401 / 401 / 400 | 401 expired; 401 revoked; 400 `<= 2160` | PASS | |
| 22 | Client signing | sig before key → 400; register; junk key 400; signed 201; wrong key 400; no occurred_at 400; policy require → unsigned 400 (single and bulk), signed 201; export carries client_sig (T50–T53) | per web-api.md | all as expected | PASS | `client_sig does not verify for tenant acme`; `tenant acme requires client_sig` |
| 23 | Plan limit | project plan `free` (registry); 11×bulk 1000; single; MCP log_event (T60) | 429 at 10k on REST and MCP | bulks 1–10 → 201, 11th → 429 `plan_limit`; single 429; MCP tool returns `{"error":"plan_limit"}`; usage 10000/10000 | PASS | |
| 24 | Key rate limit | 1300 GET /v1/tenants, fresh key, 50 parallel (T46) | 1200×200, 100×429 | exactly `1200 200 / 100 429`, next → 429 | PASS | |
| 25 | Demo | /demo/log ×2 (A), ×1 (B) via X-Forwarded-For; /demo/events; /demo/verify; /demo/proof own and other's (T40–T41e) | isolated chains | A sees A@0,A@1 only; B sees B@0; B's proof of A's id → 404; verify valid | PASS | |
| 26 | Demo caps | 2.1 KB payload; 35 posts/min; (T42, T43) | 400; 429 after 30 | 400 `limited to 2 KB`; 30×201 then 5×429 | PASS | |
| 27 | Demo 200 cap | 215 posts at ~27/min then 165 more (T43b, T43c, T43d) | 429 at event 200 | first loop: 215×201 (reset wiped the chain at 03:50, count 46); second loop: 154×201 then 11×429 `demo chains are limited to 200 events`; /demo/verify count 200 | PASS | nightly reset fired at 03:50 UTC mid-run (`[demo] reset`), chain restarted; see notes |
| 28 | Public | /public/anchors, /public/stats (T44) | real Rekor refs | `rekor … ref:"log2025-1.rekor.sigstore.dev/139982216",status:"final"`, ots pending; stats `events_total:1000,roots_total:2,anchors_final:2,projects:5` | PASS | |
| 29 | OAuth rehearsal | `scripts/rehearse-connect.mjs` (T80, T80b) | PASSED | first run failed at "magic link requested": my earlier T13 had exhausted the 5/10 min login limit for 127.0.0.1 (script sends no XFF); re-run after the window → all 13 steps ok, `REHEARSAL PASSED` | PASS | |
| 30 | OAuth raw | DCR; bad redirect; consent; wrong PKCE verifier; code reuse → family revoked; refresh rotation; refresh reuse; /oauth/revoke; missing PKCE (T81–T86b) | per RFC/OAuth 2.1 | 201 client; http redirect → 400; wrong verifier → `invalid_grant PKCE verification failed`; reused code → `code already used`, its access token → 401, its refresh → `session revoked`; rotation issues new pair, old access 401; refresh reuse → `invalid_grant`, newest access 401 and newest refresh dead; revoke → 401; no PKCE → 400 | PASS | |
| 31 | MCP | no auth; initialize; tools/list; each of 7 tools; unknown tool; bad args; missing id; read-only key log_event; bogus key (T70–T74e) | 401 + WWW-Authenticate resource_metadata; 7 tools with title/annotations; errors | 401 `Bearer resource_metadata="…/.well-known/oauth-protected-resource"`; 7 tools, titles match spec, 6× readOnly, log_event readOnly=false destructive=false; all tools returned data; `Tool erase not found`; `Required at event_id`; `not found`; `key lacks write scope`; 401 | PASS | |
| 32 | Backup | `scripts/backup.mjs data backup`; open copies with node:sqlite (T90) | consistent copies | 6 DBs + 2 keys; p_6341 1008 events, p_2b95 10000, demo 50; `integrity_check ok`; registry 5 projects, 4 global roots, anchors rekor final×4 ots pending×4 | PASS | |
| 33 | Restart | kill server, start again, check key, data, anchors, chain position (T95) | persists, chain continues | after kill+start: same admin/API key → 200, same server public key, session cookie still valid, `/v1/verify` identical (count 1007, roots_checked 4, anchored_through 1006), `/public/anchors` unchanged, new event took position 1007 with prev_hash = old head, demo chain intact (200 events). Note: `dist/` had been rebuilt at 03:58:28 UTC (commits 950165f..d16d4e7) 8 s before the restart, so the restarted process ran the new build. It anchored the `business` demo project on the next tick after new events (04:04:16, Rekor `140001932`) but left the `free` QA project's events 1007–1008 unrooted: the new build applies per-plan cadence (free = daily, `max(interval, plan.anchor_interval_seconds)`), the old build anchored every tick. Chain continuity PASS; the cadence change is by design in the new build | PASS | |
| 34 | Site | every sitemap route via preview (T100); non-sitemap /app /login /viewer (T100) | 200 | 18/18 → 200; /app /login /viewer 200; /nope 404 | PASS | |
| 35 | Site | `[OWNER` scan on every page (T101, T101b) | none on homepage | **6 pages leak placeholders, including `/`**: `[OWNER: confirm Stripe prices]` on / and /pricing; legal name, retention, refund policy, disk encryption, response time on privacy/terms/security/support | **FAIL** | `grep -rl "\[OWNER" dist` lists index.html, pricing, privacy, security, support, terms |
| 36 | Site | demo island JS (T102) | on / only | `/_astro/Demo.DyvPqVU2.js` referenced only by `dist/index.html`; `/anchors` has its own `Anchors.*.js` island; no other page loads scripts | PASS | |

## Failures

**F1 (test 35) — `[OWNER: …]` placeholders render on the public site, including the homepage.**
Repro: `pnpm --filter @auditkit/web build && grep -rl '\[OWNER' packages/web/dist` → `index.html, pricing, privacy, security, support, terms`. On `/` the text `[OWNER: confirm Stripe prices]` comes from `src/components/PricingTable.astro` (via `src/lib/plans.ts`). These are the OWNER-TODO items; they are correct as a to-do list but must not ship. Blocks P4 (listing requires live privacy/terms/support pages with the fields filled).

## Observations (not failures)

- Demo reset timer: `main.ts` resets the demo at the first 10-minute tick whose UTC hour is 3. Any (re)start between 03:00 and 03:59 UTC wipes the demo immediately (seen at 03:50, `[demo] reset`). Harmless in prod unless a deploy lands in that hour.
- Search order within the same `occurred_at` millisecond is by random event id, so bulk-ingested events paginate out of position order (998, 997, 999…). Cursor is stable, nothing is skipped. Ordering by `(occurred_at, position)` would read better.
- `GET /v1/events?from=yesterday` returns 200 empty instead of 400; `limit=501` is silently ignored rather than rejected (OpenAPI says max 500).
- Verifier prints `ots … verified at …` for a receipt whose status is `pending` (calendar attestation only, not Bitcoin); wording could say "calendar receipt verified, Bitcoin pending".
- Anchor cadence is global (20 s here, 60 s prod); free projects were anchored every tick, not daily as the plan table says. Generous, but `anchor_interval_seconds: 86400` in the project JSON does not match observed behaviour.
- OpenAPI lint: three operations lack `summary`, well-known lacks `security: []`, no 4XX responses declared.
- `rehearse-connect.mjs` shares the 5/10 min magic-link limiter with any other local sign-in from 127.0.0.1; run it first or from a distinct XFF when `AUDITKIT_PROXY_TRUST` is set.

## Summary

- Total 36 test groups (≈175 individual requests in the transcript): **35 PASS, 1 FAIL, 0 NOT RUN**. Every item in the brief was executed. One check is weaker than asked: the preview's API proxy was exercised against a sibling server on :3001 rather than :3201 (managed Astro preview refused a second instance); the static routes, OWNER scan and island check are unaffected.
- Blockers: F1 (OWNER placeholders on public pages incl. homepage) blocks P4 listing and any public deploy of the site build tested. No server-side blocker found: chain, Merkle roots, real Rekor entries (`log2025-1.rekor.sigstore.dev/139980606`, `139982216`, `139996500`, `140001932`), OTS calendar receipts, offline verifier (VALID / INVALID with position), erase, signing policy, plan and rate limits, viewer tokens, OAuth 2.1 (PKCE, code reuse, refresh rotation and reuse revocation), MCP (7 tools with titles and annotations) and restart persistence all behaved as specified.
- Verdict: server **ready for P3/P4 from the API side**; site **not shippable** until the 18 OWNER fields are filled (or the placeholders are suppressed in the build). Re-run tests 34–36 on commit 6739db4 before deploy; re-run 15–16 and 33 on the new server build to confirm per-plan cadence does what the pricing page says (free = daily, pro = 5 min, business = 1 min).
