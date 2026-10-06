# Server code review: packages/server/src

Date: 2026-10-05, against the working tree (includes the uncommitted anchor-public-key change). The 093af01 security fixes were re-verified and hold. Every finding was reproduced by a vitest probe (`/tmp/claude-1000/review-server/review.test.ts`, 19 tests); nothing committed.

## Verdict: SHIP WITH FIXES

F1 and F2 are blockers for any deployment that already has data files. The rest can follow.

## Findings, ranked

### F1. No column migrations: a pre-093af01 data file bricks ingest and anchoring
`db.ts:36` (`prev_root_hash`) and `db.ts:78` (`idem_hash`) were added inside `CREATE TABLE IF NOT EXISTS`, which is a no-op on an existing file. Only `tenant.require_client_sig` has an ALTER (`tenantKeys.ts:19`).
Repro: open a registry/project file built with the 77a644a DDL. Every `ingest` throws `no column named idem_hash` (all inserts list the column); `tick` throws `no column named prev_root_hash`. Deploy scripts predate 093af01, so a live box can hit this.
Impact: total write outage, anchoring stops, nothing in logs beyond `tick failed`.
Fix: in `openRegistry`/`openProject`, a `PRAGMA table_info` check + `ALTER TABLE ADD COLUMN` for both columns (same pattern as `tenantKeys.ts:17-19`), plus a `schema_version` row so the next change is not forgotten.

### F2. A stray `.db` file in `projects/` aborts every tick forever
`anchorLoop.ts:53` enumerates the directory; `openProject` (`db.ts:66`) throws `UnknownProjectError` for an id not in the registry; `tick` has no per-project try/catch. `db.ts:3` says "delete the project by deleting it", but deleting the row (not the file) or a leftover `foo.db` from a restore stops rooting for all projects; `maintain` is skipped too (`main.ts:66-70`), so pending OTS receipts never upgrade.
Repro: write an empty `projects/x.db`; `tick` rejects; unrooted events stay unrooted.
Fix: enumerate `SELECT id FROM project` instead of the directory, and wrap each project in try/catch with a log line.

### F3. Crash mid-tick leaves "anchored" events with an empty global root until unrelated activity
`anchorLoop.ts:60` returns before the dangling-root recovery at `:62-67`, so a project root orphaned by a crash between `rootProject` and `:72` is only re-rooted when some project has new events. During that window `getEvent().anchored` is true, `proofForEvent` (`:194`) returns `anchored: true, global_root: "", path_to_global_root: [], anchors: []`, and `verify` shows `rooted_through` ahead of `anchored_through`.
Repro: throw on the `INSERT INTO global_root`; second tick returns null; after one new event elsewhere all events land under exactly one anchored root (verified).
Fix: move the dangling scan above the early return and make it part of `rooted`; make `anchored` in proofs mean `global_root_id !== ''`.

### F4. Export errors are sent after a 200
`app.ts:178`, `webRoutes.ts:186`, `viewer.ts:94`: `exportLines` is a generator, so its validation (`events.ts:288` unknown tenant; `:301` `from > head+1` is a TypeError on `undefined.event_hash`) runs inside the stream's first `pull`. The client gets `200`, `content-disposition: attachment`, then a truncated body.
Fix: call `lines.next()` once (the manifest) before building the `Response`; a thrown `ValidationError` then reaches `onError`. Guard `:301` for `from > head + 1`.

### F5. Export materializes the whole range
`events.ts:228` `chainRows(...).all()`: exporting 50,010 events costs +76 MB heap before the first event line is written (255 ms total). The widening at `:296-300` is correct (requested 49,990..50,005 became 0..50,009 because the first root batch covered 0..49,999) but it means one big batch forces a full-chain load. Bulk ingest of 50k took 5.0 s; `rootProject` 385 ms (`:37` does one UPDATE per event; one range UPDATE would do).
Fix: `.iterate()` in `chainRows` for the export path; a byte cap on `export_evidence` (F9).

### F6. Retention creates one new event per tenant per window, forever
`anchorLoop.ts:135-136`: shred events carry a payload, so the next window shreds them and logs another shred. With retention 0 days, four runs produced 3, 6, 9, 12 shred events across three idle tenants. On the free plan every idle tenant grows by ~12 events/year and each counts toward `monthlyUsage`. The DELETE and the ingest are also separate transactions: a crash between them loses the audit record of the shred.
Fix: exclude `action = 'payload.retention_shred'` (or events with `payload IS NULL`) from the DELETE and from `perTenant`; wrap the loop body in `BEGIN IMMEDIATE` (`ingest` already handles nesting).

### F7. Stripe: a throwing webhook is marked processed; out-of-order events reinstate cancelled plans
`billing.ts:88` inserts the event id before applying it, so a malformed or failing event is never retried (reproduced: retry skipped). `:98-105` trusts `status` with no `created` ordering: a late-delivered `customer.subscription.updated` with `status: active` after `customer.subscription.deleted` sets the plan back to `pro` (reproduced). Stripe does not guarantee ordering.
Fix: run `applyStripeEvent` in a transaction with the insert last; store `ev.created` in `billing.updated_at` and ignore events older than the last applied for that subscription.

### F8. OAuth conformance
- `oauth.ts:150`: a token request with an unexpected content-type or malformed JSON is a 500 `{"error":{"code":"internal"}}` instead of `400 invalid_request` (RFC 6749 §5.2). Reproduced with `text/plain` and `{not json`.
- `oauth.ts:101`: `resource` is accepted and echoed but never checked against `${siteUrl}/mcp`, and tokens are not bound to it (RFC 8707 says reject unknown resources with `invalid_target`; the MCP spec requires clients to send it). Reproduced with `resource=https://evil.test/mcp`.
- `oauth.ts:106,113`: with a valid `client_id`/`redirect_uri`, invalid scope or `code_challenge_method=plain` returns a 400 page; §4.1.2.1 says redirect with `error=invalid_scope`/`invalid_request` and `state`. `state` does round-trip correctly on the success and deny paths.
- `oauth.ts:124`: the consent POST is protected by `SameSite=Lax` alone; a request with `Origin: https://evil.test` and the session cookie issues a code (reproduced). A one-line `Origin`/`Sec-Fetch-Site` check or a per-form nonce is cheap defence in depth.
- `oauth.ts:164`: `code_verifier` length/charset (43..128, RFC 7636 §4.1) is not checked.
- `oauth.ts:169-179`: a concurrent refresh (two in flight with the same token) revokes the family and logs the client out; common ASes allow a short grace window.
- `oauth_code`, `oauth_token`, `login_token`, `session` rows are never pruned.

### F9. MCP
- `mcp.ts:13`: scope and not-found errors are returned as ordinary text content without `isError: true`; thrown errors (unknown tenant in `export_evidence`) do get it. Hosts treat the first kind as success.
- `mcp.ts:101`: `log_event` has no length caps; a 200 KB payload is accepted (REST rejects at 64 KB, `app.ts:37`), and `tenant`/`actor`/`action` have no max. `export_evidence` (`:88`) caps lines, not bytes: 2000 lines × 64 KB payloads is 128 MB in one tool result (a 200 KB+ result reproduced with one event).
- 50 parallel `tools/call` on the stateless transport (`mcp.ts:117-126`) all succeeded with positions 0..49 exactly once. Sound.
Fix: share `eventSchema` with REST; `{...text(v), isError: true}` on error paths; byte cap.

### F10. Operations
- `main.ts:49`: `proxyTrust` defaults to `"none"`, which makes every visitor one bucket (`auth.ts:82-86`): 5 sign-in requests per 10 minutes for the whole site, 30 demo calls/minute. `deploy/.env.example` sets `x-real-ip`, so this is a trap for anyone not using it. Default to `x-real-ip` when `siteUrl` is https, or refuse to start.
- `db.ts:104`: project handles are cached forever and `/public/stats`, `applyRetention` and `tick` open every project (3 fds each). Fine for hundreds, needs an eviction policy or a raised `nofile` before thousands.
- `anchorLoop.ts:111` `LIMIT 50` with no `ORDER BY`: with 288 roots/day and OTS taking hours, upgrades of the newest roots are deferred until older ones finalize.

### F11. Maintainability
- The export stream handler is copied three times (`app.ts:173-186`, `webRoutes.ts:182-188`, `viewer.ts:89-96`), as are the `verify` and `proof` handlers and the `onError` envelope (`app.ts:107`, `webRoutes.ts:266`; viewer has none and inherits the REST one). One `exportResponse(c, lines, tenant)` and one `errorHandler` would remove ~40 lines and fix F4 once.
- `verifyRange` edge cases are silent: `to` beyond head verifies and clamps without saying so (and skips the head-hash check, `events.ts:235`); `from > to` and `from = head+1` return `valid: true, count: 0`; `from = head+2` returns `missing predecessor`. Return the effective range or reject out-of-range input.
- `as unknown as` at `anchorLoop.ts:111,179` and `viewer.ts:29` are harmless today but hide the column list; `events.ts:80` casts a 5-column row to `Omit<Receipt,"tenant">`, so a duplicate receipt lacks `tenant_id`, `project_id`, `occurred_at`, `payload_commit`. `openapi.ts` omits the tenant-key and policy routes. `db.ts:3` ("delete the project by deleting it") is wrong: the registry row recreates an empty file on the next tick/stats call. `getEvent().anchored` means "rooted", not "has a public receipt".

## Verified sound
- Chained global roots: over three ticks, two projects, two tenants each, `prev_root_hash` equals the previous root, leaf 0 rebuilds, every event's three-level proof verifies, `verifyRoots` reports `3/3 ok`, `anchored_through == head`.
- Dangling roots, once recovered, land under exactly one anchored global root (F3 is only about when).
- Export widening to whole root batches; `verifyChain` on the widened range.
- `ingest` transactions and savepoint nesting (erase/retention inside a transaction); idempotency conflict → 409; receipts verify against the published key.
- Session expiry is enforced in the query; cookie is `HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` in prod; logout deletes the row and sets `Max-Age=0`.
- `monthlyUsage` boundary at UTC month start (off-by-one-millisecond checked).
- PKCE S256, exact redirect match, code single use with family burn, refresh rotation with reuse detection, `cache-control: no-store` on token responses, RFC 9728 metadata with the path alias.
- MCP stateless transport under 50 parallel calls.
- Stripe signature check (constant-time, tolerance window) and replay dedupe.
