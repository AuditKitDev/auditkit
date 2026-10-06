# AuditKit: the bull case (evidence)

Written 2026-10-06. Extends `buyer-need.md`; nothing there is repeated. Format: `source | claim | "quote" | fetched_at` (all 2026-10-06, per-batch times). UNVERIFIED = not fetched; keep off the site.

## 1. Demand volume

- https://whistic.com/resources/blog/2025-impact-report-takeaways | A vendor answers ~450 assessments a year, rising 26% YoY. | "The average vendor in 2025 responds to 37.3 assessment requests each month, up from 29.5 per month last year" / "525 total respondents" / "total hours spent on assessment response is 179 each month" | 03:35Z
- https://www.msptoday.com/topics/msp-today/articles/452338-number-vendors-going-through-security-assessments-up-22.htm (Whistic 2022, 315 infosec + 303 SaaS-sales respondents) | Assessments grow 22%/yr; slow answers cost deals. | "a 22% year-over-year increase in the number of vendors that companies assess annually" / "Forty-five percent of respondents...say they had deals pushed back because they could not respond to a security review in time." / "Another 34% lost a deal entirely because they were unable to respond to a security assessment quickly enough." | 03:41Z
- https://markets.financialcontent.com/lightport.lightport3/article/bizwire-2024-10-23-vanta-state-of-trust-report-2024-increasing-risks-require-going-beyond-the-standard (2,500 leaders, US/UK/AU) | Proof demand is rising. | "Time spent on manual security compliance tasks increased to over 11 weeks in 2024 — up from 10 weeks in 2023." / "Nearly two-thirds (65%) of organizations say that customers, investors and suppliers require more demonstration of compliance than before." | 03:28Z
- https://vanta.com/lp/questionnaire-automation | Cost per questionnaire. | "Average companies spend 5-15 hours on a single security questionnaire." | 03:22Z
- https://drata.com/customers/wins/300-questionnaires-a-year-one-bottleneck-too-many ; .../when-compliance-slows-deals-the-cost-is-visible | Top-end per-company volumes. | "roughly 200 to 300 security questionnaires arriving each year" (2026-05-12); "an estimated 500 compliance questionnaires annually", "security reviews were stalling deals" (2026-06-30) | 03:41Z
- CAIQ v4 LOG domain: 18 of 261 questions (buyer-need.md §1). https://raw.githubusercontent.com/prowler-cloud/prowler/383a9bf9032c503c6e920d9f94f7712d046d3a7b/prowler/compliance/csa_ccm_4.0.json (CCM v4.0.13, the CAIQ's control set) | The CAIQ asks it twice. | LOG-02 "Audit Logs Protection: Define, implement and evaluate processes, procedures and technical measures to ensure the security and retention of audit logs." LOG-09 "Log Protection: The information system protects audit records from unauthorized access, modification, and deletion." | 03:47Z
- https://blog.getagency.com/articles/sig-lite | SIG Lite size. | "SIG Lite contains approximately 200 questions covering the same 18 domains as the full SIG" (2026-04-06) | 03:41Z. Item text UNVERIFIED (login wall); counts disagree across sources (126–200).
- https://wolfia.com/hecvat | "HECVAT 4" launched January 2025; current "4.1.6" | 03:41Z. Item text UNVERIFIED (educause.edu 403).
- SOC 2 volume. https://assets.kpmg.com/content/dam/kpmg/uk/pdf/2024/10/soc-reporting-benchmarking.pdf (KPMG UK, 400+ reports 2021–23) | Assurance demand nearly doubled in three years. | "During this period, the number of SOC reports we issue has nearly doubled, increasing by more than 80%." | 03:45Z. https://blog.getagency.com/articles/soc-2-compliance-statistics-2026 | Vendor estimate, unsourced; disagreement flagged. | "Estimated annual SOC 2 reports issued: 15,000-20,000+" / "Year-over-year growth rate: 18-22%" | 03:22Z
- Denominators (companies demonstrably paying to pass reviews). https://www.fortune.com/2026/04/29/exclusive-vanta-arr-300-million-sequoia-shadow-ai-claude-cursor/ | "Vanta now serves more than 16,000 customers" / "crossed $300 million in annual recurring revenue" / "customer growth rate has also accelerated to roughly 60% year-over-year" | 03:47Z. https://drata.com/blog/fy25-momentum | "7,000+ customers across 60 countries" / "$100M+ ARR" (2025-02-19) | 03:47Z

## 2. Willingness to pay

- https://auth0.com/pricing | Identity vendors keep logs days, not years. | Free "$0/month", Essentials "$150/month", Professional "$800/month"; Log Retention "1 Day" / "5 Days" / "10 Days" / Enterprise "30 Days"; Log Streaming "Not available" / "1 Log Stream" / "2 Log Streams" | 03:41Z
- https://frontegg.com/pricing | Audit logs are enterprise-gated. | "Logs streaming / audit logs" appears only under "Enterprise" ("Custom") | 03:22Z
- WorkOS $99/mo per 1M events + $125/mo per SIEM stream; Datadog 2–3% of spend: buyer-need.md §5.
- https://archive.benchmarkemail.com/azurefeeds/newsletter/AzureFeeds---Newsletter-📅-Weekly-Update--Saturday-March-01-2025-to-Saturday-March-08-2025 | Microsoft prices a verifiable ledger at ~$90/mo. | Azure confidential ledger "approximately $3 per day per instance", effective March 1, 2025 | 03:47Z (primary post body not served).
- https://www.lowcode.agency/blog/build-saas-audit-log-with-bubble | Build cost, low-code. | "A functional audit log system on Bubble takes 4-8 weeks to implement across a full product" / "costs between $8,000 and $20,000 depending on action coverage and compliance requirements" (2026-09-28) | 03:41Z
- https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm | Build-cost input. | median wage "$135,980 in May 2025" | 03:47Z. With velt.dev's "6-12 weeks for basic implementation" (buyer-need.md §3): 6–12 × $2,615/wk = $15.7k–$31.4k salary alone, before anchoring or a verifier. AuditKit Pro is $588/yr.

## 3. Market validation events

- https://www.crowdstrike.com/en-us/press-releases/crowdstrike-to-acquire-pangea-to-secure-every-layer-of-enterprise-ai/ | CrowdStrike bought the only external-anchored vendor, for AI security; terms undisclosed, audit log unmentioned. | "AUSTIN, Texas and Fal.Con 2025, Las Vegas – September 16, 2025"; Kurtz: "AI is rewriting the enterprise attack surface at breakneck speed. Each prompt becomes an entry point" | 03:35Z. https://pangea.cloud/docs/audit/about-tamperproofing | Still documented under CrowdStrike, no deprecation notice. | "a new root hash and consistency proof are published to Arweave" | 03:41Z
- https://techcrunch.com/2025/02/12/security-compliance-firm-drata-acquires-safebase-for-250m | The questionnaire-answer layer is worth $250M; the proof layer is empty. | Drata acquired SafeBase "for $250 million" (2025-02-12); SafeBase "over 1,000 customers"; raised "$53.1 million" | 03:47Z
- https://www.infoq.com/news/2024/07/aws-kill-qldb (2024-07-26) | AWS exited; its replacement has no proofs. | AWS points to "pgAudit, Amazon S3, and Aurora Database Activity Streams"; Reddit: "customers who are using it will risk losing their data integrity guarantees during the migration process" | 03:22Z. AWS's own "Replace Amazon QLDB" post now 301s to aws.amazon.com/products/databases/ (curl, 03:45Z).
- https://workos.com/blog/workos-2022-spring-release-recap (2022-07-11) | WorkOS launched on the immutability promise it does not prove. | "IT admins often require this feature since it provides them with an immutable record of how different resources in your app are created, modified, and accessed." | 03:22Z
- https://www.microsoft.com/insidetrack/blog/simplifying-compliance-evidence-management-with-microsoft-azure-confidential-ledger (2022-08-25) | Microsoft's own compliance team needed a ledger for auditors. | "proving that some action occurred, or piece of data existed can be difficult, especially after some time has passed" | 03:35Z
- https://fintech.global/?p=80546 (2022-09-07) | Codenotary (immudb) funded. | total "$24 million" | 03:22Z. https://immudb.io/ | "9.0k" GitHub stars | 03:41Z
- https://zenodo.org/records/17794686 (2025-12-02) | New entrants copy the design (Bitcoin anchor, offline verify). | "pre-/post-audit states independently anchored to Bitcoin mainnet (OP_RETURN)"; "21,717 evidence-file instances"; "100% detection of 40/40 HMAC-seeded deletions" | 03:47Z. https://www.startuphub.ai/startups/sigilbase.md | Second entrant, same pitch. | "Evidential custody for audit logs, held in a tamper-evident ledger by a neutral third party and verifiable offline." founded "2026-07-10" | 03:22Z; sigilbase.com reads "We're under construction" (03:35Z). Funding for either: UNVERIFIED.

## 4. Regulatory tailwinds (dates)

- https://digital-strategy.ec.europa.eu/en/policies/nis2-directive | "Member States had until 17 October 2024 to transpose the NIS2 Directive into national law."; July 2026: Commission referred Ireland, Spain, France, Netherlands to the CJEU for non-transposition; scope "medium-sized and large entities in these critical sectors" (18 sectors) | 03:22Z. Log wording: Implementing Reg. 2024/2690 Annex 3.2 (buyer-need.md §1).
- https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en | "It entered into application on 17 Jan 2025"; "applicable to 20 different types of financial entities and ICT third-party service providers" | 03:35Z. RTS 2024/1774 Art. 12(2)(d) anti-tamper wording: buyer-need.md §1.
- https://www.sec.gov/newsroom/press-releases/2023-139 (2023-07-26) | Form 8-K Item 1.05 "will generally be due four business days after a registrant determines that a cybersecurity incident is material" | 03:22Z
- https://www.dwt.com/blogs/privacy--security-law-blog/2025/01/hipaa-security-rule-proposed-changes-in-2025 | NPRM published 2025-01-06, "Comments are due by March 7, 2025"; "OCR proposes to eliminate the concept of 'addressable' implementation specifications entirely. Instead, all implementation specifications would be required."; "240 days to come into compliance" | 03:35Z. Status: https://medcurity.com/hipaa-security-rule-2026/ "As of June 2026 ... remains a proposed rule"; "OMB's Unified Agenda (RIN 0945-AA22) now targets July 2027"; providers "asked HHS to withdraw the proposal" | 03:47Z. Treat as a 2027 option, not a 2026 driver.
- https://blog.pcisecuritystandards.org/coffee-with-the-council-podcast-guidance-for-pci-dss-e-commerce-requirements-effective-after-31-march-2025 (2025-03-26) | 10.3.x is mandatory now. | "After this 2025 date, these requirements are required, and they must be fully considered during a PCI DSS assessment." | 03:41Z
- https://www.cyber.gc.ca/en/news-events/best-practices-event-logging-and-threat-detection (CISA/FBI/NSA/ASD, 2024-08-22) | Log integrity is one of four pillars. | "Secure storage and log integrity" | 03:45Z. Cryptographic-verification sentence: UNVERIFIED (PDF timed out).
- FedRAMP/AU-9(3) and EDPB 02/2025: buyer-need.md §1, §6.

## 5. Buyer triggers

- https://sos-vo.org/node/91299 (LogRhythm/Dimensional Research, 1,175 respondents, 2022-12-08) | "67 percent of respondents say their company has lost a business deal due to a customer's lack of trust in their security strategy."; "85 percent of respondents stating that their company must provide proof of meeting the security requirements of their partners." | 03:47Z
- https://workos.com/blog/audit-log-events-enterprise-buyers (2026-07-14) | The log item surfaces mid-deal. | "a security questionnaire comes back with a specific ask, engineering scrambles to add one more event type, and the deal slips a week"; storage must be "tamper evident storage kept separate from your application database" | 03:41Z
- https://frontegg.com/blog/audit-logs-for-saas-enterprise-customers | "As a SaaS vendor, many of your prospects will require that an audit logging feature is included in your product" | 03:41Z
- https://raw.githubusercontent.com/mitchellhoward-netizen/Axolotl/99809a6c3bba4a2d9d827b2b4e3d64dc8f08a57a/docs/K-12CVAT-ANSWERS.md | A live vendor's honest HECVAT answer is the gap AuditKit fills. | "We do not yet provide a customer queryable, tamper resistant audit log, and retention of these logs beyond 30 days is not yet in place." | 03:45Z
- Whistic 2022 45%/34% (§1). Item text: buyer-need.md §1. G2/Capterra/Reddit: UNVERIFIED (bot walls). HN Algolia: three queries, no usable hits.

## 6. Fit

| Demand evidence | AuditKit feature | Position |
|---|---|---|
| CCM LOG-09 "protects audit records from ... modification, and deletion"; PCI 10.3.2; AU-9(3) | Hash chain + per-tenant Merkle root anchored to Rekor and OTS | Only option at $49: Pangea (Arweave) is inside CrowdStrike with no loadable price; Azure ACL ~$90/mo, Azure-attested; immudb needs you to run the root of trust; Sigilbase is a placeholder page |
| 85% "must provide proof"; auditor "proving that some action occurred ... can be difficult" (Microsoft) | `npx @auditkit/verify` offline, no AuditKit call | Only option; no fetched vendor ships a vendor-independent verifier for SaaS events |
| WorkOS: "deal slips a week" | Signed ingest receipts, 5-min anchoring on Pro | Only option (CT-style receipts); WorkOS/Auth0 none |
| EDPB 02/2025 salted-hash pattern | Crypto-shredding per event | Only option among fetched vendors |
| CISA "Secure storage and log integrity"; WorkOS "kept separate from your application database" | Hosted, off-box by design | Competitive (any hosted log) |
| HECVAT answer "retention beyond 30 days not in place"; Auth0 1–30 days | 1-yr Pro / 3-yr Business retention | Competitive on price (WorkOS $99/1M events) |
| enterpriseready SIEM export; Auth0/WorkOS streams | Export API only, no streaming | Behind; spec §3 accepts this |
| MCP connector | Same-process MCP | Novel; no demand evidence fetched |

## Serviceable market and ARR

Inputs: (a) 16,000 Vanta + 7,000 Drata customers = 23,000 companies paying to pass security reviews (Fortune 2026-04-29; Drata 2025-02-19; overlap and Secureframe/others ignored, so roughly a wash). (b) Every SOC 2/HIPAA/ISO review carries the audit-trail item (Security Boulevard, buyer-need.md); the CAIQ asks it twice (LOG-02, LOG-09). (c) Share whose current answer is a mutable table and who would buy rather than build: assumption 10%, grounded in the HECVAT answer above and WorkOS's "engineering scrambles" description; no survey measures it.

Serviceable: 23,000 × 10% = 2,300 companies.
Blended ARR per company, assumed 70% Pro / 30% Business: 0.7 × $588 + 0.3 × $2,388 = $412 + $716 = $1,128.
Serviceable ARR: 2,300 × $1,128 = $2.6M. Ceiling if every reviewed company bought: 23,000 × $1,128 = $25.9M.
Growth: Vanta customers +60% YoY, assessments per vendor +26% YoY, SOC reports +80% in three years.

## Three strongest proof points

1. 67% have lost a deal to security distrust, 85% must provide proof (LogRhythm, n=1,175); 34% lost a deal to a slow assessment (Whistic, n=618); the average vendor answers 37.3 assessments a month (Whistic 2025, n=525).
2. The questionnaire asks AuditKit's exact question and no cheap vendor answers it: CCM LOG-09 "protects audit records from unauthorized access, modification, and deletion"; PCI 10.3.x mandatory since 31 March 2025; WorkOS launched on "immutable record" and ships no proof; Auth0 retains 1–30 days.
3. The category is being validated and vacated at once: Drata paid $250M for the questionnaire layer; CrowdStrike absorbed Pangea for AI security; AWS killed QLDB and now 301s its migration guide; Microsoft's own auditors needed a ledger. Nothing external-anchored and offline-verifiable is left under $90/mo.
