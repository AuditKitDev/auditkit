# AuditKit v2 UAT report

Date 2026-10-06. Stack: `pnpm -r build`, server on :3301 (`AUDITKIT_ANCHORS=rekor,ots`, interval 30 s, `AUDITKIT_PROXY_TRUST=x-forwarded-for`), built site on :4331 behind `/tmp/claude-1000/uat/serve.mjs` (same prefix rules as `deploy/nginx-auditkit.conf`). Playwright Chromium 1280×800 and 390×844. Screenshots in `docs/qa/uat/`. Real Rekor and OpenTimestamps were used.

**Caveat.** The repo changed under the test: commits 950165f..5acc6e2 landed 23:49–23:53 and `packages/{server,verify}/dist` were rebuilt by someone else mid-run. Personas 1–2 ran on the 23:42 build; the verifier runs after 23:53 used the new verifier. The P2 checks were repeated on a clean rebuild (server :3302, `data2/`) and those results are the ones in the checklist. One consequence worth knowing: exports written by the old server (no `anchor_public_key` in the manifest) now verify as `VALID_UNANCHORED` under the new verifier, not `VALID`.

Verdict legend: PASS, FAIL, FRICTION (works but a real user would stumble).

## Persona 1: Priya, SaaS engineer

| # | Step | Expected | Observed | Shot | Result |
|---|---|---|---|---|---|
| 1 | Land on `/`, read hero | Clear claim, CTA | Headline + three CTAs, proof strip (chain/receipts/anchors/verifier). Clear. | priya-01, 02 | PASS |
| 2 | Live demo: log two events | Receipts appear as chain blocks | Blocks with hash/prev/sig; prev links highlighted. | priya-04, 05 | PASS |
| 3 | Verify chain | VALID | `VALID · 2 events · rooted through none · anchored through none` | priya-06 | PASS |
| 4 | Wait for anchor flip | Pill → anchored, Rekor ref | Flipped in <90 s. Label reads **"anchored to Rekor #log2025-1.rekor.sigstore.dev"**: the UI assumes a v1 `index/…` ref and prints the log host instead of the index. Verify line stays "anchored through none" until re-clicked. | priya-07 | FRICTION |
| 5 | Read `/docs` | Quickstart usable | Well structured. Says "install from source" with no instructions; TS quickstart has no `baseUrl` (self-hosters cannot follow it); `npx @auditkit/verify` is unpublished (404). | priya-08, 09 | FRICTION |
| 6 | Sign up (magic link from log) | Lands in `/app` | Link in log, auto-POST callback, project `saasco.example` created. | priya-13..16 | PASS |
| 7 | Create live key (read/write/erase/admin) | Key shown once | Modal with key + curl line. | priya-18..21 | PASS |
| 8 | TS quickstart verbatim | Runs | Verbatim text fails under plain `node` (TS syntax) and under `tsx` unless `"type":"module"`; after that, against `api.auditkit.dev` as written → `AuditKitError 502` (prod not up). With `baseUrl` added: receipts at positions 1–3. | – | FRICTION |
| 9 | Python quickstart verbatim (`.venv`) | Runs | **`NameError: name 'os' is not defined`** (snippet lacks `import os`). Fixed + `base_url` → position 0 receipt. | – | FAIL |
| 10 | Events in dashboard | Events listed | 4 rows, tenant filter, pills. Pill says **ROOTED** even once Rekor is FINAL; there is no "anchored" state in the table (API field `anchored` means rooted). | priya-23 | FRICTION |
| 11 | Open proof after a tick | Merkle path + receipts | Paths to tenant/project/global root, `OTS · PENDING`, `REKOR · FINAL`, "open in Rekor search". | priya-24 | PASS |
| 12 | Run verify (dashboard) | VALID | `VALID`, rooted #3, anchored #3, with plain-language labels. | priya-26 | PASS |
| 13 | Download export | JSONL | `auditkit-acme.jsonl`, 8 lines. | priya-27 | PASS |
| 14 | Verifier CLI as docs say | `npx @auditkit/verify` | **npm 404** (not published). From source (`packages/verify/dist/cli.js`): `VALID`, exit 0; `--pin` and `--online` work. | – | FAIL (owner: publish) |
| 15 | Viewer token, open in fresh context | Read-only page | Token modal with link + iframe snippet; page opens with no cookies. | priya-28, 29; dana-01 | PASS |
| 16 | Register signing key in dashboard, send signed event via SDK | Accepted, `client_sig` stored | Registered via Tenants → Signing keys (helpful openssl one-liner). Signed event accepted; `client_sig` present in export, **absent from `GET /v1/events/:id`** so the dashboard cannot show "customer-signed". Unsigned events still accepted with policy off (as documented). | priya-30, 31 | PASS |
| 17 | Erase an event, see audit row | Payload gone, `payload.erased` row | Row #4 `ERASED`, row #5 `payload.erased` by `key:k_…`; detail says "Erased · logged as event #5". Verify still VALID. | priya-32, 33 | PASS |
| 18 | Mobile 390×844 | Fits | Dashboard pages fit (390). **Landing page lays out at 785 px** (sections `#claims` cards and `#how` figure), so phones get a zoomed-out/side-scrolling homepage. Demo button unreachable under the sticky header on a plain scroll. | priya-m-01..13 | FRICTION |

Priya, verbatim: "The Python snippet doesn't run. Where do I `npm install` from? Why does the table say rooted when the proof says Rekor is final? What is `#log2025-1.rekor.sigstore.dev`?"

## Persona 2: Marcus, compliance lead

| # | Step | Expected | Observed | Shot | Result |
|---|---|---|---|---|---|
| 1 | Read "Connect from Claude" | Clear steps | Three sentences, correct. | marcus-01 | PASS |
| 2 | OAuth as Claude.ai (rehearsal script, paused for human steps) | 401 → DCR → authorize URL | Script printed the URL; client `oc_…` registered. | – | PASS |
| 3 | Open authorize URL in browser, not signed in | Redirect to login with `next` | `/login?next=/oauth/authorize?…` | marcus-02 | PASS |
| 4 | Magic link → consent page | Shows client, scopes, project | "Allow Claude (rehearsal) to access your audit log? Scopes: read write. Project: regulated.example (free)". Dark, blue-button page unlike the rest of the site, but clear. | marcus-04 | PASS |
| 5 | Approve → redirect carries code | `claude.ai/api/mcp/auth_callback?code=…` | Yes (`oac_…`); no `state` because the MCP client sent none. Token exchange → `oat_…`, 7 tools listed with title + annotations; script's `log_event`/`verify_range` passed. | marcus-05 | PASS |
| 6 | `log_event` ×4 (seed), `search_events` "what did admin.x do last week" | Filtered list | Correct events, newest first, payloads inline. `from: "last week"` (natural language) **silently returns `[]`** rather than an error; Claude would tell Marcus "nothing happened". | – | FRICTION |
| 7 | `list_tenants`, `verify_range` | Counts; VALID | `acme 9 events`; `valid:true … anchored_through:4`. Unknown tenant → `valid:false, reason:"unknown tenant"`: an LLM may read that as a broken chain. | – | FRICTION |
| 8 | `get_event`, `get_proof` ("prove event Y") | Event + proof | Event full; proof `{anchored:false}` before the tick, then full path. Fine. | – | PASS |
| 9 | `export_evidence` ("export for the auditor") | JSONL text | Manifest + events + roots returned (2000-line cap documented). | – | PASS |
| 10 | New connector user sees data | Sandbox project | `AUDITKIT_SANDBOX_PROJECT` unset here, so the project is empty on first connect. Set it in deploy. | – | FRICTION |
| 11 | Review `/security`, `/pricing`, `/privacy`, `/terms` | No over-claims | Terms: "supports log-integrity controls; it is not SOC 2, HIPAA, PCI or ISO certified" — correct hedge. Security page states the residual window honestly. Privacy discloses that `actor`/`target` are not erasable (a buyer will ask for guidance: "put ids, not emails, in actor"). Security says the key is "pinned in the verifier package" while `PINNED_KEYS` is empty (flagged `[OWNER]` on the same page). **Pricing lists "Signed receipts / client-side signing / crypto-shredding" under Pro and "Export API" under Business, yet all of them worked on Free in this run, and the page's own intro says every plan includes receipts.** `[OWNER]` placeholders as expected. | – | FRICTION |

Marcus, verbatim: "Which of these features do I actually get on Free? The pricing table and the first paragraph disagree. And I'd want the sign-in page to look like the product I'm authorising."

## Persona 3: Dana, auditor

| # | Step | Expected | Observed | Shot | Result |
|---|---|---|---|---|---|
| 1 | Server stopped, run verifier on Priya's export | VALID or explained | Old-server export: `VALID_UNANCHORED` exit 2, every line explained ("Rekor entry is in the log but no anchor key binds it to this server (manifest lacks anchor_public_key; pass --anchor-key)", "ots … pending (calendar attestation only…)"). Rebuilt-server export: **`VALID`, exit 0**, `coverage anchored: 0..2`, no network. Readable for a non-engineer: `ok/FAIL/?` per check, verdict last, exit codes match docs. `--pin` doc'd; `--anchor-key` mentioned in output but not in usage line. | – | PASS |
| 2 | Understand VALID_UNANCHORED vs VALID | Explained | Docs and CLI both say it: chain and signatures hold, no root has a verified public anchor. Clear. | – | PASS |
| 3 | Open viewer link (no cookies) | Tenant log | 8 events, filters, Verify, Export; erased row marked. | dana-01 | PASS |
| 4 | Open a proof | Path + receipts | Full proof, `REKOR · FINAL`, OTS pending with plain explanation. | dana-02 | PASS |
| 5 | Click through to Rekor | Public log entry | Link is **`https://search.sigstore.dev/` with no index** (v2 ref `host/index` not parsed) → empty search page. Same on `/anchors` ("#LOG2025-1.REKOR.SIGSTORE.DEV"). The auditor cannot reach the public entry from the UI. | dana-03, 05 | FAIL |
| 6 | Verify in viewer | VALID | `VALID`, rooted #7, anchored #6. | dana-03 | PASS |
| 7 | Export from viewer | JSONL | 14 lines; verifies offline. | – | PASS |
| 8 | Bad/expired token | Clear message | "This viewer link is invalid, expired or revoked. Ask the project owner for a new one." | dana-04 | PASS |
| 9 | Tamper and re-run (rebuilt export) | INVALID with position | actor edit → `INVALID (chain at position 1: event_hash does not match contents)`; payload edit → `payloads at position 1`; delete last event → `chain ends at 1, manifest says 2` + `root 0: event 2 missing`; swap → `first event is not position 0`; drop root lines → `VALID_UNANCHORED` (chain only) exit 2; wrong `--pin` → `INVALID (signatures: … does not match the pinned key)`. Editing the Rekor **ref string** leaves `VALID` (the ref is display-only; proof bytes are what is checked), so a tampered file can point an auditor at the wrong index. | – | PASS |
| 10 | Check the customer signature from the CLI | A flag | No CLI flag for client public keys (`clientKeys` is library-only) → `? client_sigs … no client keys given`. | – | FRICTION |

Dana, verbatim: "The file verifies, good. But 'open in Rekor search' shows me nothing, and I can't check the customer's own signature without writing code."

## Spec acceptance (§7)

| Phase | Criterion | Evidence | Result |
|---|---|---|---|
| P1 | tamper tests fail verify | Dana 9: actor/payload/truncate/reorder → INVALID with first bad position (export-level; DB-level tests are in the suite) | PASS |
| P2 | export, stop API, CLI vs Rekor+OTS → VALID; tamper → INVALID | Rebuilt build: `VALID` exit 0 with server killed; tampered → exit 1. Old-build exports → VALID_UNANCHORED. OTS stays "pending" until Bitcoin (hours); verdict relies on Rekor. | PASS (new build) |
| P3 | 7 tools from Claude.ai with a key | OAuth rehearsal + human consent + 7 tools by curl, annotations present. Real Claude.ai not exercised. | PASS (rehearsal) |
| P4 | deploy/listing | Not in scope; **nginx config as shipped 404s every `/app/projects/<id>` page** (README's rewrites missing). | FAIL |
| P5 | stranger signs up, key, logs, sees it, upgrades | Sign up → key → log → see: PASS. Upgrade: 501 "Billing is not configured" (owner stub). Plan gating of receipts/signing/export not enforced vs pricing table. | PASS with caveat |
| P6 | erase → verifier VALID; payload unrecoverable | Erased row, `payload.erased` audit event, verify VALID, payload `null`. | PASS |

## Blockers

1. `deploy/nginx-auditkit.conf` lacks the two `/app/projects/<id>` rewrites (`packages/web/README.md`): every project page is a 404 in production. Reproduced with the nginx rules verbatim before adding `REWRITES=1`.
2. Rekor ref format: anchor-rekor v2 emits `origin/index`; `rekorUrl` and the "Rekor #…" labels (Demo, dashboard, viewer, `/anchors`) assume `index/…`. The auditor's click-through to the public log is broken everywhere.
3. `@auditkit/verify` and the SDKs are unpublished; docs, dashboard and viewer all tell users to run `npx @auditkit/verify` (owner step), and the Python quickstart does not run as written.

## Verdict: ACCEPT WITH FIXES

Required before deploy: blockers 1–2; Python snippet `import os`; `baseUrl`/`base_url` and install-from-source in the quickstart; set `AUDITKIT_SANDBOX_PROJECT`. Then: events-table "anchored" state (and rename or document the API `anchored` field); refresh the demo verify line after the anchor flip; reconcile the pricing table with enforcement (or enforce); mobile landing width; MCP: reject non-ISO dates and distinguish "unknown tenant" from a failed verify; `--client-key` CLI flag; `GET /v1/events/:id` to return `client_sig`; consent page in site theme. Owner: publish packages, fill `PINNED_KEYS`, billing.
