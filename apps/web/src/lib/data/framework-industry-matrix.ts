/**
 * Industry × Framework relevance matrix for AuditKit pSEO.
 *
 * Each entry represents a meaningful intersection — a combination where the
 * framework actually applies to that industry. We don't generate every
 * cartesian product because pages with poor topical relevance hurt SEO.
 *
 * Each entry has a slug like `soc2-for-fintech` that mirrors how buyers
 * actually search ("SOC 2 for fintech", "HIPAA for healthcare SaaS").
 */

import { getFramework } from './compliance-frameworks';
import { getIndustry } from './industries';

export interface FrameworkIndustryEntry {
  slug: string;
  frameworkSlug: string;
  industrySlug: string;
  /** Custom angle for this intersection — why this combo specifically matters */
  intersectionAngle: string;
  /** Industry-specific reasons this framework matters */
  whyItMatters: string[];
  /** Specific events/data this combo needs to log */
  criticalEvents: string[];
  /** Industry-specific FAQs that aren't covered by either source */
  intersectionFaqs: { question: string; answer: string }[];
}

export const FRAMEWORK_INDUSTRY_MATRIX: FrameworkIndustryEntry[] = [
  // ---------- FINTECH ----------
  {
    slug: 'soc2-for-fintech',
    frameworkSlug: 'soc2',
    industrySlug: 'fintech',
    intersectionAngle:
      'Fintech buyers (banks, payment processors, brokerages) require SOC 2 Type II before onboarding any third-party vendor handling financial data. For fintech SaaS, SOC 2 is the price of admission to enterprise revenue.',
    whyItMatters: [
      'Enterprise banks require SOC 2 Type II before integration — without it, you cannot sell upmarket',
      'SOC 2 audit logs overlap heavily with PCI DSS and SOX requirements, so investment compounds',
      'Fintech transaction volumes mean log integrity claims must be cryptographically provable, not just policy-driven',
      'SOC 2 CC7.2 (system monitoring) and CC6.1 (logical access) are the most-cited evidence gaps in fintech audits',
    ],
    criticalEvents: [
      'Every authentication attempt against the payment APIs',
      'Every transaction approval, modification, or reversal',
      'Every permission elevation or admin action',
      'Every API key rotation or credential change',
      'Every webhook delivery and failure',
    ],
    intersectionFaqs: [
      {
        question: 'Do fintech companies need SOC 2 or PCI DSS first?',
        answer:
          'For most fintech companies the answer is both — but the audit logging infrastructure should be designed once to satisfy both. PCI DSS Requirement 10 and SOC 2 CC7.2 have ~70% overlap in evidence requirements. AuditKit produces evidence streams that satisfy both frameworks from a single deployment.',
      },
      {
        question: 'How does SOC 2 Type II evidence collection work for fintech?',
        answer:
          "Auditors will sample 25-50 control instances across the audit window (typically 3-12 months) and require demonstrable evidence that controls operated effectively. For audit logging, this means proving that every authentication event, every transaction, and every privileged action was logged with tamper-evident integrity. AuditKit's hash-chain output is admissible as SOC 2 evidence under AICPA AT-C Section 105.",
      },
    ],
  },
  {
    slug: 'pci-dss-for-fintech',
    frameworkSlug: 'pci-dss',
    industrySlug: 'fintech',
    intersectionAngle:
      'PCI DSS Requirement 10 is non-negotiable for any fintech that touches cardholder data. v4.0 (effective March 2024) raised the bar on log integrity — hash-based tamper detection is now explicitly required.',
    whyItMatters: [
      'Requirement 10.2 mandates audit trails of all access to cardholder data — every read, write, and admin action',
      'Requirement 10.3 requires logs to be protected from tampering — cryptographic integrity is now the assessor standard',
      'Requirement 10.5 mandates retention for at least 1 year with 90 days immediately available',
      'PCI DSS v4.0 (March 2024) requires automated log review — manual log analysis no longer meets the bar',
    ],
    criticalEvents: [
      'Cardholder data access events (read, write, search)',
      'Failed authentication attempts',
      'Privileged user actions',
      'Configuration changes to security controls',
      'Antivirus/IDS events',
    ],
    intersectionFaqs: [
      {
        question: 'What does PCI DSS v4.0 require for log integrity?',
        answer:
          'PCI DSS v4.0 Requirement 10.5.2 explicitly requires audit log files to be protected from unauthorized modifications through mechanisms such as digital signatures or hash-based integrity. AuditKit\'s SHA-256 hash chain and Merkle tree proofs directly satisfy this requirement — every log entry has a cryptographic signature derived from all prior entries.',
      },
      {
        question: 'How long must PCI DSS audit logs be retained?',
        answer:
          'PCI DSS requires 1 year minimum retention with the most recent 90 days immediately available for analysis. AuditKit supports tiered retention with hot/cold storage so you can satisfy this requirement cost-effectively.',
      },
    ],
  },
  {
    slug: 'sox-for-fintech',
    frameworkSlug: 'sox',
    industrySlug: 'fintech',
    intersectionAngle:
      'SOX Section 404 internal controls evaluation applies to any fintech vendor whose services touch a publicly-traded company\'s financial reporting. If your fintech sells to public companies, your audit logs are part of their SOX scope.',
    whyItMatters: [
      'SOX 404 requires public companies to evaluate the effectiveness of internal controls — including controls operated by vendors',
      'SOX 802 mandates 7-year retention for audit-relevant records — the longest retention requirement in mainstream compliance',
      'SOX Section 302 requires CEO/CFO certifications backed by auditable evidence — vendor logs are often material',
      'Section 404(b) auditor attestation evaluates control effectiveness from inception — gaps cannot be backfilled',
    ],
    criticalEvents: [
      'All changes to financial reporting data',
      'All journal entry approvals and modifications',
      'All access to general ledger systems',
      'All segregation-of-duties enforcement events',
      'All period-close lockdown events',
    ],
    intersectionFaqs: [
      {
        question: 'Does SOX apply to fintech SaaS vendors?',
        answer:
          'Indirectly but materially. SOX Section 404 requires public companies to attest to the effectiveness of internal controls over financial reporting (ICFR). If your fintech SaaS is in your customer\'s ICFR scope, your audit logs become evidence in their SOX audit. SOC 1 Type II reports are the standard way fintech vendors document this.',
      },
      {
        question: 'How long must SOX-relevant audit logs be retained?',
        answer:
          'SOX Section 802 requires 7-year retention for audit-relevant records. AuditKit\'s tiered retention model supports 7+ year archival with cryptographic integrity preserved across cold storage transitions.',
      },
    ],
  },
  {
    slug: 'dora-for-fintech',
    frameworkSlug: 'dora',
    industrySlug: 'fintech',
    intersectionAngle:
      'DORA (Digital Operational Resilience Act) became enforceable in January 2025 across the EU. It mandates ICT risk management and operational resilience evidence for financial entities — including non-EU vendors serving EU financial customers.',
    whyItMatters: [
      'DORA applies extraterritorially — US fintech vendors selling to EU banks are in scope',
      'ICT third-party risk register requirements mean banks must prove they\'ve audited your logs',
      'Incident classification and reporting timeframes (4 hours for major incidents) require always-on log accessibility',
      'Operational resilience testing requires evidence trails that span months of activity',
    ],
    criticalEvents: [
      'ICT-related incident detection events',
      'Third-party access events',
      'Operational resilience testing artifacts',
      'Incident classification and escalation events',
      'Recovery time / recovery point evidence',
    ],
    intersectionFaqs: [
      {
        question: 'Does DORA apply to non-EU fintech vendors?',
        answer:
          'Yes — DORA applies extraterritorially to any ICT provider serving EU financial entities. If your fintech SaaS has even one EU bank, payment institution, or investment firm as a customer, you are likely in DORA\'s third-party scope.',
      },
      {
        question: 'What is the DORA incident reporting timeline?',
        answer:
          'DORA requires initial notification of major ICT-related incidents within 4 hours, intermediate report within 72 hours, and final report within 1 month. AuditKit\'s real-time event streaming and queryable log API are essential for meeting these deadlines.',
      },
    ],
  },
  {
    slug: 'iso27001-for-fintech',
    frameworkSlug: 'iso27001',
    industrySlug: 'fintech',
    intersectionAngle:
      'ISO 27001 certification is increasingly required by European banks and financial institutions before vendor onboarding. The 2022 revision (ISO 27001:2022) makes logging requirements more prescriptive than SOC 2.',
    whyItMatters: [
      'European fintech buyers default to requiring ISO 27001 rather than SOC 2',
      'Annex A.8.15 (Logging) and A.8.16 (Monitoring) are evaluated against documented evidence — not just policy',
      'A.8.17 (Clock synchronization) and A.8.18 (Privileged utility programs) require specific log entries',
      'ISO 27001 surveillance audits happen annually — log integrity must be maintained continuously',
    ],
    criticalEvents: [
      'All user account lifecycle events',
      'All privileged access and admin actions',
      'All security policy violations',
      'All security incident detection events',
      'All change management approvals',
    ],
    intersectionFaqs: [
      {
        question: 'Should a US fintech pursue SOC 2 or ISO 27001?',
        answer:
          'It depends on your buyer geography. US enterprises overwhelmingly require SOC 2. European and APAC enterprises overwhelmingly require ISO 27001. Many fintech companies serving both markets pursue both — and the audit logging infrastructure is largely the same.',
      },
    ],
  },

  // ---------- HEALTHCARE ----------
  {
    slug: 'hipaa-for-healthcare',
    frameworkSlug: 'hipaa',
    industrySlug: 'healthcare',
    intersectionAngle:
      'HIPAA audit logging is the operational core of healthcare SaaS compliance. Without provable ePHI access trails, you cannot be a Business Associate, you cannot pass an OCR audit, and you cannot sell to hospitals or payers.',
    whyItMatters: [
      'HIPAA 45 CFR 164.312(b) mandates audit controls — hardware, software, and procedural mechanisms that record and examine ePHI activity',
      'Every read of ePHI must be logged with user identity, timestamp, and context — even unsuccessful access attempts',
      'OCR (HHS Office for Civil Rights) audit findings consistently cite weak audit logging as a top finding',
      'Healthcare breaches over 500 records trigger automatic public notification — audit trails are central to forensic investigation',
    ],
    criticalEvents: [
      'Every ePHI read, write, modification, and deletion',
      'Every patient record search query',
      'Every user authentication and session termination',
      'Every minimum-necessary access enforcement event',
      'Every break-glass emergency access event',
    ],
    intersectionFaqs: [
      {
        question: 'What HIPAA audit logging is required for healthcare SaaS?',
        answer:
          '45 CFR 164.312(b) requires implementation of hardware, software, and/or procedural mechanisms that record and examine activity in information systems containing or using ePHI. In practice this means every access to ePHI — read, write, modify, delete — must be logged with user identity, timestamp, and event context. AuditKit provides this with cryptographic integrity guarantees.',
      },
      {
        question: 'How long must HIPAA audit logs be retained?',
        answer:
          'HIPAA does not specify a retention period for audit logs specifically, but 45 CFR 164.316(b)(2)(i) requires retention of policy and procedure documentation for 6 years. Most healthcare organizations retain audit logs for at least 6 years to support breach investigations and OCR audits.',
      },
    ],
  },
  {
    slug: 'soc2-for-healthcare',
    frameworkSlug: 'soc2',
    industrySlug: 'healthcare',
    intersectionAngle:
      'Healthcare buyers increasingly require SOC 2 Type II in addition to HIPAA. The frameworks complement each other: HIPAA defines the regulatory baseline; SOC 2 demonstrates operational effectiveness to enterprise buyers.',
    whyItMatters: [
      'Hospital procurement teams require both HIPAA BAA + SOC 2 Type II before contracting',
      'SOC 2 controls map cleanly to HIPAA Security Rule — single audit infrastructure satisfies both',
      'SOC 2 Confidentiality and Privacy criteria address ePHI handling beyond HIPAA minimums',
      'Auditor sampling in SOC 2 catches log gaps that HIPAA self-assessments miss',
    ],
    criticalEvents: [
      'All ePHI access events',
      'All authentication and authorization events',
      'All administrative actions',
      'All configuration and security control changes',
      'All third-party access events',
    ],
    intersectionFaqs: [
      {
        question: 'Should healthcare SaaS pursue HIPAA or SOC 2 first?',
        answer:
          'Both, in parallel, with shared audit infrastructure. HIPAA is mandatory if you handle ePHI. SOC 2 is required by enterprise hospital and payer procurement. The good news: SOC 2 CC7.2 (monitoring) and CC6.1 (logical access) directly satisfy HIPAA 164.312(b) audit controls. One audit log implementation can produce evidence for both.',
      },
    ],
  },
  {
    slug: 'gdpr-for-healthcare',
    frameworkSlug: 'gdpr',
    industrySlug: 'healthcare',
    intersectionAngle:
      'GDPR Article 9 designates health data as a "special category" requiring elevated protection. Healthcare SaaS serving any EU patient data must demonstrate audit logging at a higher bar than ordinary personal data.',
    whyItMatters: [
      'GDPR Article 32 mandates security of processing — auditable access records are explicit evidence',
      'Article 30 records of processing activities are evaluated against actual audit log evidence',
      'Article 33 breach notification within 72 hours requires immediately queryable audit trails',
      'Health data carries the maximum fine tier under Article 83 (4% of global annual revenue)',
    ],
    criticalEvents: [
      'All health data processing events',
      'All consent capture and withdrawal events',
      'All data subject request (DSAR) events',
      'All cross-border data transfer events',
      'All data processor / sub-processor access events',
    ],
    intersectionFaqs: [
      {
        question: 'Does GDPR apply to US healthcare SaaS?',
        answer:
          'Yes if you process personal data of EU residents — including telemedicine consultations, clinical trial enrollments, or healthcare staff data. GDPR is extraterritorial: it follows the data subject, not the company location.',
      },
    ],
  },
  {
    slug: 'iso27001-for-healthcare',
    frameworkSlug: 'iso27001',
    industrySlug: 'healthcare',
    intersectionAngle:
      'ISO 27001 is the global baseline for healthcare information security. European, Canadian, and APAC hospital systems often require it instead of (or in addition to) HIPAA.',
    whyItMatters: [
      'NHS England (UK) and EU healthcare systems require ISO 27001 from vendors',
      'ISO 27799 (health informatics specialization) builds on ISO 27001 with healthcare-specific guidance',
      'Annex A.8.15 logging requirements apply directly to ePHI / patient data access',
      'Annual surveillance audits create continuous accountability',
    ],
    criticalEvents: [
      'All patient record access',
      'All clinical workflow events',
      'All third-party integration events',
      'All security event detection',
      'All change management events',
    ],
    intersectionFaqs: [
      {
        question: 'Should healthcare SaaS pursue ISO 27001 or HIPAA?',
        answer:
          'If you sell only in the US, HIPAA + SOC 2 is sufficient. If you sell internationally (UK, EU, Canada, APAC), ISO 27001 is increasingly required. Many healthcare SaaS companies pursue all three with a unified audit logging foundation.',
      },
    ],
  },

  // ---------- EDTECH ----------
  {
    slug: 'soc2-for-edtech',
    frameworkSlug: 'soc2',
    industrySlug: 'edtech',
    intersectionAngle:
      'K-12 and higher-ed procurement increasingly requires SOC 2 Type II — districts and universities cite SOC 2 in RFPs as a baseline. For edtech, SOC 2 is the gating requirement for institutional sales.',
    whyItMatters: [
      'University and district RFPs increasingly require SOC 2 Type II as a baseline vendor qualification',
      'SOC 2 controls map to FERPA, COPPA, and state student-data privacy laws (California SOPIPA, NY Ed Law 2-d)',
      'Student data carries elevated privacy expectations — auditor sampling catches gaps that self-assessment misses',
      'SOC 2 Confidentiality and Privacy criteria directly address student record protection',
    ],
    criticalEvents: [
      'All student record access events',
      'All grade modification events',
      'All parent / guardian access events',
      'All teacher / administrator privileged actions',
      'All third-party integration data flows',
    ],
    intersectionFaqs: [
      {
        question: 'What student data laws does SOC 2 help with?',
        answer:
          'SOC 2 Confidentiality and Privacy criteria align with FERPA (federal), COPPA (under-13 children), and state laws like New York Ed Law 2-d, California SOPIPA, and Colorado HB 1423. While SOC 2 does not certify FERPA compliance, the underlying controls — especially logical access and monitoring — directly satisfy these laws\' security requirements.',
      },
    ],
  },
  {
    slug: 'gdpr-for-edtech',
    frameworkSlug: 'gdpr',
    industrySlug: 'edtech',
    intersectionAngle:
      'Edtech serving EU schools handles minor data — GDPR Article 8 sets the age-of-consent floor at 16 (lowered to 13 in some member states). Children\'s data carries the strictest GDPR scrutiny.',
    whyItMatters: [
      'Article 8 special protections for children\'s data require demonstrable parental consent trails',
      'Many EU member states have lowered consent age below 16 — audit logs must capture which legal basis was used per child',
      'Schools as data controllers depend on edtech vendors\' audit logs for their own GDPR accountability',
      'GDPR breach notification (72 hours) requires immediately accessible per-student access logs',
    ],
    criticalEvents: [
      'Per-child consent capture and parental verification events',
      'All student data processing events',
      'All cross-border data flows (transatlantic, intra-EU)',
      'All data subject access request (DSAR) events',
      'All data deletion / right-to-erasure events',
    ],
    intersectionFaqs: [
      {
        question: 'How does GDPR Article 8 affect edtech?',
        answer:
          'Article 8 requires parental consent for children below the age threshold (16 by default, lowered to 13 in some member states). Edtech vendors must capture and audit-log proof of parental consent and the applicable legal basis. Without per-event audit logs of consent capture, demonstrating compliance is nearly impossible.',
      },
    ],
  },
  {
    slug: 'iso27001-for-edtech',
    frameworkSlug: 'iso27001',
    industrySlug: 'edtech',
    intersectionAngle:
      'Universities, especially in Europe and the UK, require ISO 27001 from edtech vendors handling student data. Cyber Essentials Plus (UK) and ISO 27018 (cloud privacy) often layer on top.',
    whyItMatters: [
      'UK universities require ISO 27001 + Cyber Essentials Plus as baseline vendor qualifications',
      'Annex A controls map cleanly to FERPA, GDPR, and state student-privacy laws',
      'Surveillance audits create continuous accountability over student data handling',
      'ISO 27018 extends the framework with cloud-PII privacy controls',
    ],
    criticalEvents: [
      'All student record access',
      'All teacher / staff privileged actions',
      'All third-party LTI integration data flows',
      'All grade and assessment events',
      'All security incident events',
    ],
    intersectionFaqs: [
      {
        question: 'Do US edtech companies need ISO 27001?',
        answer:
          'Increasingly yes if you sell internationally. UK universities, EU schools, Australian universities, and Canadian school boards routinely require ISO 27001. For US-only edtech, SOC 2 + state-law compliance is usually sufficient.',
      },
    ],
  },

  // ---------- GOVTECH ----------
  {
    slug: 'fedramp-for-govtech',
    frameworkSlug: 'fedramp',
    industrySlug: 'govtech',
    intersectionAngle:
      'FedRAMP is the federal cloud-vendor gating requirement. Without an ATO (Authority to Operate), you cannot sell to federal agencies. Audit logging is one of the most heavily scrutinized control families in FedRAMP assessments.',
    whyItMatters: [
      'AU (Audit and Accountability) controls are the largest control family in FedRAMP — 16 controls including AU-2, AU-3, AU-9, AU-12',
      'FedRAMP Moderate baseline requires log integrity protection (AU-9) — cryptographic hash chains are the standard mechanism',
      'FedRAMP continuous monitoring (ConMon) requires monthly log review evidence',
      'JAB (Joint Authorization Board) authorizations require evidence of effective audit logging across all assessment phases',
    ],
    criticalEvents: [
      'All authentication events (success and failure)',
      'All privileged access and admin actions',
      'All system configuration changes',
      'All security control modifications',
      'All data import / export events',
    ],
    intersectionFaqs: [
      {
        question: 'What FedRAMP audit logging requirements are most critical?',
        answer:
          'AU-2 (event types), AU-3 (event content), AU-9 (protection of audit information), and AU-12 (audit record generation) are the core requirements. AU-9 specifically requires that audit logs be protected from unauthorized modification — cryptographic hash chains and Merkle tree proofs are the canonical implementation.',
      },
      {
        question: 'How long must FedRAMP audit logs be retained?',
        answer:
          'FedRAMP Moderate baseline requires audit log retention for at least 1 year online and 3 years total. Some agency-specific tailoring extends retention to 7 years. AuditKit\'s tiered retention supports the full FedRAMP retention spectrum.',
      },
    ],
  },
  {
    slug: 'cmmc-for-govtech',
    frameworkSlug: 'cmmc',
    industrySlug: 'govtech',
    intersectionAngle:
      'CMMC 2.0 is the DoD\'s mandatory certification for contractors handling Controlled Unclassified Information (CUI). Phased rollout means thousands of defense-adjacent vendors must achieve CMMC Level 2 by 2026-2028.',
    whyItMatters: [
      'CMMC Level 2 requires NIST SP 800-171 compliance including AU (Audit and Accountability) family',
      'Defense Industrial Base contractors must demonstrate audit log integrity to maintain DoD contracts',
      'Third-party assessor (C3PAO) evaluations require demonstrable audit evidence',
      'CMMC findings flow to contract eligibility — log gaps directly threaten revenue',
    ],
    criticalEvents: [
      'All CUI access events',
      'All authentication events',
      'All privileged user actions',
      'All system component changes',
      'All security incident events',
    ],
    intersectionFaqs: [
      {
        question: 'What CMMC level does my govtech need?',
        answer:
          'If you handle Controlled Unclassified Information (CUI), CMMC Level 2 is the minimum. If you handle only Federal Contract Information (FCI), CMMC Level 1 may suffice. Most govtech SaaS handling agency data requires Level 2.',
      },
    ],
  },
  {
    slug: 'soc2-for-govtech',
    frameworkSlug: 'soc2',
    industrySlug: 'govtech',
    intersectionAngle:
      'State and local government procurement often requires SOC 2 Type II as a baseline before FedRAMP becomes relevant. SOC 2 is the stepping stone to government sales for many govtech SaaS companies.',
    whyItMatters: [
      'State CIOs and procurement increasingly require SOC 2 Type II before issuing contracts',
      'SOC 2 controls overlap heavily with FedRAMP Moderate — investment in SOC 2 accelerates FedRAMP readiness',
      'StateRAMP programs use SOC 2 as a partial trust anchor',
      'SOC 2 audit logs are admissible evidence in state procurement security reviews',
    ],
    criticalEvents: [
      'All citizen data access',
      'All government employee privileged actions',
      'All third-party integration events',
      'All security policy enforcement events',
      'All change management events',
    ],
    intersectionFaqs: [
      {
        question: 'Does SOC 2 satisfy government procurement requirements?',
        answer:
          'For state and local government, SOC 2 Type II often satisfies the security baseline. For federal civilian agencies, FedRAMP is typically required. For DoD work, CMMC is required. Many govtech companies pursue all three with a shared audit logging foundation.',
      },
    ],
  },
];

export function getMatrixEntry(slug: string): FrameworkIndustryEntry | undefined {
  return FRAMEWORK_INDUSTRY_MATRIX.find((e) => e.slug === slug);
}

export function getAllMatrixSlugs(): string[] {
  return FRAMEWORK_INDUSTRY_MATRIX.map((e) => e.slug);
}

export function getMatrixEntryWithData(slug: string) {
  const entry = getMatrixEntry(slug);
  if (!entry) return undefined;
  const framework = getFramework(entry.frameworkSlug);
  const industry = getIndustry(entry.industrySlug);
  if (!framework || !industry) return undefined;
  return { entry, framework, industry };
}
