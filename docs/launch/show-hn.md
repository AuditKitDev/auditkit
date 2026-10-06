# Show HN: verifier-first draft

Written 2026-10-06 from `docs/research/gtm.md` §3 and `docs/claims.md`. Replaces `~/Projects/auditkit/SHOW-HN-DRAFT.md`, which must not be posted (it sells the deleted product and breaks the no-false-claims rule). Every factual sentence below is followed by an HTML comment naming the file or the live check that proves it; the owner checks the comment, not the prose. Live checks were run 2026-10-06 13:38–13:40Z against `api.auditkit.dev`.

## Title (73 chars)

```
Show HN: AuditKit – audit logs you can verify with our servers off (AGPL)
```

## URL

```
https://auditkit.dev/audit
```

Not `/login`, not a blog post. `/audit` is AuditKit's own platform log, readable and exportable with no account. <!-- packages/web/src/pages/audit.astro; packages/server/src/selfAudit.ts buildSelfAuditRoutes: GET /public/self/events, /verify, /export, no auth -->

## First comment (post as the author, within a minute of the submission)

```
I'm the one person who built this, so here is the part you can check instead of taking my word.

AuditKit is an audit-log API. Each event is hash-chained to the previous one per tenant, signed on ingest with an Ed25519 key, rolled into Merkle roots on a timer, and the root is written to Sigstore Rekor and stamped by OpenTimestamps calendars. The export is a JSONL file an auditor can verify with our servers off.

Things to try with no account:

1. https://auditkit.dev/audit is our own platform log: sign-ins, API-key and tenant-key changes, OAuth consents, erasures, demo resets, retention runs. It is chained and anchored exactly like a customer project. People appear as hashed handles (u:3f9a…), never emails.

2. The demo on the front page logs an event against a throwaway project and shows the signed receipt linking to the previous event. Tenant is a hash of your IP, 30 requests a minute, wiped nightly.

3. Download the export and run the verifier. The npm package is not published yet, so this is a clone and build, a few minutes rather than sixty seconds:

   curl -o self.jsonl https://api.auditkit.dev/public/self/export
   git clone https://github.com/AuditKitDev/auditkit && cd auditkit && git checkout v2
   pnpm install && pnpm -r build
   node packages/verify/dist/cli.js ../self.jsonl --pin "$(curl -s https://api.auditkit.dev/.well-known/auditkit.json | jq -r .server_public_key)"

   It re-hashes every event, walks the chain, checks each signature against the key you pinned, rebuilds every Merkle root and checks the Rekor inclusion proofs from the bytes in the file. No network call unless you add --online. Exit 0 is VALID.

   Now edit any field of any event line and run it again. You get:

   FAIL chain       event_hash does not match contents [position 5]
   INVALID (chain at position 5: event_hash does not match contents)

   and exit code 1. That is the whole product: a database admin at AuditKit can change a row; they cannot make it hash to a root that is already in Rekor.

4. The Rekor entries. Every root in the export carries its Rekor inclusion proof and the signed checkpoint (today's newest is log2025-1.rekor.sigstore.dev/140534082). The verifier checks the proof against Rekor's log key. The 2025 shard has no public search page, so "look it up" means the proof bytes in the file, not a link.

Where it is weak, so you do not have to go looking:

- OpenTimestamps receipts stay "pending" until the Bitcoin attestation lands, which takes hours. As I write this every OTS receipt in our own export is pending; only the Rekor receipts are final, and the verifier says so on each line.
- Rekor proves existence and order, not time. The verifier prints "Rekor gives no trusted time" next to every Rekor receipt. Time comes from OTS once it is final.
- Events since the last anchor tick are chained and signed but in no public log yet. I could delete them; the receipts you kept would prove I did. The tick is daily on Free, every 5 minutes on Pro, every minute on Business.
- The server key is loaded from the environment, not the database. If it leaks, receipts for unanchored ranges could be forged; anchored ranges cannot be rewritten.
- The verifier warns "server key is unpinned" unless you pass --pin. Its built-in key list is empty until I pin the production key.

Erasure: the chain commits to sha256(salt || payload), not the payload. A GDPR erasure deletes the payload and the salt; chain, roots and anchors still verify, and the erasure is appended to the same chain as a payload.erased event. This is the salted-hash pattern in EDPB Guidelines 02/2025.

Plain facts: solo developer, zero customers, no SOC 2 report. AGPL-3.0; self-host is one Node process with SQLite and the same verifier. Running it inside your own product for your own logs does not trigger the AGPL; offering it as a service to others does, and then you publish your changes. Free tier is 10k events a month with daily anchoring; Pro $49, Business $199; every feature is on every plan, the tiers buy volume, retention and tick rate. There is an MCP server at /mcp in the same process, seven tools, no erase tool.

What I want feedback on:
1. The threat model at https://auditkit.dev/security. What did I miss?
2. Three Merkle levels (tenant -> project -> global, one Rekor entry per tick) versus one Rekor entry per tenant root. Is the batching worth the extra path?
3. Would your auditor actually run the verifier, or is "the vendor says tamper-evident" already enough for them? If the second, this product has no reason to exist and I would rather know.
4. The export format (manifest, event and root lines in JSONL). Anything that would stop you writing your own verifier in an afternoon?
```

### Proof of each claim in the comment

| Sentence | Proof |
|---|---|
| hash-chained per tenant, Ed25519 on ingest, Merkle roots on a timer, root to Rekor and OTS | `packages/core/src/chain.ts` (`chainEvent`, `eventHash`), `packages/server/src/signing.ts`, `packages/server/src/anchorLoop.ts` `tick()`, `packages/anchor-rekor/src/entry.ts`, `packages/anchor-ots/src/anchor.ts` |
| /audit lists sign-ins, key changes, OAuth, erasures, demo resets, retention; hashed handles, no emails | `packages/server/src/selfAudit.ts` (`emailHandle`, `SELF_PROJECT`), `packages/server/src/web.test.ts` "self-audit" (no `@example.com` in output); live `/public/self/events` 13:39Z shows actions `customer.erase`, `tenant_policy.set` |
| demo: throwaway project, tenant = IP hash, 30 req/min, reset nightly | `packages/web/src/pages/index.astro` demo section; `docs/web-api.md` "Demo"; `packages/server/src/auth.ts` rate limiter |
| npm package not published | `npm view @auditkit/verify` → 404 at 13:38Z; `docs/claims.md` "Verifier CLI" row |
| `git checkout v2` | `origin/v2` at `4687b48`, in sync with local; GitHub default branch is `main` (v1). Drop this line once v2 is merged (OWNER-TODO 7) |
| `--pin` key from `/.well-known/auditkit.json` `server_public_key` | `packages/server/src/app.ts` well-known route; live response 13:39Z carries `server_public_key` (Ed25519 SPKI) |
| re-hashes, walks chain, checks signatures, rebuilds roots, checks Rekor proofs offline; `--online`; exit 0 = VALID | `packages/verify/src/index.ts` (`verifyExport`, `CheckName`), `packages/verify/src/cli.ts` (`EXIT`, `--online`), `packages/verify/src/anchors.ts` |
| `FAIL chain event_hash does not match contents [position 5]`, exit 1 | Live run 13:39Z: export of positions 0..20 → `VALID`, exit 0; after editing `action` at position 5 → the two lines quoted verbatim, exit 1. Format strings in `cli.ts` `printHuman` |
| newest Rekor ref `log2025-1.rekor.sigstore.dev/140534082`; no public search page for the 2025 shard | Live `/public/anchors` 13:39Z; `docs/claims.md` "Rekor refs" row; `https://log2025-1.rekor.sigstore.dev/api/v2/log/entries/140534082` → 404 at 13:40Z. Update the number on the day |
| verifier checks the proof against Rekor's log key | `packages/anchor-rekor/src/checkpoint.ts`, `packages/anchor-rekor/src/verify.ts` |
| OTS pending until Bitcoin, hours; every OTS receipt in our export is pending today | `packages/anchor-ots/src/anchor.ts` (`level: "pending"` / `"final"`); live verifier output 13:39Z: 7 of 14 receipts verify, each OTS line `pending (calendar attestation only…)`. Re-check on the day; if some are final, change the sentence |
| "Rekor gives no trusted time" printed per receipt | live verifier output 13:39Z, line `rekor … verified (existence and order; Rekor gives no trusted time)` |
| unanchored tail; insider can delete; receipts prove it; daily / 5 min / 1 min | `packages/server/src/anchorLoop.ts`, `packages/server/src/plans.ts` (`anchor_interval_seconds` 86400 / 300 / 60); `/security` residual-risk paragraph (`docs/claims.md`) |
| key from environment, not DB | `packages/server/src/main.ts`, `packages/server/src/signing.ts` |
| "server key is unpinned" warning; built-in list empty | `packages/verify/src/cli.ts` `PINNED_KEYS = {}` and the `notes.push("warning: server key is unpinned…")` line; live output 13:39Z |
| commit = sha256(salt ∥ payload); erase deletes payload and salt; `payload.erased` event appended | `packages/core/src/chain.ts` `commitPayload`; `packages/server/src/events.ts` `erase()`; EDPB citation in `docs/research/buyer-need.md` §6 |
| solo, zero customers, no SOC 2 | `docs/claims.md` "Not claimed, on purpose"; owner rule (10) |
| AGPL-3.0; one Node process, SQLite | `LICENSE`; `packages/*/package.json` `"license": "AGPL-3.0-only"`; `packages/server/src/db.ts` (`node:sqlite`) |
| Free 10k/month with a daily tick, Pro $49, Business $199, every feature on every plan | `packages/server/src/plans.ts` `PLANS`; `docs/claims.md` "Every feature is on every plan" row (UAT 2026-10-06) |
| MCP at /mcp same process, seven tools, no erase tool | `packages/server/src/mcp.ts` (seven `registerTool` calls, `log_event` is the only write) |
| three Merkle levels, one Rekor entry per tick | `packages/core/src/merkle.ts`; `packages/server/src/anchorLoop.ts` `proofForEvent` |
| export lines: manifest, event, root | live export 13:39Z: `type` values `{manifest, event, root}` |

Not in the comment, on purpose: any number of users, stars, events/sec, "trusted by", "SOC 2 ready", "tamper-proof", Rekor timestamps, "three companies". None is true of the code or cited in `docs/research/`.

## Expected objection and the answer

The immudb thread (`docs/research/gtm.md` §3): "There, I did it for you in PostgreSQL: ALTER TABLE table_name SET (autovacuum_enabled = false); Snark aside, it's still not 100% clear what's the upside". Answer with item 3 above, not a feature list: a Postgres table with a trigger cannot hand a third party a Rekor inclusion proof for the row, and a DBA with `ALTER` can turn the trigger off. Link `/compare/postgres`. <!-- packages/web/src/pages/compare/ -->

## HN rules check (quotes from `docs/research/gtm.md` §3, fetched 2026-10-06 13:25–13:27Z)

| Rule (https://news.ycombinator.com/showhn.html) | This post |
|---|---|
| "Show HN is for something you've made that other people can play with." | `/audit`, the demo, the export and the verifier all work with no account |
| Off topic: "blog posts, sign-up pages, newsletters, lists" | URL is `/audit`, a live page, not `/login` or a post |
| "ideally without barriers such as signups or emails" | Nothing in the first comment needs a signup; the Free tier is mentioned once, last |
| "Please don't ask friends to upvote or comment." | Do not. No X thread, no Discord ping, no "please upvote" anywhere |
| https://news.ycombinator.com/yli.html: "Launch HN is a way for YC startups to launch on Hacker News." | This is Show HN, not Launch HN |
| Title: no superlatives, under 80 chars, starts "Show HN:" | 73 chars, states what it is and the licence |

Timing (gtm.md §5 week 3): Tue–Thu morning US, nothing else published that day, every comment answered within the hour from the owner's account.

## Pre-post checklist

State at 2026-10-06 13:40Z in brackets. Everything marked [OWNER] needs the owner's account or decision.

- [ ] `https://auditkit.dev` serves the v2 build. [Today the apex serves the v1 Next.js site: `/audit` → 404, `/mcp` → 404. `api.auditkit.dev` is v2 and healthy.] `deploy/nginx-auditkit.conf` is the intended config. The post is dead on arrival until this is done.
- [ ] `/audit` shows more than 50 events. [21 events, positions 0..20, all rooted and Rekor-anchored.]
- [ ] Every claim in "Proof of each claim" re-checked on the morning of the post; paste the real verifier output and today's Rekor ref into the comment.
- [ ] `/anchors` OTS status. [Live `/public/anchors` shows every OTS receipt `"status":"final"` seven seconds after the root, while the export's OTS receipts verify as `pending`. One of them is wrong. Fix before HN finds it; the comment says "pending", which matches the verifier.]
- [ ] [OWNER] `@auditkit/verify` published to npm? [404.] If yes, replace the clone and `node packages/verify/dist/cli.js` lines with `npx @auditkit/verify self.jsonl --pin …` and delete "a few minutes rather than sixty seconds". If no, leave as written.
- [ ] [OWNER] Repo URL public and the code the post links is on the default branch. [Repo is public; v2 lives on `origin/v2`; `main` is v1; GitHub licence shows `NOASSERTION` although `LICENSE` is AGPL-3.0.] Merge v2 to main (OWNER-TODO 7) or keep `git checkout v2` in the comment. Fix the licence detection so the repo page says AGPL-3.0.
- [ ] [OWNER] Production Ed25519 key pinned in `packages/verify/src/cli.ts` `PINNED_KEYS` (OWNER-TODO 13). If not, the `--pin "$(curl … | jq …)"` line stays and the "built-in list is empty" bullet stays.
- [ ] `/security` threat model page reads correctly, since question 1 sends people there.
- [ ] Python package rename to `auditkit-sdk` committed (in progress in the working tree) so the quickstart on `/docs` does not point at Lexsi Labs' `auditkit`.
- [ ] [OWNER] Submit from the owner's own HN account on a Tue–Thu morning US; have the first comment in the clipboard; stay at the keyboard for six hours.
- [ ] Nothing else published that day (no Product Hunt, no newsletter, no LinkedIn).
- [ ] Success bar from gtm.md E3: ≥50 points or ≥20 comments unlocks Product Hunt and paid newsletters; ≤7 points means no more broadcast spend.

## Lobsters / r/devops variant

Lobsters (https://lobste.rs/about, fetched 2026-10-06 13:27Z): "self-promo should be less than a quarter of one's stories and comments". Post it only from an account with at least three non-AuditKit stories or comments for every AuditKit one; tag `security`, `show`. r/devops: the subreddit rules returned 403 during research and are UNVERIFIED (`gtm.md` §4.1, §9); [OWNER] read r/devops rules in a browser before posting and do not post if self-promo is disallowed.

```
AuditKit: audit logs you can verify offline, anchored to Sigstore Rekor and OpenTimestamps (AGPL, one developer, no customers yet)
I built this. Try it with no account: https://auditkit.dev/audit is our own platform log; `curl https://api.auditkit.dev/public/self/export` and run the verifier from the repo (README has the three commands), then edit a line and watch it fail at that position.
Weak spots up front: OTS receipts are pending until Bitcoin confirms, Rekor gives order not time, and events since the last anchor tick are signed but not yet in any public log. Threat model: https://auditkit.dev/security
```
