# Code review: @auditkit/verify, @auditkit/sdk, auditkit (Python)

Date 2026-10-05. Read-only review of `packages/verify`, `packages/sdk`, `packages/sdk-python` at HEAD `b781e96`. Attack tests were run from `/tmp/claude-1000/review-sdk/review.test.ts` (copied into `packages/verify/src`, run, deleted; nothing committed). Baseline suites: verify 16/16, sdk 4/4, python 7/7 pass.

## Verdict: DO NOT SHIP (verifier). SDKs: SHIP WITH FIXES.

The verifier's hard checks are sound, but three gaps let an export that was tampered with get verdict `VALID` / exit 0, which contradicts "verify without trusting AuditKit".

## Findings, ranked

### 1. HIGH. A forged OpenTimestamps `pending` receipt verifies offline and counts as an anchor
`packages/verify/src/index.ts:333` treats any `v.ok` as `verified`. `packages/anchor-ots/src/anchor.ts:227` returns `ok: true, level: "calendar"` for a proof whose only attestation is a pending calendar URI. A pending attestation carries no signature; anyone can serialize one with `serializeDetached` for any digest.
Repro (test F3): replace `root.anchors` with `{kind:"ots", proof: base64(ots with pending attestation over global_root)}` → `anchors[0].status === "verified"`, verdict `VALID`.
Test F4 chains it: re-key the server key in the manifest, rewrite event 1, re-chain, rebuild `tenant_root`, set `path_to_project=[]`, `project_root=leafHash(tenant_root)`, same for global, attach the forged OTS receipt → every check `ok`, verdict `VALID`, exit 0, when run without `--pin`. The same rewrite with a Rekor receipt needs one public Rekor write (finding 4).
Impact: with the default unpinned run (and `PINNED_KEYS` is empty, `cli.ts:12`), an attacker who edits the file gets a clean VALID.
Fix: in `verifyAnchor`, treat OTS `level: "calendar"` as `receipt_status: pending` / status `unverified`, never `verified`; only `level: "bitcoin"` (header checked) anchors a root. Report calendar-only receipts under `rooted_unanchored`.

### 2. HIGH. Verdict `VALID` with positions that no root covers
`index.ts:167` sets `VALID` when every *root line* is anchored, ignoring `coverage.chain_only`. A normal export taken after the last anchor tick includes newer events with no root.
Repro (test F1): 12 events, tick, 3 more events, export → `coverage.chain_only [[12,14]]`, coverage check `unverified`, verdict `VALID`, exit 0.
Impact: an auditor reads exit 0 as "anchored" while the tail is vouched for only by server signatures..
Fix: `VALID` only when `chain_only` and `rooted_unanchored` are both empty; otherwise `VALID_UNANCHORED` with the ranges in `failed`-style detail.

### 3. HIGH. A payload stripped from the file is reported as an erasure
`index.ts:95,252`: `payload === undefined` counts as erased with no cross-check. The server appends a `payload.erased` event (target = erased id) for every real erasure (claims.md row 20: "a silent shred is impossible"), but the verifier never looks for it.
Repro (test F2): `delete ev.payload` on one line → `VALID`, `erased: 1`, no `payload.erased` event in the file.
Impact: whoever holds the export can hide one incriminating payload and still hand over a VALID report.
Fix: for each erased event, require a later event with `action` in {`payload.erased`, `payload.retention_shred`} and `target === id` inside the export; otherwise status `unverified` with "erased without erasure record" (fail if the range should contain it, i.e. erased event position < manifest.to_position and no record found).

### 4. MEDIUM. Rekor entries are accepted from any signer; server key is never pinned by default
`anchors.ts:11` builds `new RekorAnchor()` with no `publicKey`, so `verify.ts` skips `expectPublicKey`. Rekor is public: anyone can write a `hashedrekord` for a forged global root. `PINNED_KEYS` is `{}` (`cli.ts:12`), so by default the server key comes from the manifest. `--json` output (`cli.ts:88`) drops the "unpinned" note (test F9); only `checks[].summary` mentions it.
Fix: ship the production server key and Rekor signing key in `PINNED_KEYS` before release; add `pinned: boolean` and the Rekor entry's SPKI to the JSON report; print the entry key in human output so an auditor can compare it against `/.well-known/auditkit.json`.

### 5. MEDIUM. Malformed lines crash instead of reporting
`index.ts:256` (`payload: null`), `:144` (`anchors` missing), `:308` (`from_position > to_position` → `merkle: empty tree`) throw; the CLI prints the exception and exits 1 with no report (test F6). No schema validation on parsed lines.
Fix: validate each line's shape in `parseLines` (zod or hand-rolled) and fail the `manifest` check with the line number.

### 6. LOW. Linear loop over `manifest.to_position`
`index.ts:361` iterates every position for coverage even after the chain check failed; `to_position = 1e9` takes 6.3 s, `2^53` never returns (test F7). Build coverage from root intervals instead, and skip it after a hard failure.

### 7. LOW. External `tenant` is unbound
`tenant` on manifest and events is outside `event_hash`; rewriting it on every line is still `VALID` (test F8). Document it, or bind it through a client key id.

### SDK findings

8. MEDIUM. TS SDK has no timeout: `sdk/src/index.ts:91` calls fetch with no `AbortSignal`; a hung server hangs `log()` forever. Python defaults to 10 s. Add `timeoutMs` (default 10 000) via `AbortSignal.timeout`.
9. MEDIUM. Python: no `py.typed`, and the public methods are untyped (`__init__.py:112` `log(self, tenant, actor, action, ...)`, `:143` `public_key`, `:46` `client_key: Any`). Type checkers see `Any` everywhere. Add annotations, `py.typed`, `[tool.setuptools.package-data]`.
10. MEDIUM. `verifyReceipt` (`sdk/src/index.ts:28`) cannot check `payload_commit`: the receipt has no `salt`, so the client proves the server committed to *some* payload, not theirs. Return `salt` in the receipt (it is not secret to the client) and recompute `commitPayload` when `payload` is given. Python has no `verify_receipt` / `verify_client_sig` at all (parity gap).
11. LOW. Packaging: `sdk` and `core` have no `files` (tarball ships `src/`, tests, `tsconfig.json`); `verify` ships `dist/verify.test.js`; no `engines` though README says Node 22+; README says "Zero-dependency" but `@auditkit/sdk` depends on `@auditkit/core`; Python `version = "2.0.0"` vs TS `2.0.0-alpha.0`; no license/urls in `pyproject.toml`. `pnpm pack` of `@auditkit/verify` resolves to `@auditkit/{core,anchor-rekor,anchor-ots}@2.0.0-alpha.0`, none published, so `npm i -g @auditkit/verify` cannot work until those three ship first.
12. LOW. Network error on the last attempt throws the raw `TypeError` / `URLError`, not `AuditKitError`, contrary to both READMEs.
13. LOW. Lone surrogates: TS `clientSignable` hashes `"\ud800"`; Python raises `UnicodeEncodeError`. Reject in both.

## Verified sound
- `event_hash` recomputed from fields (`verifyChain`), `prev_hash` continuity from `manifest.prev_hash`, tenant roots rebuilt with `buildTree`, both Merkle paths checked, roots outside the range or with missing events fail (`roots`), duplicates, out-of-order, extra trailing event, swapped or duplicated root lines, altered `event_hash`, forged `server_sig`, wrong `--pin` all give `INVALID` with the right position (test S1 and existing suite).
- Rekor receipt for a different root fails the digest check; receipt attached to the wrong root fails.
- No network without `--online` (verify.ts, anchor.ts `getBlockHeader` undefined).
- Exit codes 0/2/1/64 as documented; `--json` shape stable.
- `clientSignable` bytes equal across core, TS SDK, Python (5 vectors incl. unicode, control chars, null/undefined target); server uses core directly; Python integration test proves acceptance.
- Idempotency keys: one `randomUUID`/`uuid4` per call, reused across all retries (TS `duplicate: true` test, Python 3-attempt test with one key); `erase`, key and policy calls not retried in both SDKs.
- Export streaming: TS buffers partial NDJSON lines and flushes the trailing one; Python uses `readline`.
- No secret in logs or error messages; retry sets match between SDKs; method and parameter names map 1:1 apart from finding 10.

## Verdict
Verifier: **DO NOT SHIP** until 1, 2, 3 are fixed (each is a VALID on a tampered file). SDKs: **SHIP WITH FIXES** (8, 9, 10 before publishing).
