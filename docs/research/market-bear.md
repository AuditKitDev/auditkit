# AuditKit v2: the bear case

Written 2026-10-06. Brief: the investor who passes. Format per claim: `source | claim | quote | fetched_at`. Fetches ran 2026-10-06 03:38–03:44Z. UNVERIFIED = not fetched or second-hand. Extends `buyer-need.md` and `seo-geo-aeo.md`; does not repeat them.

## 1. The need is already met by things buyers own

The questionnaire item is "immutable, retained, exportable". Nothing in the control text or auditor practice says "verifiable by a third party without trusting the operator". The cheap answers pass.

- https://www.bytebase.com/blog/soc2-audit-logging/ | A real SOC 2 request was for a log sample with four fields, not a proof. | "evidence that administrator activity is actually logged (not just that logging is enabled)" ... "an admin/privileged user, the action performed, timestamp, affected resource" ... "SOC 2 doesn't prescribe the mechanism; auditors want to see that deletion or modification would be detectable." Implementations "range from append-only storage (immutable S3 buckets, WORM) to cryptographic chains". | 03:43Z
- https://soc2auditors.org/insights/soc-2-logging-and-monitoring-controls/ | Auditor-written guidance lists screenshots and cloud-native logs; no hash or chain-of-custody requirement. | "The criteria do not prescribe one universal logging product or architecture." Evidence: "SIEM configuration screenshots", "Dashboard screenshots", "Sample alerts (3-5 from the audit period)". Tools named: AWS CloudTrail, Azure Monitor, Google Cloud Audit Logs. | 03:40Z
- https://oneuptime.com/blog/post/2026-08-03-what-counts-as-soc-2-evidence/markdown | Screenshots with context remain acceptable evidence in 2026. | "A screenshot can still be useful when it visibly includes: the application and tenant or environment; the complete setting being inspected; the resource identifier; a trustworthy capture date". | 03:42Z
- https://help.drata.com/en/articles/5329618-soc-2-all-controls | Drata's CC7.2 evidence ask is operational, not cryptographic. | "Upload scan logs, remediation tickets, and alert records for threat monitoring". | 03:43Z
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html | CloudTrail already ships signed hash chains for free. | "SHA-256 for hashing and SHA-256 with RSA for digital signing. This makes it computationally infeasible to modify, delete or forge CloudTrail log files without detection." "Each digest file also contains the digital signature of the previous digest file". | 03:38Z
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html | S3 Object Lock compliance mode is WORM with a regulator-facing assessment, for the price of S3. | "a protected object version can't be overwritten or deleted by any user, including the root user in your AWS account." "assessed by Cohasset Associates for use in environments that are subject to SEC 17a-4, CFTC, and FINRA regulations." | 03:38Z

Read together: the platform engineer's cheapest compliant answer is an append-only table plus nightly JSONL to an Object-Locked bucket, with CloudTrail digests for infra. It satisfies PCI 10.3, AU-9(2), the questionnaire item, and the auditor's sample request. AuditKit's differentiator (vendor-independent proof) answers a question nobody in the evidence chain is asking. Reddit r/soc2 threads: UNVERIFIED (fetch blocked); no fetched auditor source mentions Rekor, Merkle roots or external anchoring.

## 2. The graveyard says the category does not pay

- https://www.infoq.com/news/2024/07/aws-kill-qldb | AWS retired its ledger DB and told customers to rebuild on Postgres plus audit tooling. | AWS pointed to "pgAudit, Amazon S3, and Aurora Database Activity Streams" as replacements; AWS SA Dan Blaner: "Amazon Aurora PostgreSQL does not keep a permanent, immutable record of changes. Instead, that history must be generated as audit data and stored outside of the database." Corey Quinn: "its only flaw was being a blockchain-adjacent offering that didn't let customers babble on about blockchain". | 03:40Z
- https://hn.algolia.com/api/v1/search?query=QLDB&tags=story&hitsPerPage=10 | Nobody cared enough to argue. | "AWS is sunsetting QLDB": 11 points, 2 comments; "RIP Amazon QLDB": 2 points. | 03:42Z. AWS's stated rationale: not published; "low adoption" is inference, UNVERIFIED.
- https://www.infoq.com/news/2021/06/microsoft-drops-azure-blockchain | Microsoft retired its ledger service for lack of interest, despite marquee logos. | "recent changes in the blockchain industry and the growing business needs of our customers" combined with "lowered interest in our existing offering." Customers listed: GE Aviation, J.P. Morgan, Singapore Airlines, Starbucks, Xbox. | 03:42Z
- https://www.crowdstrike.com/en-us/press-releases/crowdstrike-to-acquire-pangea-to-secure-every-layer-of-enterprise-ai/ | Pangea, the one external-anchored audit log vendor, was bought for AI security; the audit log is not mentioned. | Rationale: "AI is rewriting the enterprise attack surface at breakneck speed. Each prompt becomes an entry point". No customer count, revenue or price disclosed; no mention of "audit". 2025-09-16. | 03:43Z
- `gh api repos/retracedhq/retraced` | Retraced (the open-source audit-log service) is stalled. | 450 stars, last release v1.13.1 2024-11-06, last non-bot commit "Update README.md" 2025-08-26; prior commits are dependabot. | 03:41Z
- https://www.hunted.space/dashboard/boxyhq/launches/open-source-audit-logs-by-boxyhq | Its launch peaked at 114 upvotes, rank #20. | "114" upvotes, "23" comments, 2023-02-01. | 03:43Z
- https://startupintros.com/orgs/boxyhq | BoxyHQ raised $2.5M and exited as a 3-person acqui-hire. | "In May 2025, the identity infrastructure company Ory acquired BoxyHQ, integrating its core technology and transitioning its 3 employees". "$2.5M in total across 1 funding round". Ory's own post: UNVERIFIED (URL redirected to blog index). | 03:43Z
- https://techcrunch.com/2023/06/21/cloudnotary-brings-its-immutable-database-to-the-cloud | immudb Vault is AuditKit's hosted twin, three years older, with $24M behind it, at $69/mo. | "free for up to 10,000 stored documents or up to 250 megabytes (whichever comes first), with paid plans starting at $69/month." | 03:43Z. Codenotary revenue and customers: UNVERIFIED.
- Free self-host alternatives (`gh api`, 03:41Z): immudb 9,041 stars, pushed 2026-10-05, release v1.11.2 2026-09-03; Trillian 3,758, pushed 2026-10-02; Rekor 1,215; Tessera 242; opentimestamps-server 271. A team that wants Merkle proofs can run immudb or Tessera this week for nothing.

Pattern: two hyperscalers shipped this and retired it; the venture-backed specialist exited into a product line that does not mention audit logs; the open-source service stalled and its company was acqui-hired. No postmortem says "nobody asked for it"; every outcome does.

## 3. The buyer will not procure a $49 vendor for this

- https://www.perforce.com/press-releases/2024-state-devops-report | The audit log lives with the platform team, which builds rather than buys. | "43% of respondents say that their platform has a dedicated security and compliance team"; "51% of respondents say that platform teams are also responsible for enforcing software and tool versions for security updates." | 03:43Z
- https://zylo.com/blog/saas-sprawl | Procurement's mood is cut, not add. | "9 new unique applications enter a company's software environment every month"; organizations use only "54% of its provisioned licenses," "$9.8M in wasted spend on average per company". | 03:40Z
- https://delos.so/blog/ai-vendor-risk-assessment | A manual vendor review costs 70–100x AuditKit's monthly price. | "Manual assessments cost $3,500-$5,000 per vendor." "A process that once required 8-12 weeks per vendor". | 03:42Z
- https://www.whistic.com/resources/blog/state-of-vendor-security-report-key-takeaways | Review teams are already saturated. | "More than 50% of the companies surveyed report spending at least 20 hours a week on vendor assessments"; "the average company dedicates four to six individuals to vendor assessments alone". | 03:40Z
- https://opensource.google/documentation/reference/using/agpl-policy | AGPL is a hard block at the one company whose policy is public, and a template elsewhere. | "Code licensed under the GNU Affero General Public License (AGPL) MUST NOT be used at Google." | 03:38Z. Other enterprise AGPL bans: UNVERIFIED.

The irony: AuditKit sells "pass the vendor review" and must itself survive a $3,500–$5,000, 8–12 week review before it may hold the evidence. The free tier does not avoid this.

## 4. A zero-customer solo vendor cannot hold compliance evidence

- https://cyberbase.ai/blog/what-is-soc-2-compliance-guide-saas-companies | Buyers want the vendor's own SOC 2 first. | "83% of enterprise purchasers want SOC 2 compliance before engaging with a vendor" (attributed to a 2024 Panaseer study; primary UNVERIFIED). | 03:43Z
- https://drata.com/learn/soc-2/cost | A solo vendor's SOC 2 costs more than a year of Pro revenue from 40 customers. | Type 1: "$7,500 to $15,000 for small to midsize companies"; Type 2: "$12,000 to $20,000"; first year "$25,000 for a small startup"; Type 2 window "typically 3-12 months". 2026-03-25. | 03:42Z
- https://claude.com/docs/connectors/verification | The directory listing itself carries a trust warning. | Community: "Anthropic screens Community connectors before listing them but hasn't reviewed them in depth ... so only connect to developers you trust." "Before you connect one, Claude shows a reminder that it hasn't been reviewed in depth." | 03:42Z

"You don't have to trust us, verify the anchors" is a cryptographer's answer to a procurement question. The procurement question is "who is liable, where is the data, show me your report, SLA and insurance." The spec's Business tier promises an SLA from one person on a shared VPS.

## 5. Distribution does not reach the buyer

- https://ahrefs.com/blog/how-long-does-it-take-to-rank/ | New pages rarely rank. | "Only 1.74% of newly published pages rank in the top 10 within a year"; "72.9% of top 10 pages are over 3 years old". 2025-05-15. | 03:40Z. WorkOS/Datadog domain authority figures: UNVERIFIED (no tool fetched), but both already hold the commercial terms per `seo-geo-aeo.md` §1.
- https://claude.com/docs/connectors/directory | Directory ranking is usage-based, which a new connector has none of; no public traffic numbers. | "Ranking is usage-based, similar to other app stores." Usage is visible only to the owner: "the same dashboard shows your server's health and usage". | 03:40Z. Directory size (~1,625 connectors, claudemarket.ai): UNVERIFIED (429).
- https://productled.com/blog/product-led-growth-benchmarks | Even the generous benchmark needs volume AuditKit cannot produce. | Freemium converts "at 12% conversion (at the median)"; "$1K - $5K" ACV products convert best at "10% (median)". | 03:40Z. Search snippets put dev-tool freemium at 1–5% (getmonetizely, extruct.ai): UNVERIFIED.

At 2–5% conversion, 100 paying Pro customers ($58.8k ARR) needs 2,000–5,000 activated free projects. Show HN evidence (`buyer-need.md` §3) says hash-chain launches draw single digits.

## 6. $49 is the wrong number in both directions

- https://wynter.com/research/b2b-saas-pricing-study | Low price reads as commodity to B2B buyers. | "A cheap price says commodity, negotiate me down. A confident price says we know what this is worth." 50 B2B SaaS leaders, April 2026. | 03:43Z. The "Gartner 80% see low price as risk" line from search snippets: UNVERIFIED (not in the fetched article).
- https://workos.com/pricing | The incumbent prices audit logs as a line item inside a platform the buyer already bought for SSO. | "Event retention (per 1M events) $99/mo"; SSO "$125/ea". | 03:40Z
- https://techcrunch.com/2023/06/21/cloudnotary-brings-its-immutable-database-to-the-cloud | The closest hosted analogue starts at $69 and has not become a category. | "paid plans starting at $69/month." | 03:43Z

Too cheap to be a compliance dependency a CISO signs for; too much to be a feature when the buyer's identity vendor, cloud, or Postgres already covers the questionnaire item.

## Verdict

**Most likely reason it fails.** The questionnaire asks "immutable and exportable", the auditor asks for a sample, and both are satisfied by storage the buyer already pays for. Vendor-independent verification is a property no fetched auditor, framework or compliance platform requests. AuditKit sells the proof; the market buys the checkbox.

**Cheapest experiment to prove this wrong** (two weeks, $0). Contact 15 people who signed a SOC 2 report in the last 12 months: 10 auditors at the firms that audit seed-to-Series-B SaaS (Prescient Assurance, Johanson Group, Sensiba, A-LIGN, Insight Assurance), found via LinkedIn, plus 5 heads of security at SaaS companies that publicly show a SOC 2 Type II badge. Ask one question: "In the last year, how many times did you issue an exception, or a customer refuse a report, because log integrity could not be proven to someone outside the company?" Signal: 3 of 15 cite a real instance with a dollar or deal attached. Below that, no one is paying. Add a second question to the five security heads: "Would you connect a one-person vendor's hosted service to your audit log?" A single "yes, after SOC 2" confirms §4.

**Change that most improves the odds.** Stop being a vendor who holds the log. Ship the anchoring and verifier as a library and CLI that runs against the customer's own Postgres table and S3 bucket, anchors their roots to Rekor and OTS, and emits the auditor evidence package. Charge for the signed verifier binary, hosted anchoring status page and auditor viewer, not for custody. That removes the vendor review, the AGPL objection, the SOC 2 prerequisite and the trust problem in one move, and turns "replace your audit table" into "add a proof to the one you have."
