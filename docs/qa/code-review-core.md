# Code review: cryptographic core (core, anchor-rekor, anchor-ots)

Date 2026-10-05. Read-only review of `packages/{core,anchor-rekor,anchor-ots}/src`. Tests referenced below live in `/tmp/claude-1000/review-core/review-{core,rekor,ots}.test.ts`; run by copying into the package `src/` and `npx vitest run --root <pkg> src/<file>`.

## Findings

### Critical

**C1. A forged OTS "pending" receipt verifies `ok:true`, and the export verifier then reports VALID.**
`anchor-ots/src/anchor.ts:225-231`. A `.ots` file containing only a pending attestation (a URI string) is attacker-authored data; nothing in it is signed. `OtsAnchor.verify` returns `{ok:true, level:"calendar"}` for it, and the `Anchor` contract (`core/src/anchor.ts:26`) has no `level`, so `verify/src/index.ts:332` marks the root anchored and the export VALID with `attested_at` copied from the receipt. Repro: review-ots "forged pending receipt" (hand-built file, no network, `ok:true`). Impact: the public-anchor guarantee against a dishonest server is void for OTS. Fix: make calendar-level a distinct non-ok outcome in the contract (`{ok:false, pending:true}` or `{ok:true, level}` with the verifier only counting `bitcoin`), and never return `attested_at` for it.

### High

**H1. Rekor `attested_at` is not attested.**
`anchor-rekor/src/verify.ts:92-96`. v1: `proof.integratedTime` is read from the receipt and never verified; editing it to 0 still yields `ok:true, attested_at:1970-01-01` (review-rekor "attested_at is not attested"). v2: `attested_at` is `receipt.anchored_at`, the anchoring host's clock (`rekor.ts:123`). A Rekor checkpoint proves inclusion before tree size N, not time. Fix: for v1 store `verification.signedEntryTimestamp` and verify it (ECDSA over JCS of `{body,integratedTime,logID,logIndex}` under the pinned v1 key); for v2 verify a witness cosignature timestamp from the checkpoint or return `attested_at: null`/`ordering_only`. Same applies to OTS calendar level (covered by C1); Bitcoin level is sound (block time).

**H2. `commitPayload` lets an exporter equivocate on a payload.**
`core/src/chain.ts:23-25`. The preimage is `salt + JCS(payload)` with salt unvalidated. `commitPayload("0123…cde5", 1) === commitPayload("0123…cde", 51)`; `commitPayload("", x)` and non-hex salts are accepted (review-core "commitPayload"). The verifier (`verify/src/index.ts:256`) accepts any salt string, so an export can present a different numeric payload than was committed. Fix: `if (!/^[0-9a-f]{32}$/.test(salt)) throw`, or hash `salt_bytes || 0x00 || JCS`.

### Medium

**M1. Calendar whitelist glob crosses `/`: upgrade will contact any host a calendar names.**
`anchor-ots/src/calendar.ts:308-313`. `https://*.calendar.opentimestamps.org` becomes `^https://.*\.calendar\.opentimestamps\.org$`, so `https://evil.example/x.calendar.opentimestamps.org` matches and `upgrade()` GETs it (review-ots "whitelist", `calls[0]` is evil.example). The existing test (`ots.test.ts:82`) uses a URL without the dot and passes, giving false confidence. Fix: parse with `new URL`, match pattern against `origin`/hostname only.

**M2. Rekor v1 409 path is dead and crashes.**
`rekor.ts:135-139`. Rekor returns `{"code":409,"message":…}` plus a `Location` header; `Object.entries(res)[0]` yields `["code",409]` and `entry.verification` throws TypeError (review-rekor "v1 409"). Duplicates are realistic because `postJsonWithRetry` retries after a timeout on a POST that may have landed. Fix: on 409 GET the `Location` entry, or drop 409 from the accepted list.

**M3. JCS emits invalid JSON for sparse arrays and silently empties non-plain objects.**
`core/src/jcs.ts:17,19-25`. `canonicalize(Object.assign([], {2:1}))` is `"[,,1]"` (`map` skips holes); `Date`, `Map`, `Set` become `"{}"`; `Uint8Array` becomes `{"0":..}`. JSON.parse never produces these, so exports are unaffected, but in-process SDK/server callers get a wrong commitment with no error. Fix: `Array.from(value)` and reject non-plain prototypes (or throw on anything whose `JSON.stringify` output would differ).

### Low

- L1 `core/src/merkle.ts:43-53` `proofFor` has no range check: index 4 of a 4-leaf tree returns `[]`, negative/fractional indices return garbage. `leafHash`/`nodeHash` do not validate hex; `Buffer.from("zz","hex")` truncates, so `leafHash("zz") === leafHash("")`. Throw on `!/^[0-9a-f]{64}$/`.
- L2 `core/src/chain.ts:27-29,48-66` `eventHash` hashes whatever keys are on the object (an export record with `server_sig` fails `verifyChain`; `verify/` projects correctly, server callers must too), and the preimage carries no version/domain tag; adding a header field later silently rehashes history. Project to the ten named fields and prefix a tag. `verifyChain` also accepts a run starting at position>0 with `prev_hash=GENESIS`.
- L3 `anchor-rekor/src/http.ts:41-45` `Retry-After` sleep is added to the exponential backoff (1.3 s observed for `retry-after:1`+300 ms); HTTP-date form ignored; `attempts:0` throws `Error("undefined")`.
- L4 `verify.ts:85-88` errors in `checkOnline` (network, bad checkpoint) escape as rejections instead of a `Verdict`; `decodeProof` does not require 32-byte `hashes`/`rootHash` (harmless, fails by mismatch).
- L5 Publishability (working tree at review time; `package.json` files were being edited concurrently). `anchor-rekor` has no `files`: `npm pack` ships `src/`, `tsconfig.json`, and `dist/*.test.js` (which `import "vitest"`, not a dependency); `dist/fixtures.js` points at `./fixtures/*.json` that tsc does not copy. `anchor-ots` `files` still includes `dist/*.test.js`. `core` now excludes tests and sets `engines`; rekor and ots lack `engines` (Node ≥ 22 for `AbortSignal.timeout`). None set `publishConfig.access: public` (scoped packages default to restricted). `exports` has no `types` condition (works today via sibling `.d.ts`; fragile). Simplest: exclude `*.test.ts` from `tsconfig.include` in all three.
- L6 Maintainability: RFC 6962 hashing is implemented twice (`core/merkle.ts` hex, `anchor-rekor/rfc6962.ts` bytes); `V2Response.kindVersion`, `HttpError.body` unused; `hexToBytes` accepts uppercase while `rootBytes` requires lowercase; `core/anchor.ts:14` says `anchored_at` is when "the anchor accepted the root" but it is the local clock for Rekor v2 and OTS.

## Verified sound

- JCS: RFC 8785 §3.2.2 and §3.2.3 vectors byte-exact (UTF-16 key order puts U+1F602 before U+FB33; `\u0080` and `\u007f` literal); `-0`→`0`; `2^53+1`→`9007199254740992`; `1e21`→`1e+21`; `1e-7`; lone surrogate escaped as `\ud800`; no NFC (`é` ≠ `é`); `undefined` in arrays → `null`; bigint, NaN, Infinity, functions throw.
- Hash chain: position, tenant, prev_hash, payload_commit all in the preimage; edit, delete, reorder, truncate, re-hash rewrite detected (existing tests); erasure leaves chain valid; `eventHash`, `commitPayload`, `clientSignable` preimages cannot collide (distinct key sets / hex prefix).
- Merkle: for n=1..64 the root equals a recursive RFC 6962 MTH (largest power-of-two split); every leaf proof verifies; flipped side, dropped step, swapped steps, wrong leaf, and the n+1 tree root all fail; 0x00/0x01 leaf/node separation; interior node cannot pose as a leaf.
- Rekor: `rootFromInclusionProof` matches transparency-dev `VerifyInclusion` (inner/border split, index/size bounds, hash-count check); both live fixtures verify offline and reject tampered digest, index, checkpoint root, and foreign key; checkpoint parsing per C2SP (signed text includes trailing newline, em-dash lines, 4-byte key id, 32-byte root); Ed25519 key id `sha256(name‖0x0A‖0x01‖key)` and ECDSA `sha256(SPKI)` equal the trusted_root logIds; v1 body with an RSA key returns a verdict, does not throw; non-canonical bodies and unknown kinds/versions rejected; v2 origin must equal the key name; retries on 429/5xx/network only.
- OTS: varuint ≤ 2^53, varbytes caps (4096 op args, 8192 attestation, 1000 URI), 4096-byte message cap, 256-depth limit; 3000 random/mutated/truncated inputs threw only `OtsFormatError`; ops are recomputed from the digest at parse so the path cannot be asserted; serialize/parse byte-exact on both fixtures and a multi-attestation, multi-op node; Bitcoin check compares reversed explorer hex against the 32-byte node (hello-world block 358391), first mismatch fails closed; `final` without a Bitcoin attestation rejected; nonce (append 16 random bytes, sha256) before any calendar sees the root; `upgrade` only merges responses parsed against the pending node's own message.

## Verdict

SHIP WITH FIXES: C1 (calendar-level must not count as anchored), H1 (verify or drop `attested_at`), H2 (validate salt), M1 (host-only whitelist), M2 (409 path), L5 (`files`/metadata before publishing). M3 and L1–L4, L6 can follow.
