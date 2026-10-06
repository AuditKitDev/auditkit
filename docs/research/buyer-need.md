# AuditKit: what need are we filling (buyer's words, with evidence)

Written 2026-10-06. Format per claim: `source | claim | quote | fetched_at`. Fetches ran 2026-10-06 02:58–03:12Z; `fetched_at` is the batch start. UNVERIFIED = not fetched (blocked/404); never use on the site as fact.

## 1. Where the demand shows up (control text)

**PCI DSS v4 10.3** (the plainest "immutable log" requirement anywhere)
- https://learn.microsoft.com/en-us/entra/standards/pci-requirement-10 | PCI requires logs protected from modification, stored off-box, change-detected, kept 12 months. | "10.3 Audit logs are protected from destruction and unauthorized modifications." / "10.3.2 Audit log files are protected to prevent modifications by individuals." / "10.3.3 Audit log files ... are promptly backed up to a secure, central, internal log server(s) or other media that is difficult to modify." / "10.3.4 File integrity monitoring or change-detection mechanisms is used on audit logs to ensure that existing log data can't be changed without generating alerts." / "10.5.1 Retain audit log history for at least 12 months". | 03:06Z
- https://www.pcisecuritystandards.org/glossary/ | PCI defines an audit log as "independently verifiable". | "Audit Log: Chronological record of system activities. Provides an independently verifiable trail sufficient to permit reconstruction, review, and examination..." | 02:58Z

**NIST SP 800-53 r5 AU-9** (FedRAMP, CMMC 3.3.8)
- https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json | AU-9 and enhancements describe a signed-hash, separately stored log. | AU-9: "Protect audit information and audit logging tools from unauthorized access, modification, and deletion". AU-9(2): "Store audit records ... in a repository that is part of a physically different system or system component than the system or component being audited." AU-9(3): "Implement cryptographic mechanisms to protect the integrity of audit information and audit tools." Guidance: "signed hash functions using asymmetric cryptography. This enables the distribution of the public key to verify the hash information". | 03:09Z

**HIPAA 45 CFR 164.312**
- https://www.law.cornell.edu/cfr/text/45/164.312 | Audit controls plus a corroboration mechanism. | "(b) Audit controls. Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information." / "(c)(2) Implement electronic mechanisms to corroborate that electronic protected health information has not been altered or destroyed in an unauthorized manner." | 02:58Z

**ISO 27001:2022 A.8.15** (supersedes A.12.4.1–12.4.3)
- https://hightable.io/how-to-implement-iso-27001-annex-a-8-15 | Control text says "protected"; guidance says admins must not be able to alter logs. | "Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analysed." / "Ensure that administrators who manage systems cannot modify or delete the logs those systems generate." | 03:09Z
- https://isms.online/iso-27001/annex-a/8-15-logging-2022/ | Same point. | "users, regardless of their permission levels, cannot delete or alter their own event logs." Supersedes "12.4.2 – Protection of Log Information". | 03:02Z

**SOC 2**
- https://www.cyberday.ai/requirement/soc-2-cc7-2-monitoring-of-system-components-for-anomalies | CC7.2 text. | "The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors ...; anomalies are analyzed to determine whether they represent security events." | 03:12Z
- CC7.3, CC8.1 verbatim: UNVERIFIED (AICPA PDF 404; mirrors 410). Cite by number only.

**NIS2 / DORA** (the Directive and Regulation don't say "log"; their implementing acts do)
- https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/eng | NIS2 Implementing Reg. Annex 3.2. | "The relevant entities shall maintain and back up logs for a predefined period and shall protect them from unauthorised access or changes." | 03:06Z
- https://www.springlex.eu/en/packages/dora/rts-rmf-regulation/article-12/ | DORA RTS 2024/1774 Art. 12(2)(d). | "measures to protect logging systems and log information against tampering, deletion, and unauthorised [access]". | 03:09Z

**Questionnaires**
- https://wolfia.com/blog/we-mapped-all-261-caiq-v4-questions-by-domain | CAIQ v4 has a LOG domain. | LOG has "18 questions" covering "audit log generation, monitoring, alerting, retention, and log protection". | 03:02Z
- CAIQ LOG-02 and SIG item text: UNVERIFIED (gated downloads).
- https://securityboulevard.com/2026/04/9-critical-security-questionnaire-items-that-stall-enterprise-saas-deals/ | The item in the buyer's words. | "Does your platform maintain an audit trail of user actions, admin changes, and data access events? How long are logs retained, and can they be exported or integrated with our SIEM?" / "If logs aren't immutable, aren't retained long enough, or can't be exported, they'll flag it." | 03:06Z

## 2. What "enterprise-ready" means for a customer-facing audit log

- https://www.enterpriseready.io/features/audit-log/ | Immutable, exportable, API, 1–3 yr retention. | "Data in an audit log should never change." / "exportable to a CSV format and API accessible so that it can be centralized into an organization wide SIEM logging system like Splunk." / "kept for 1-3 years". | 02:58Z
- https://workos.com/blog/audit-logs-are-a-product-feature | WorkOS states the need better than its product meets it. | "If an attacker with database access can quietly edit the evidence, the log is worse than useless — it's a false sense of security." / "the integrity of the log is the thing standing between an investigation and a dead end." / "Enterprise security teams expect to stream events into their SIEM, not download CSVs." / "The first time a customer really reads your audit log is during their incident". | 03:09Z
- https://docs.slack.dev/admins/audit-logs-api/ | Reference shape; Enterprise-gated. | "only available to Slack workspaces on an Enterprise plan." Fields: id, date_create, action, actor, entity, context. | 03:06Z
- https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization | GitHub shape and retention. | "The audit log contains data for the last 180 days." Qualifiers: action, actor, repo, operation, created, user. | 03:12Z
- Stripe audit log API: no public endpoint found. UNVERIFIED.

## 3. Complaints and unmet needs

- https://velt.dev/blog/how-to-add-audit-trail-to-saas-product | The mutable-table problem and build cost. | "A mutable database table isn't going to satisfy a SOC 2 auditor who wants proof nobody quietly deleted a record." / "Rolling your own means building append-only storage, hash chains, query interfaces, and compliance-ready exports before you've logged a single event that matters." / "6-12 weeks for basic implementation". | 03:06Z
- https://hn.algolia.com/api/v1/items/44602532 (HN, 154 pts, "OpenBSD chflags vs. log tampering") | Practitioners: local immutability is theatre; ship logs off-box. | "If you want immutable logs, you log to an external log server. Anything else seems security theater to me." / "an attacker with root access could ... cover their tracks by trashing the whole system". | 03:09Z
- https://hn.algolia.com/api/v1/search?query=%22audit%20log%22%20tamper&tags=comment | DB-only truth makes people uneasy; "immutable" is treated as a marketing word. | "There was a general uneasiness that our source of truth was just database entries and log files." / "It's exactly that marketing word for tamper-evident audit log". | 03:09Z
- https://hn.algolia.com/api/v1/search?query=tamper-evident%20audit%20log&tags=story | 2026 Show HNs (Colchis, NERM, Provedex, TrustNotch, Auditledge) all at 1–2 points: "hash chain" alone has no pull. | titles as listed | 03:02Z
- https://workos.com/pricing | WorkOS price is the complaint. | "Log streaming (per SIEM connection) $125/mo" / "Event retention (per 1M events) $99/mo". | 02:58Z
- Retraced "dead": NOT confirmed. `gh api repos/retracedhq/retraced` (03:02Z): archived=false, pushed_at 2026-08-07, 450 stars. Do not call it dead.
- Reddit, G2/Capterra (WorkOS, Drata, Vanta): UNVERIFIED. Reddit serves an interstitial and G2 a DataDome wall to non-browser fetches. Search snippets exist but were not fetched; do not cite.

## 4. Incidents and auditor language

- https://www.theregister.com/2023/05/12/exubiquiti_developer_jailed/ | Insider with admin rights edited log retention to hide theft; 6 years. | Sharp "altered the company's log retention histories and changed session file names to hide his activity and make it look like a coworker was sneaking around on the network"; sentenced "to six years in prison on May 12, 2023". | 03:02Z
- https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a | State actors clear logs; CISA's fix is a separate, access-controlled store. | Volt Typhoon "selectively clearing Windows Event Logs, system logs, and other technical artifacts"; "all Event ID 1102 entries should be investigated as logs are generally not cleared"; "store logs in a central system". | 03:06Z
- https://www.bleepingcomputer.com/news/security/microsoft-finally-expands-free-logging-but-only-for-govt-agencies/ | Storm-0558: the logs needed to detect it were a paid tier. | "These advanced logging capabilities were only available to customers with Microsoft's Purview Audit (Premium) logging licenses, which led to Redmond facing criticism for hindering organizations from promptly detecting Storm-0558's attacks." CISA: "increase the default log retention period from 90 days to 180 days". | 03:06Z
- https://vaoig.gov/reports/audit/review-alleged-lack-audit-logs-veterans-benefits-management-system | Auditor finding language. | "The other two employees did not appear on the audit logs. We could not determine why the two employees did not appear on the audit logs." | 03:06Z
- SOC 2 exception wording on log integrity: UNVERIFIED (reports not public).

## 5. Competitors today

| Vendor | Price | Tamper claim | Verifiable without trusting vendor? | Source (fetched_at) |
|---|---|---|---|---|
| WorkOS Audit Logs | $99/mo per 1M events + $125/mo per SIEM stream | none on pricing/product page | No | workos.com/pricing, /audit-logs (02:58Z) |
| Frontegg | not shown | none: "fully-scalable, secure, multi-tenant audit logs. Resilience is built-in." | No | frontegg.com/audit-logs (03:06Z) |
| Auth0 log streams | retention Starter "1 day" … Enterprise "30 days" | none | No | auth0.com/docs/deploy-monitor/logs/log-data-retention (03:02Z) |
| Datadog Audit Trail | "Per % of spend, per month 2% 3% 3%"; retention "3, 7, 15, 30, or 90 days" | none | No | datadoghq.com/pricing/list/ (03:09Z); docs (02:58Z) |
| Pangea Secure Audit Log (CrowdStrike) | not fetched; pangea.cloud marketing URL 301s to CrowdStrike Falcon AIDR | "Merkle Trees"; "After one hour or 10,000 events ... a new root hash and consistency proof are published to Arweave" | Yes (Arweave); product future under CrowdStrike UNVERIFIED | pangea.cloud/docs/audit/about-tamperproofing (03:09Z) |
| Logto | Pro $24 (search only) | none; "Audit logs only contain logs that occur during user authentication process" | No | docs.logto.io/developers/audit-logs (03:06Z) |
| Kinde | retention Free "1 day", Pro "7 days", Plus "14 days", Scale "30 days" | none; auth events only | No | docs.kinde.com/manage-users/view-activity/view-audit-log/ (03:06Z) |
| immudb | "Open source · Apache 2.0" | "Data can only be added, never changed or deleted, and every read can be answered with a cryptographic proof." | Client-verified, but root of trust is the immudb server you run | immudb.io (03:02Z) |
| Amazon QLDB | retired | — | — | docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html: "Amazon Quantum Ledger Database (Amazon QLDB) \| July 31, 2025" (03:12Z) |
| Azure Confidential Ledger | not shown; "2 standard SKU ledgers" per subscription | "no one — not even Microsoft — is 'above' the ledger"; receipts record "the Merkle tree data structure" | Receipts verify against Microsoft's enclave attestation; Azure-only | learn.microsoft.com/en-us/azure/confidential-ledger/overview (02:58Z) |
| Google Cloud Audit Logs | included; "_Required" bucket "400 days", "Not configurable" | "Log entries written by Cloud Audit Logs are immutable." | No proof; Google's word | docs.cloud.google.com/logging/docs/audit, /quotas (03:09Z) |
| Sigstore Rekor (our anchor) | "A free public instance operates at rekor.sigstore.dev" | "an immutable, tamper-resistant ledger"; inclusion proofs | Yes | docs.sigstore.dev/logging/overview/ (03:06Z) |

Pattern: identity vendors sell retention and SIEM plumbing with no integrity claim; cloud ledgers make the claim but the proof ends at the vendor; Pangea is the only external-anchor analogue and is now inside CrowdStrike.

## 6. GDPR erasure vs immutability

- https://www.edpb.europa.eu/system/files/2025-04/edpb_guidelines_202502_blockchain_en.pdf (Guidelines 02/2025, §4.2, §5) | EDPB describes salted-hash-on-chain, payload off-chain, salt deletion as the compliant pattern, and rejects "impossible". | "The EDPB emphasises that technical impossibility cannot be invoked to justify non-compliance with GDPR requirements". / "store only a salted or keyed hash of the personal data on the blockchain. The unhashed data itself, as well as the secret key or the long random salt used, are stored confidentially off the chain." / "after deletion of the secret key or salt, the hash should not be linkable to the original data, provided that the algorithm has not been broken, the keys have not been compromised or leaked, and the salt was not leaked". Caveat: "the hash will also be considered personal data" while the salt exists. | 03:06Z
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/ | Erasure exemptions; backups may be "beyond use". | exempt "to comply with a legal obligation" or "for the establishment, exercise or defence of legal claims"; backup data "will remain within the backup environment for a certain period of time until it is overwritten". | 02:58Z

AuditKit's `sha256(salt||payload)` with deletable payload+salt is the EDPB pattern. Copy must say "salt and payload are destroyed", not "the hash is anonymous".

## (a) Three personas and their sentence

1. **Founder/CTO of a B2B SaaS in its first enterprise security review.** Types: *"security questionnaire asks if our audit logs are immutable and exportable to SIEM, fastest way to add this"*.
2. **Security/compliance lead at a regulated SaaS** (SOC 2 Type II, HIPAA or PCI service provider; owns the Vanta seat). Asks an LLM: *"how do I prove to my auditor that nobody with database access can alter our audit log, PCI 10.3.2 / AU-9(3)"*.
3. **Platform engineer told to make the Postgres audit table tamper-proof.** Types: *"immutable audit log postgres hash chain how to anchor so a DBA can't rewrite it"*.

## (b) Five homepage proof points

1. "PCI 10.3.2: 'Audit log files are protected to prevent modifications by individuals.' AU-9(3): 'cryptographic mechanisms to protect the integrity of audit information.' AuditKit is the control." (learn.microsoft.com PCI page; NIST OSCAL)
2. "WorkOS: 'If an attacker with database access can quietly edit the evidence, the log is worse than useless.' Their product makes no integrity claim; ours anchors every root in Rekor." (workos.com blog; workos.com/audit-logs)
3. "The verifier runs with our servers off. Roots sit in Sigstore Rekor, 'an immutable, tamper-resistant ledger', and OpenTimestamps." (docs.sigstore.dev)
4. "Insiders edit logs: Ubiquiti's senior developer 'altered the company's log retention histories'; six years. Volt Typhoon: 'selectively clearing Windows Event Logs'." (theregister.com; cisa.gov AA24-038A)
5. "Erasure without breaking the chain, the way the EDPB describes it: 'after deletion of the secret key or salt, the hash should not be linkable to the original data'." (EDPB Guidelines 02/2025)

## (c) Weaknesses a buyer will raise, and the answer

- **"Hash chains are a commodity."** True (§3). A chain in your own DB proves nothing to a third party; a Rekor/OTS-anchored root plus signed ingest receipts does. Lead with the offline verifier, never with "hash chain".
- **"Why trust a one-person startup with evidence?"** You don't: open-source verifier, pinned public key, roots in public logs, JSONL export, AGPL self-host. If AuditKit vanishes the proofs still verify.
- **"QLDB died; Pangea got absorbed. The category churns."** Yes, and both left customers with vendor-bound proofs or an unclear roadmap. Vendor-independent anchoring is the hedge against us too.
- **"What about the window before a root is anchored?"** Receipts: each event is acknowledged with a server signature at ingest, so later omission is provable before the root lands in Rekor. State the window on the pricing page.
- **"Is a salted hash of deleted PII still personal data?"** EDPB: yes while the salt exists, no once destroyed. Say exactly that.
- **"Our auditor just wants a Vanta screenshot."** Don't fight Vanta; export into it. Our buyer is the one whose auditor asked the harder question.
- **"No SIEM streaming."** Deliberate (spec §3). WorkOS charges $125/mo per stream; we offer export API on Business and say why.
- **Unverified here**: SOC 2 CC7.3/CC8.1 wording, CAIQ/SIG item text, Reddit/G2 sentiment, Pangea's post-acquisition status, Stripe's audit log shape. Keep them off the site until fetched.
