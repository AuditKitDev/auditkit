# AuditKit: SEO / GEO / AEO research

Written 2026-10-05. Claims carry source (fetched), quote, fetched_at; UNVERIFIED = not fetched. SERP caveat: the search tool is a web index, not a Google page-1 capture; re-check in Search Console once live. People Also Ask could not be fetched; long-tail questions come from ranking H2s/FAQs.

## 1. Keyword landscape (what ranks, intent)

| Seed | Who holds the results (domains/titles) | Intent | Long-tail seen in ranking H2/FAQ |
|---|---|---|---|
| audit log SaaS | frontegg.com, ory.sh "Why does your SaaS application need audit logs?", vendor docs | informational | "why does a SaaS need audit logs" |
| immutable audit log | hoop.dev (5+ posts), hubifi.com "What Are Immutable Logs?" (2025-11), glossaries | definitional | "how are immutable logs achieved" |
| tamper-proof audit log | nhimg.org glossary, mattermost.com, arXiv BlockAudit, the47network | definitional | "tamper-evident vs tamper-proof" |
| audit log API | monday.com, langdock, rudderstack docs; hoop.dev | navigational to vendor docs | "pull audit logs into a SIEM" |
| audit trail for SaaS | velt.dev "How to Add an Audit Trail to Your SaaS Product" (2026-05), salesforce, ssojet | how-to / buyer | "SaaS vs custom", "hash chains" |
| SOC 2 audit log requirements | hoop.dev x2, oneuptime, konfirmity (2026-02), certpro | compliance | "which TSC criteria (CC6.1, CC7.2, CC7.3)" |
| audit log retention requirements | aptible, syskit, knack, accountablehq (all HIPAA) | compliance; HIPAA dominates | "how long must I retain audit logs" |
| WorkOS audit logs alternative | supertokens.com, dev.to "WorkOS Audit Logs vs LogMint", listicles | comparison, low volume | "WorkOS audit logs pricing" |
| Drata alternative audit log | sprinto.com, capterra, thectoclub GRC listicles | GRC comparison; audit-log term ignored | skip as a page |
| build vs buy audit logging | scalekit, safepaas, datasnipper; no engineering page | decision | "factors: security, cost" |
| postgres audit log immutable | hoop.dev, immudb press (2026-05), techinterview.org | engineering | "can a DBA alter the log" |
| crypto shredding GDPR | oneuptime (2026-02), conduktor.io, thoughtworks radar, sota.io | engineering + legal | "valid for Article 17?" |
| merkle tree audit log | pangea.cloud (2022), IETF sunlight draft, designgurus.io | engineering | "inclusion / consistency proofs" |
| Rekor transparency log | openSUSE package pages, docs.sigstore.dev | navigational; thin | "what is a hashedrekord" |

Evidence:
- source: https://www.hubifi.com/blog/immutable-audit-log-guide | claim: definition-first guide with FAQ, no tables | quote: "What Is an Immutable Audit Log? ... Frequently Asked Questions" | fetched_at: 2026-10-05
- source: https://velt.dev/blog/how-to-add-audit-trail-to-saas-product | claim: one-line definition, one table, 6-question FAQ | quote: "An audit trail is a time-ordered, immutable record of every action taken inside your app." | fetched_at: 2026-10-05
- source: https://nhimg.org/glossary/tamper-proof-audit-log/ | claim: one-sentence glossary definitions rank | quote: "A tamper-proof audit log is an access record designed to resist alteration while preserving enough detail to reconstruct who accessed what, when, and from where." | fetched_at: 2026-10-05
- source: https://www.konfirmity.com/blog/soc-2-logging-and-monitoring | claim: SOC 2 pages prescribe hashing + append-only | quote: "Store logs in write-once media or append-only storage, and hash logs to detect tampering." | fetched_at: 2026-10-05

Gap: nobody ranking defines "tamper-evident" precisely or explains external anchoring. That is AuditKit's definitional opening.

## 2. What AI answer engines cite today

Direct capture of ChatGPT/Perplexity answers was not possible (UNVERIFIED). Citation studies:
- source: https://derivatex.agency/report/chatgpt-software-recommendation-sources/ | claim: ChatGPT cites vendor pages most for B2B SaaS buyer prompts | quote: "51% of cited sources are vendor-owned content. Software companies ranking themselves." (2026-06-18) | fetched_at: 2026-10-05
- source: https://learn.g2.com/do-software-review-platforms-show-up-more-in-the-bottom-of-the-funnel | claim: review platforms get cited more at evaluation stage | quote: "Review-platform citation share rises to 13.2%, roughly 1.8x discovery's 7.4%." (2026-02-13) | fetched_at: 2026-10-05
- source: https://ahrefs.com/blog/does-being-mentioned-on-highly-linked-pages-influence-ai-mentions/ | claim: linked-page mentions predict Google AI visibility, not ChatGPT | quote: "Google favors brands and Perplexity seems to show some favoritism as well. What's surprising is the weakness of ChatGPT here." (0.70 / 0.40 / 0.12) | fetched_at: 2026-10-05
- Disagreement: Derivatex puts review aggregators at 1.1%; G2's Profound-based study at 7-13%. Both agree vendor pages dominate. Write the comparison pages yourself; list on G2/Capterra as a hedge.

Ranking pages for "how to make audit logs immutable" share one shape: definition, then a numbered list of mechanisms (append-only, hash chain, WORM, signing). For "best tamper-evident service" no page answers; results are glossaries and transparency.dev. A comparison table (WorkOS, Pangea/CrowdStrike, Datadog, pgaudit, immudb, AuditKit) on anchor, verifier, retention, price would be the only candidate.

## 3. GEO/AEO practices with evidence

- Google: nothing special. source: https://developers.google.com/search/docs/appearance/ai-features | quote: "There are no additional requirements to appear in AI Overviews or AI Mode"; "a page must be indexed and eligible to be shown in Google Search with a snippet" | fetched_at: 2026-10-05. No `nosnippet`/`max-snippet`.
- OpenAI: source: https://developers.openai.com/api/docs/bots | quote: "Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers" | fetched_at: 2026-10-05.
- Anthropic: source: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler | quote: "Claude-SearchBot navigates the web to improve search result quality for users." | fetched_at: 2026-10-05. Allow ClaudeBot, Claude-User, Claude-SearchBot.
- llms.txt: cheap, no measured effect. source: https://llmstxt.org/ | quote: "Agents are best served by concise, expert-level information gathered in a single, accessible location." | fetched_at: 2026-10-05. source: https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/ | quote: "97% of llms.txt files received zero requests in May 2026." (Ahrefs, 137,000 domains) | fetched_at: 2026-10-05. Ship it; expect nothing.
- FAQPage and HowTo rich results are gone. source: https://developers.google.com/search/docs/appearance/structured-data/faqpage | quote: "This feature will no longer appear in Google Search starting May 7, 2026." | fetched_at: 2026-10-05. source: https://developers.google.com/search/docs/appearance/structured-data/how-to | quote: "this rich result is no longer shown in search results" (2023-09-14) | fetched_at: 2026-10-05. Keep FAQ text, drop the markup.
- SoftwareApplication needs price and a rating. source: https://developers.google.com/search/docs/appearance/structured-data/software-app | quote: for free apps "set offers.price to 0"; a rating or review is required | fetched_at: 2026-10-05. Emit without `aggregateRating` until a real review exists.
- Organization on the homepage. source: https://developers.google.com/search/docs/appearance/structured-data/organization | quote: "There are no required properties; instead, we recommend adding as many properties that are relevant to your organization." | fetched_at: 2026-10-05
- Article/BlogPosting/TechArticle for posts. source: https://developers.google.com/search/docs/appearance/structured-data/article | quote: "Adding Article structured data ... can help Google understand more about the web page and show better title text, images, and date information" | fetched_at: 2026-10-05. Google lists Article/NewsArticle/BlogPosting, so use `BlogPosting`.
- Claude directory: source: https://claude.com/docs/connectors/building/submission | quote: "by default, lists it as a Community connector with no action from you" | fetched_at: 2026-10-05
- Direct-answer pattern: every fetched winner opens with a one-sentence definition under the H1. Only Velt uses a comparison table.

## 4. Competitor content that works

| Vendor | Page | Format | What it does well | Evidence |
|---|---|---|---|---|
| WorkOS | /audit-logs | product landing | pricing block: "$99 per million events stored", "$125/month per connection" | source: https://workos.com/audit-logs, fetched_at: 2026-10-05 |
| WorkOS | /blog/audit-logs-are-a-product-feature (2026-08-04) | essay | defines tamper-evidence, does not ship it | quote: "Tamper-evidence means any modification is detectable, typically through cryptographic hashing that chains each record to the ones before it" |
| WorkOS | /docs/audit-logs/introduction | docs | retention and SIEM, no immutability | quote: "Audit Log Events are retained for 30 days by default", fetched_at: 2026-10-05 |
| Pangea | /blog/audit-logs-what-why-and-how (2024-08), /blog/marvelous-merkle-trees (2022) | blog | still ranks for merkle terms; product page 301s to CrowdStrike | source: https://pangea.cloud/services/secure-audit-log/ -> crowdstrike.com falcon-aidr, fetched_at 2026-10-05; CrowdStrike 10-K says acquired 2025-09-26 (UNVERIFIED) |
| Datadog | docs Audit Trail | docs | retention tiers; no immutability claim | quote: "Default retention is 90 days when enabled", fetched_at: 2026-10-05 |
| Vanta / Drata | no audit-log page; guessed URLs 404 | – | rank for SOC 2, not audit-log terms | fetched_at: 2026-10-05 |

Takeaway: the tamper-evident niche is vacated (Pangea folded into CrowdStrike); WorkOS defines it but ships append-only without proofs.

## 5. Technical SEO for Astro

- Sitemap: `npx astro add sitemap`; needs `site` in config. source: https://docs.astro.build/en/guides/integrations-guide/sitemap/ | quote: "sitemap-index.xml and sitemap-0.xml files will be added to your output directory"; robots line "Sitemap: https://<YOUR SITE>/sitemap-index.xml" | fetched_at: 2026-10-05
- RSS: `@astrojs/rss`, `src/pages/rss.xml.js`, head link `rel="alternate" type="application/rss+xml"`. source: https://docs.astro.build/en/recipes/rss/ | fetched_at: 2026-10-05
- Canonical: `new URL(Astro.url.pathname, Astro.site)`. source: https://docs.astro.build/en/reference/api-reference/ | quote: "Astro.site ... returns a URL made from site in your Astro config" | fetched_at: 2026-10-05
- OG images: build-time `astro-og-canvas` or satori, 1200x630 PNG per page (UNVERIFIED).
- Performance: zero JS by default; compare tables as plain HTML (UNVERIFIED).
- robots.txt: allow all, list sitemap.

## 6. Keyword map

| Page | Primary | Secondary | Intent | Wins today |
|---|---|---|---|---|
| / | tamper-evident audit log | audit log SaaS, audit log API | buyer | nobody owns "tamper-evident"; frontegg/ory for "audit log SaaS" |
| /pricing | audit log pricing | WorkOS audit logs pricing, audit log retention | transactional | workos.com/audit-logs |
| /docs | audit log API | audit log SDK TypeScript, Python audit log | developer | vendor docs (monday, rudderstack) |
| /security | how to make audit logs immutable | signed audit log, Ed25519 audit log | engineering | hoop.dev, gravitee |
| /anchors | Rekor transparency log, OpenTimestamps audit log | public audit log anchor | proof / curiosity | docs.sigstore.dev |
| /compare/workos | WorkOS audit logs alternative | WorkOS vs AuditKit | comparison | supertokens, dev.to |
| /compare/pangea | Pangea secure audit log alternative | CrowdStrike Pangea audit log | comparison | pangea.cloud (redirecting) |
| /compare/postgres | postgres audit log immutable | pgaudit tamper-evident, build vs buy audit logging | engineering decision | hoop.dev, immudb |

## 7. Twelve article briefs, ranked

Schema for all: `BlogPosting` with author and dates. Each opens with the paragraph below.

1. **What is a tamper-evident audit log?** Target: tamper-proof audit log, tamper-evident vs tamper-proof. Opening: "A tamper-evident audit log is a log where any change, deletion, or reordering after the fact can be detected by someone who does not trust the operator. It is built from three parts: a hash chain that links each event to the previous one, a Merkle root that summarises a batch, and an anchor that publishes that root to a place the operator cannot edit. 'Tamper-proof' is a stronger claim that no hosted service can honestly make; tamper-evident is what you can verify." H2: Evident vs proof; Hash chain; Merkle root; External anchor (Rekor, OTS); What a DB admin can still do; How to verify one yourself. Links: /security, /anchors, brief 4.
2. **WorkOS Audit Logs vs AuditKit.** Target: WorkOS audit logs alternative. Opening: "WorkOS Audit Logs is an append-only event store with SIEM streaming, priced at $99 per million events retained and $125 per SIEM connection; AuditKit is a hash-chained log anchored to Sigstore Rekor and OpenTimestamps that your auditor can verify offline, at $49/mo for 500k events. Pick WorkOS if you already buy its SSO bundle and need Splunk streaming; pick AuditKit if the question is 'prove nobody edited this'." H2: Side-by-side table; Integrity model; Pricing at 100k/1M/5M events; Retention; GDPR erasure; Migration. Links: /pricing.
3. **SOC 2 CC7.2 audit log requirements explained.** Target: SOC 2 audit log requirements. Opening: "SOC 2 does not list fields; CC7.2 asks that you monitor system components for anomalies and can show the auditor the record. In practice auditors sample a period and want who, what, when, where, before/after, a retention policy, and evidence the log could not be silently edited. A hash-chained, externally anchored export satisfies the last point in one artifact." H2: What CC7.2 says; CC6.1/6.3/7.3 overlap; Fields; Retention; Tamper evidence; Evidence package example. Links: /docs/export, brief 1.
4. **Immutable audit logs in Postgres: what a DB admin can still do.** Target: postgres audit log immutable. Opening: "An append-only table with REVOKE UPDATE, DELETE and a trigger stops the application from editing history; it does not stop a superuser, a restore from backup, or a dropped partition. Immutability inside one database is a permission, not a proof. Below: each Postgres technique, the role that can defeat it, and what adding a hash chain plus an external anchor changes." H2: Triggers and REVOKE; pgaudit; Hash chain in SQL; The backup problem; External anchor; When to buy. Links: /compare/postgres, brief 1.
5. **Crypto-shredding: immutable logs and the right to erasure.** Target: crypto shredding GDPR. Opening: "Crypto-shredding satisfies GDPR Article 17 by destroying the key or salt that makes personal data readable, leaving the ciphertext or commitment in place. In an audit log the chain commits to hash(salt || payload); delete salt and payload and the chain, Merkle roots and anchors still verify. The record of the event survives; the personal data does not." H2: Article 17 and logs; Per-event salt design; What the verifier sees after erasure; Limits (metadata, actor IDs); Retention vs erasure. Links: /docs/erase, brief 1.
6. **Query your audit log from Claude (MCP).** Target: audit log MCP server, Claude connector audit log. Opening: "AuditKit's MCP server exposes seven tools (search_events, get_event, get_proof, verify_range, list_tenants, export_evidence, log_event) over Streamable HTTP with the same API key as REST. Add it as a custom connector in Claude.ai and ask 'who changed billing settings last week and is the chain intact?'" H2: Install; Tool list with annotations; Example conversations; What is read-only; Test key. Links: /docs/mcp, directory listing.
7. **Audit log retention requirements by framework.** Target: audit log retention requirements. Opening: "No single number: HIPAA 6 years, PCI DSS 1 year with 3 months online, SOX 7 years, ISO 27001 commonly 3; SOC 2 leaves it to your policy. The table below gives each with its citation." H2: Table; One policy; Retention vs erasure; Proving it was followed. Links: /pricing, brief 5.
8. **Build vs buy an audit log for a B2B SaaS.** Target: build vs buy audit logging. Opening: "Build if you need an audit table for your own debugging; buy if a customer's security questionnaire asks how you prevent tampering, because that answer needs signing, anchoring, a verifier and a retention story, and none of those are your product." H2: What 'build' includes; Cost table; What customers ask; Hybrid. Links: /compare/postgres.
9. **How Merkle trees make an audit log verifiable.** Target: merkle tree audit log. Opening: "A Merkle tree hashes events into leaves and pairs them up to one root; an inclusion proof is the log2(n) sibling hashes connecting one event to that root, so a tenant can verify one event without the rest of the log." H2: Leaves and roots; Inclusion proofs; Consistency proofs; Per-tenant roots. Links: /anchors.
10. **Sigstore Rekor and OpenTimestamps as public anchors.** Target: Rekor transparency log. Opening: "Rekor is Sigstore's append-only transparency log; OpenTimestamps commits hashes to Bitcoin via free calendar servers. AuditKit writes one root per interval to both, so a proof survives even if AuditKit does not." H2: Rekor; hashedrekord; OTS and finality; Reading /anchors. Links: /anchors.
11. **Signed ingest receipts.** Target: audit log API, signed receipts. Opening: "Every log_event returns {event_hash, position, prev_hash, server_signature}; keep them and a later verify proves the service never dropped or reordered an acknowledged event." H2: Format; Storage; Verifying; Dual signing. Links: /docs/receipts.
12. **Pangea Secure Audit Log alternatives after the CrowdStrike acquisition.** Target: Pangea audit log alternative. Opening: "Pangea's product pages now redirect to CrowdStrike Falcon AIDR; teams that chose Pangea for its Merkle-verified audit log need a replacement." H2: What changed; Feature table; Migration. Links: /compare/pangea.

## 8. GEO/AEO checklist for auditkit.dev

| Item | Why (citation) |
|---|---|
| Every page indexable, no snippet limits | Google AI features doc |
| robots.txt allows OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-User, Claude-SearchBot | OpenAI and Anthropic crawler docs |
| One-sentence definition under each H1 | Velt, hubifi, nhimg pattern |
| Comparison table on every /compare page and briefs 2, 7, 8, 12 | Only Velt has one; Derivatex 51% vendor citations |
| Organization + SoftwareApplication on home; BlogPosting on posts; no FAQPage/HowTo | Google structured-data docs |
| FAQ text at the end of posts, no markup | FAQ rich result removed 2026-05-07 |
| Visible datePublished/dateModified, refreshed yearly | Google Article doc |
| /llms.txt | llmstxt.org; 97% get zero requests |
| Sitemap, canonical, RSS, OG image | Astro docs |
| Listings: npm, PyPI, GitHub README with the definition paragraph, Claude directory, G2/Capterra, AlternativeTo, Product Hunt | Review-site citation share 1-13% (Derivatex vs G2); Ahrefs 0.70 correlation for Google |
| Public /anchors page with live Rekor links | Unique citable asset |

## 9. llms.txt draft

```
# AuditKit

> Hosted tamper-evident audit log for B2B SaaS. Events are hash-chained, batched into Merkle roots, and anchored to Sigstore Rekor and OpenTimestamps. Anyone can verify an export offline with `npx @auditkit/verify` without trusting AuditKit. Open source (AGPL), Pro $49/mo.

AuditKit is a REST API plus MCP server. Each `log_event` returns a signed receipt. GDPR erasure uses crypto-shredding so the chain stays valid after a payload is deleted.

## Docs
- [Quickstart](https://auditkit.dev/docs/quickstart): first event in five minutes, TypeScript or Python
- [API reference](https://auditkit.dev/docs/api): REST, OpenAPI at https://api.auditkit.dev/openapi.json
- [Offline verifier](https://auditkit.dev/docs/verify): how `@auditkit/verify` checks a JSONL export against Rekor and OTS
- [MCP connector](https://auditkit.dev/docs/mcp): seven tools, Streamable HTTP, Claude.ai setup
- [Erasure](https://auditkit.dev/docs/erase): crypto-shredding design

## Proof
- [Anchors](https://auditkit.dev/anchors): latest anchored roots with Rekor entries
- [Security](https://auditkit.dev/security): hashing, signing keys, threat model

## Compare
- [WorkOS](https://auditkit.dev/compare/workos)
- [Postgres audit tables](https://auditkit.dev/compare/postgres)

## Optional
- [Pricing](https://auditkit.dev/pricing)
- [Blog](https://auditkit.dev/blog)
```

## 10. Homepage JSON-LD

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://auditkit.dev/#org",
      "name": "AuditKit",
      "url": "https://auditkit.dev/",
      "logo": "https://auditkit.dev/logo.png",
      "sameAs": ["https://github.com/AuditKitDev/auditkit", "https://www.npmjs.com/package/@auditkit/sdk"],
      "contactPoint": {"@type": "ContactPoint", "email": "support@auditkit.dev", "contactType": "customer support"}
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://auditkit.dev/#app",
      "name": "AuditKit",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web",
      "description": "Tamper-evident audit log API for B2B SaaS. Hash-chained events anchored to Sigstore Rekor and OpenTimestamps, verifiable offline.",
      "url": "https://auditkit.dev/",
      "license": "https://www.gnu.org/licenses/agpl-3.0.html",
      "offers": [
        {"@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD"},
        {"@type": "Offer", "name": "Pro", "price": "49", "priceCurrency": "USD", "url": "https://auditkit.dev/pricing"},
        {"@type": "Offer", "name": "Business", "price": "199", "priceCurrency": "USD", "url": "https://auditkit.dev/pricing"}
      ],
      "publisher": {"@id": "https://auditkit.dev/#org"}
    }
  ]
}
```
