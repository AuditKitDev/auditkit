# OWNER-TODO (packages/web)

Decisions only the owner can make. Each is also marked inline as `[OWNER: …]` or as a constant in `src/lib/site.ts`.

| # | Item | Where |
|---|---|---|
| 1 | Company legal name | `src/lib/site.ts` LEGAL_NAME; /privacy, /terms |
| 2 | Governing law / jurisdiction | `src/lib/site.ts` LEGAL_JURISDICTION; /terms |
| 3 | Data location (VPS region, EU or US) and hosting provider name | `src/lib/site.ts` DATA_LOCATION; /privacy "Where data lives" |
| 4 | Email provider for magic links (sub-processor name) | /privacy |
| 5 | Server-log retention period (e.g. 30 days) | /privacy table |
| 6 | Support and security mailboxes (currently support@ / security@auditkit.dev) and a response-time commitment | `src/lib/site.ts`; /support, /security |
| 7 | Repository URL is now `https://github.com/AuditKitDev/auditkit` (`src/lib/site.ts` REPO_URL, footer, pricing Self-host CTA, JSON-LD sameAs, blog footer). v2 lands there on a branch until merged; the site links the repository, not a branch. `LICENSE` (AGPL-3.0) is at the repo root. | `src/lib/site.ts` |
| 8 | Stripe prices: confirm $49 / $199 monthly USD, and whether yearly or invoice billing exists | /pricing footnote and FAQ; `src/lib/plans.ts` |
| 9 | Refund policy | /terms "Plans, limits, billing" |
| 10 | Uptime target or a real SLA for Business (site currently says "priority support", never "SLA") | /terms; `src/lib/plans.ts` Business extras |
| 11 | Status page URL (footer "Status" points at /anchors until one exists) | `src/lib/site.ts` STATUS_URL |
| 12 | Disk encryption statement for the VPS | /security "What a database administrator can do" |
| 13 | Generate the production Ed25519 signing key and add it to `PINNED_KEYS` in packages/verify; until then /security says the key is not yet generated and the site says "pass the key with `--pin`", never "pinned in the verifier package" | /security "Hashing and signing", /, blog receipts |
| 14 | Publish `@auditkit/sdk`, `@auditkit/verify` to npm and `auditkit` to PyPI (UAT 2026-10-06: `npx @auditkit/verify` is a 404 today). Then remove PUBLISH_NOTE, VERIFY_CLI_NOTE / VERIFY_CMD_REPO and the "until published" lines on /, /docs, Terminal, blog definition, /compare/workos, comparison strip, dashboard verify + overview, viewer, llms.txt, and the install-from-clone first lines of both quickstarts | `src/lib/snippets.ts`; docs/claims.md |
| 15 | nginx: `deploy/nginx-auditkit.conf` now has the `/app/projects/<id>/…` → `/app/projects/_/…` rewrite and `error_page 404 /404.html`; keep it matching the path table in README.md when a dashboard page is added | README.md, deploy/nginx-auditkit.conf |
| 16 | Pricing extras not on the site until they exist: "embedded viewer" (viewer tokens shipped; an embeddable widget beyond the iframe is not), "SLA" | `src/lib/plans.ts` |
| 17 | OG image (1200×630) per page; currently `twitter:card summary` with no image | `src/layouts/Base.astro` |
| 18 | List on npm, PyPI, GitHub README, Claude connector directory, G2/Capterra once there is something to review (research: review-site citation share 1–13%) | docs/research/seo-geo-aeo.md §8 |
| 19 | Confirm the untagged service commitments now marked inline: privacy requests answered within 30 days; 30 days' notice on price changes; 30 days to export after termination and 90 days' notice on shutdown; "Business plans get priority" on /support | /privacy, /terms, /support |
| 20 | Set `AUDITKIT_SANDBOX_PROJECT` in production to the seeded "Sample project" so every new account gets read access to it (the site says so); `ak_test_` keys are only a label today, the site says that too | packages/server/src/auth.ts; /docs#auth, /, blog mcp |
| 22 | Rekor v2 shard entries (`log2025-1.rekor.sigstore.dev/<index>`) have no public search page, so the UI shows them as text. If Sigstore publishes a per-shard entry URL, or the receipt starts carrying one, add it in `src/lib/api.ts` `rekorRef` | `src/lib/api.ts` |
| 21 | Per-plan anchor cadence (daily / 5 min / 1 min) is on the site; the server enforces it per plan in `anchorLoop.ts tick()` + `plans.ts` (landing now). If that lands differently, change `src/lib/plans.ts` and the copy on /, /pricing, /security, blog receipts in the same change | `src/lib/plans.ts` |
