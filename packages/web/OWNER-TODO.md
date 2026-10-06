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
| 7 | Public repository URL (AGPL) | `src/lib/site.ts` REPO_URL; footer, pricing Self-host CTA, JSON-LD sameAs |
| 8 | Stripe prices: confirm $49 / $199 monthly USD, and whether yearly or invoice billing exists | /pricing footnote and FAQ; `src/lib/plans.ts` |
| 9 | Refund policy | /terms "Plans, limits, billing" |
| 10 | Uptime target or a real SLA for Business (site currently says "priority support", never "SLA") | /terms; `src/lib/plans.ts` Business extras |
| 11 | Status page URL (footer "Status" points at /anchors until one exists) | `src/lib/site.ts` STATUS_URL |
| 12 | Disk encryption statement for the VPS | /security "What a database administrator can do" |
| 13 | Generate the production Ed25519 signing key and add it to `PINNED_KEYS` in packages/verify; until then /security says the key is not yet generated | /security "Hashing and signing" |
| 14 | Publish `@auditkit/sdk`, `@auditkit/verify` to npm and `auditkit` to PyPI; then remove the "publish with v2.0.0" note | `src/lib/snippets.ts` PUBLISH_NOTE; docs/claims.md |
| 15 | nginx: add the two `/app/projects/<id>/…` → `/app/projects/_/…` rewrites from README.md next to the API proxy block | README.md |
| 16 | Pricing extras not on the site until they exist: "embedded viewer" (viewer tokens shipped; an embeddable widget beyond the iframe is not), "SLA" | `src/lib/plans.ts` |
| 17 | OG image (1200×630) per page; currently `twitter:card summary` with no image | `src/layouts/Base.astro` |
| 18 | List on npm, PyPI, GitHub README, Claude connector directory, G2/Capterra once there is something to review (research: review-site citation share 1–13%) | docs/research/seo-geo-aeo.md §8 |
