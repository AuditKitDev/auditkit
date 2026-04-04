export interface FAQ {
  question: string;
  answer: string;
}

export interface Industry {
  slug: string;
  name: string;
  description: string;
  overview: string;
  complianceNeeds: string[];
  typicalEvents: { event: string; description: string }[];
  auditRequirements: { requirement: string; details: string }[];
  faqs: FAQ[];
}

export const industries: Industry[] = [
  {
    slug: 'fintech',
    name: 'Fintech',
    description:
      'Immutable audit logging for fintech platforms. Meet SOX, PCI DSS, and SOC 2 requirements with SHA-256 hash chains and Merkle tree proofs that satisfy financial regulators.',
    overview:
      'Fintech companies operate under some of the most stringent regulatory oversight in the software industry. Payment processors must comply with PCI DSS. Lending platforms face SOX and state lending regulations. Investment platforms answer to SEC and FINRA. Across all of these, audit logging is not optional. Financial regulators expect detailed, tamper-proof records of every transaction, access event, and configuration change. AuditKit provides the cryptographic audit trail infrastructure that fintech companies need to satisfy regulators, pass audits, and close enterprise deals.',
    complianceNeeds: [
      'PCI DSS v4.0 Requirement 10 (logging and monitoring)',
      'SOX Section 302/404 (internal controls over financial reporting)',
      'SOC 2 Type II (Trust Services Criteria)',
      'DORA (for EU financial services)',
      'State money transmitter licensing requirements',
      'SEC/FINRA recordkeeping rules (for investment platforms)',
      'BSA/AML transaction monitoring requirements',
    ],
    typicalEvents: [
      { event: 'transaction.created', description: 'New financial transaction initiated' },
      { event: 'transaction.approved', description: 'Transaction approved by authorized user' },
      { event: 'account.balance_changed', description: 'Account balance modification' },
      { event: 'kyc.verified', description: 'KYC identity verification completed' },
      { event: 'kyc.failed', description: 'KYC verification failed or flagged' },
      { event: 'payout.initiated', description: 'Payout or withdrawal initiated' },
      { event: 'limit.changed', description: 'Transaction or account limit modified' },
      { event: 'beneficiary.added', description: 'New payment beneficiary added' },
      { event: 'suspicious_activity.flagged', description: 'Activity flagged for AML review' },
    ],
    auditRequirements: [
      {
        requirement: 'Transaction traceability',
        details:
          'Every financial transaction must be traceable from initiation to settlement, with a complete audit trail of approvals, modifications, and status changes.',
      },
      {
        requirement: 'Tamper-proof records',
        details:
          'Financial regulators require that audit records cannot be altered retroactively. PCI DSS 10.5 and SOX Section 802 both mandate tamper protection for audit trails.',
      },
      {
        requirement: 'Real-time monitoring',
        details:
          'BSA/AML regulations require real-time transaction monitoring for suspicious activity. SIEM integration enables automated detection and alerting.',
      },
      {
        requirement: 'Long-term retention',
        details:
          'Financial records must be retained for 5-7 years depending on the regulation. SOX requires 7 years, PCI DSS requires 1 year, and DORA requires 5 years.',
      },
    ],
    faqs: [
      {
        question: 'What audit logging do fintech companies need?',
        answer:
          'Fintech companies need comprehensive logging of financial transactions, user authentication, KYC/AML activities, permission changes, and system access. Logs must be tamper-proof (PCI DSS 10.5), retained for 5-7 years (SOX/DORA), and available for real-time monitoring (BSA/AML). AuditKit provides all of these capabilities with SHA-256 hash chains and Merkle tree proofs.',
      },
      {
        question: 'How does AuditKit help fintech companies pass audits?',
        answer:
          'AuditKit provides tamper-proof audit trails that satisfy PCI DSS Requirement 10, SOX Section 404 internal controls, and SOC 2 monitoring requirements. The built-in React viewer gives auditors a clear interface to review evidence, and Merkle tree proofs allow mathematical verification of log integrity.',
      },
    ],
  },
  {
    slug: 'healthcare',
    name: 'Healthcare SaaS',
    description:
      'HIPAA-compliant audit logging for healthcare SaaS platforms. Track access to electronic protected health information (ePHI) with cryptographic integrity verification.',
    overview:
      'Healthcare SaaS platforms must comply with HIPAA, which mandates audit controls for all systems containing electronic protected health information (ePHI). The HIPAA Security Rule (45 CFR 164.312(b)) requires audit controls that record and examine activity in information systems. Beyond HIPAA, healthcare organizations increasingly require SOC 2 compliance from their vendors and may need to comply with state-level health privacy laws. AuditKit provides the immutable audit trail infrastructure that healthcare SaaS companies need to protect patient data, satisfy HIPAA requirements, and sign Business Associate Agreements with confidence.',
    complianceNeeds: [
      'HIPAA Security Rule (45 CFR 164.312(b) - Audit Controls)',
      'HIPAA Privacy Rule (access and disclosure logging)',
      'HITECH Act (breach notification and enhanced penalties)',
      'SOC 2 Type II',
      'State health privacy laws (CCPA health data, SHIELD Act)',
      '21st Century Cures Act (information blocking provisions)',
    ],
    typicalEvents: [
      { event: 'phi.accessed', description: 'Protected health information viewed or accessed' },
      { event: 'phi.exported', description: 'PHI exported or downloaded' },
      { event: 'phi.modified', description: 'Patient record updated or corrected' },
      { event: 'consent.granted', description: 'Patient consent recorded' },
      { event: 'consent.revoked', description: 'Patient consent withdrawn' },
      { event: 'disclosure.logged', description: 'PHI disclosure to third party logged' },
      { event: 'break_glass.activated', description: 'Emergency access override used' },
      { event: 'user.role_changed', description: 'Clinical user role or access level modified' },
    ],
    auditRequirements: [
      {
        requirement: 'ePHI access logging',
        details:
          'Every access to electronic protected health information must be logged with who accessed it, when, what was accessed, and the purpose. This is fundamental to HIPAA compliance.',
      },
      {
        requirement: 'Disclosure tracking',
        details:
          'HIPAA requires tracking of all PHI disclosures to third parties. Patients have the right to request an accounting of disclosures for the past 6 years.',
      },
      {
        requirement: '6-year retention',
        details:
          'HIPAA requires retention of security-related documentation for 6 years from creation or last effective date (45 CFR 164.530(j)).',
      },
      {
        requirement: 'Integrity verification',
        details:
          'HIPAA 164.312(c)(1) requires integrity controls for ePHI. Audit logs documenting access and changes to ePHI must themselves be protected from tampering.',
      },
    ],
    faqs: [
      {
        question: 'What audit logging does HIPAA require for SaaS platforms?',
        answer:
          'HIPAA Security Rule 164.312(b) requires audit controls that record and examine activity in systems containing ePHI. This includes logging all access to patient records, authentication events, data modifications, and administrative actions. Logs must be retained for 6 years and protected from tampering. AuditKit satisfies these requirements with SHA-256 hash chains and configurable retention policies.',
      },
      {
        question: 'Does AuditKit provide a BAA for healthcare customers?',
        answer:
          'Yes. AuditKit offers Business Associate Agreements for healthcare customers on paid plans. The platform includes encryption at rest and in transit, tenant isolation, and HIPAA-compliant audit logging with 6-year retention support.',
      },
    ],
  },
  {
    slug: 'edtech',
    name: 'EdTech',
    description:
      'Compliance-ready audit logging for education technology platforms. Meet FERPA, COPPA, and state student privacy requirements with immutable audit trails.',
    overview:
      'Education technology platforms handle some of the most sensitive data categories: student records, grades, behavioral data, and information about minors. FERPA (Family Educational Rights and Privacy Act) governs access to student education records, while COPPA (Children\'s Online Privacy Protection Act) applies to platforms serving children under 13. State student privacy laws like California\'s SOPIPA and New York\'s Education Law 2-d add additional requirements. EdTech platforms must maintain detailed audit trails of who accessed student data, when, and for what purpose. AuditKit provides the audit infrastructure that EdTech companies need to demonstrate compliance to school districts, parents, and regulators.',
    complianceNeeds: [
      'FERPA (access to student education records)',
      'COPPA (children under 13)',
      'State student privacy laws (SOPIPA, Ed Law 2-d, Illinois SOPPA)',
      'SOC 2 Type II (required by school districts)',
      'GDPR (for international students)',
      'District data privacy agreements',
    ],
    typicalEvents: [
      { event: 'student_record.accessed', description: 'Student education record viewed' },
      { event: 'student_record.exported', description: 'Student data exported or shared' },
      { event: 'grade.modified', description: 'Student grade entered or changed' },
      { event: 'parent_consent.recorded', description: 'Parental consent captured' },
      { event: 'data_sharing.initiated', description: 'Student data shared with third party' },
      { event: 'teacher.access_granted', description: 'Teacher given access to class roster' },
      { event: 'admin.bulk_export', description: 'Bulk student data export performed' },
    ],
    auditRequirements: [
      {
        requirement: 'Access tracking for education records',
        details:
          'FERPA requires schools (and their vendors) to track access to student education records. EdTech platforms must log who accessed what student data and when.',
      },
      {
        requirement: 'Parental consent documentation',
        details:
          'COPPA requires verifiable parental consent before collecting personal information from children under 13. Consent events must be logged and verifiable.',
      },
      {
        requirement: 'Data sharing accountability',
        details:
          'State student privacy laws restrict sharing student data with third parties. All data sharing events must be logged with recipient, purpose, and legal basis.',
      },
      {
        requirement: 'District compliance reporting',
        details:
          'School districts increasingly require vendors to provide audit reports showing data access patterns, security events, and compliance status.',
      },
    ],
    faqs: [
      {
        question: 'What audit logging do EdTech companies need?',
        answer:
          'EdTech companies need to log access to student education records (FERPA), parental consent events (COPPA), data sharing activities (state privacy laws), and security events (SOC 2). AuditKit provides immutable audit trails that satisfy these requirements and support district compliance reporting.',
      },
      {
        question: 'How does AuditKit help EdTech companies win school district contracts?',
        answer:
          'School districts require SOC 2 compliance and detailed data privacy assurances from EdTech vendors. AuditKit provides tamper-proof audit logs that demonstrate compliance, a React viewer for district compliance reviews, and the evidence collection needed to pass SOC 2 audits.',
      },
    ],
  },
  {
    slug: 'govtech',
    name: 'GovTech',
    description:
      'FedRAMP and StateRAMP-ready audit logging for government technology platforms. NIST SP 800-53 AU controls, FIPS-aligned cryptographic integrity, and tenant isolation.',
    overview:
      'Government technology platforms face the most rigorous compliance requirements in the software industry. FedRAMP authorization requires implementation of NIST SP 800-53 audit controls (AU-1 through AU-16). StateRAMP provides a similar framework for state and local government. CMMC applies to defense contractors. All of these frameworks mandate comprehensive, tamper-proof audit logging with strict retention requirements. AuditKit provides the audit infrastructure that GovTech companies need to achieve and maintain authorization, with SHA-256 hash chains that align with FIPS 140-2 cryptographic requirements.',
    complianceNeeds: [
      'FedRAMP (NIST SP 800-53 AU controls)',
      'StateRAMP',
      'CMMC (for defense-adjacent contractors)',
      'FISMA',
      'CJIS Security Policy (for law enforcement systems)',
      'Section 508 (accessibility)',
      'ITAR/EAR (for defense-related systems)',
    ],
    typicalEvents: [
      { event: 'cui.accessed', description: 'Controlled Unclassified Information accessed' },
      { event: 'classification.changed', description: 'Data classification level modified' },
      { event: 'user.clearance_updated', description: 'User security clearance updated' },
      { event: 'system.config_changed', description: 'System configuration modified' },
      { event: 'admin.privilege_used', description: 'Administrative privilege exercised' },
      { event: 'data.exported', description: 'Data exported from system boundary' },
      { event: 'audit_log.accessed', description: 'Audit log itself accessed or reviewed' },
      { event: 'incident.reported', description: 'Security incident reported' },
    ],
    auditRequirements: [
      {
        requirement: 'NIST SP 800-53 AU controls',
        details:
          'FedRAMP requires implementation of all 20 audit and accountability controls from NIST SP 800-53, including event logging, content requirements, storage, protection, and review.',
      },
      {
        requirement: 'Cryptographic log integrity',
        details:
          'AU-9 requires cryptographic protection of audit information. FIPS 140-2 validated cryptographic modules are required for federal systems.',
      },
      {
        requirement: 'Continuous monitoring',
        details:
          'FedRAMP requires continuous monitoring including real-time audit log analysis, automated alerting, and monthly vulnerability scanning.',
      },
      {
        requirement: 'Audit log retention',
        details:
          'NIST SP 800-53 AU-11 requires retention of audit records for at least 1 year online and 3 years total. Some agencies require longer retention.',
      },
    ],
    faqs: [
      {
        question: 'What audit logging does FedRAMP require?',
        answer:
          'FedRAMP requires implementation of NIST SP 800-53 AU controls including AU-2 (event logging), AU-3 (content requirements), AU-6 (review and analysis), AU-9 (protection of audit information), and AU-12 (audit record generation). AuditKit provides all of these capabilities with SHA-256 hash chains for cryptographic integrity.',
      },
      {
        question: 'Can AuditKit be deployed within a FedRAMP boundary?',
        answer:
          'Yes. AuditKit can be self-hosted within your FedRAMP authorization boundary, giving you full control over data residency and network isolation. This is the recommended deployment model for government systems requiring FedRAMP authorization.',
      },
    ],
  },
  {
    slug: 'legaltech',
    name: 'LegalTech',
    description:
      'Audit logging for legal technology platforms. Maintain chain of custody for legal documents, track evidence access, and demonstrate ethical compliance with immutable audit trails.',
    overview:
      'Legal technology platforms handle privileged communications, confidential case documents, and sensitive evidence. Attorney-client privilege, legal hold requirements, and eDiscovery obligations create unique audit logging needs. Legal professionals must be able to demonstrate an unbroken chain of custody for evidence, prove that privileged documents were not improperly accessed, and respond to eDiscovery requests with verified audit trails. AuditKit provides the tamper-proof logging infrastructure that LegalTech platforms need to maintain document integrity and support legal proceedings.',
    complianceNeeds: [
      'SOC 2 Type II',
      'ABA Model Rules of Professional Conduct (duty of technology competence)',
      'Federal Rules of Civil Procedure (eDiscovery)',
      'Legal hold and preservation obligations',
      'State bar data security requirements',
      'GDPR (for international law firms)',
    ],
    typicalEvents: [
      { event: 'document.accessed', description: 'Legal document viewed or downloaded' },
      { event: 'document.modified', description: 'Document content or metadata changed' },
      { event: 'privilege.asserted', description: 'Attorney-client privilege claimed' },
      { event: 'legal_hold.placed', description: 'Legal hold initiated on documents' },
      { event: 'legal_hold.released', description: 'Legal hold lifted' },
      { event: 'evidence.collected', description: 'Evidence collected or ingested' },
      { event: 'case.access_changed', description: 'Case access permissions modified' },
      { event: 'ediscovery.export', description: 'Documents exported for eDiscovery' },
    ],
    auditRequirements: [
      {
        requirement: 'Chain of custody',
        details:
          'Legal evidence requires an unbroken, verifiable chain of custody from collection to presentation. Every access, copy, and transfer must be logged.',
      },
      {
        requirement: 'Privilege protection',
        details:
          'Access to privileged communications must be strictly controlled and logged. Any inadvertent disclosure must be immediately detectable.',
      },
      {
        requirement: 'eDiscovery readiness',
        details:
          'Federal Rules of Civil Procedure require parties to identify and preserve electronically stored information. Audit logs must support eDiscovery requests with verifiable completeness.',
      },
      {
        requirement: 'Tamper-proof records',
        details:
          'Legal proceedings require that audit records be demonstrably authentic. Cryptographic verification provides stronger evidence of authenticity than traditional logging.',
      },
    ],
    faqs: [
      {
        question: 'How does AuditKit support legal document chain of custody?',
        answer:
          'AuditKit creates a tamper-proof audit trail for every document access, modification, and transfer using SHA-256 hash chains. Merkle tree proofs allow any individual event to be verified without accessing the entire log. This provides a cryptographically verifiable chain of custody that holds up to legal scrutiny.',
      },
      {
        question: 'Can AuditKit audit logs be used as evidence in legal proceedings?',
        answer:
          'AuditKit audit logs are designed to be forensically sound. SHA-256 hash chains ensure that any tampering is mathematically detectable, and Merkle tree proofs provide independent verification. While admissibility depends on the jurisdiction and court, the cryptographic integrity of AuditKit logs provides stronger evidence of authenticity than traditional logging systems.',
      },
    ],
  },
  {
    slug: 'insurtech',
    name: 'InsurTech',
    description:
      'Regulatory-compliant audit logging for insurance technology platforms. Meet state insurance commissioner requirements, NAIC standards, and SOC 2 obligations with tamper-proof audit trails.',
    overview:
      'Insurance technology platforms are regulated by state insurance commissioners and must comply with NAIC (National Association of Insurance Commissioners) model laws and standards. The NAIC Insurance Data Security Model Law requires comprehensive audit trails for systems handling policyholder information. InsurTech platforms also face SOC 2 requirements from carrier partners and must comply with state-specific data breach notification laws. AuditKit provides the audit infrastructure that InsurTech companies need to satisfy regulators, carriers, and enterprise customers.',
    complianceNeeds: [
      'NAIC Insurance Data Security Model Law',
      'State insurance commissioner regulations',
      'SOC 2 Type II (required by carrier partners)',
      'GDPR (for international operations)',
      'State data breach notification laws',
      'HIPAA (for health insurance platforms)',
    ],
    typicalEvents: [
      { event: 'policy.created', description: 'New insurance policy created' },
      { event: 'policy.modified', description: 'Policy terms or coverage changed' },
      { event: 'claim.filed', description: 'Insurance claim submitted' },
      { event: 'claim.adjudicated', description: 'Claim decision rendered' },
      { event: 'underwriting.completed', description: 'Underwriting decision made' },
      { event: 'pii.accessed', description: 'Policyholder personal information accessed' },
      { event: 'rate.calculated', description: 'Premium rate calculated' },
      { event: 'agent.commission_changed', description: 'Agent commission structure modified' },
    ],
    auditRequirements: [
      {
        requirement: 'Policyholder data protection',
        details:
          'NAIC Model Law requires logging of access to policyholder nonpublic personal information, including who accessed it, when, and for what purpose.',
      },
      {
        requirement: 'Claims processing trail',
        details:
          'Insurance regulators require complete audit trails for claims processing, from filing through adjudication, including all decisions and communications.',
      },
      {
        requirement: 'Underwriting transparency',
        details:
          'Regulators require documentation of underwriting decisions including factors considered, data sources used, and outcomes. Audit logs support regulatory examinations.',
      },
      {
        requirement: 'Rate filing compliance',
        details:
          'Insurance rate changes must be documented and filed with state regulators. Audit logs provide evidence of rate calculation methodology and approval workflows.',
      },
    ],
    faqs: [
      {
        question: 'What audit logging do InsurTech companies need?',
        answer:
          'InsurTech companies need to log policyholder data access, claims processing decisions, underwriting activities, rate calculations, and administrative changes. The NAIC Insurance Data Security Model Law specifically requires audit trails for systems handling nonpublic personal information. AuditKit provides tamper-proof logging that satisfies these requirements.',
      },
      {
        question: 'How does AuditKit help InsurTech companies satisfy state regulators?',
        answer:
          'State insurance regulators conduct examinations that require detailed audit evidence. AuditKit provides immutable audit trails with SHA-256 hash chains, a React viewer for regulator review, and configurable retention policies that meet state-specific requirements.',
      },
    ],
  },
  {
    slug: 'cybersecurity',
    name: 'Cybersecurity',
    description:
      'Audit logging for cybersecurity platforms and security operations. Tamper-proof event chains for incident response, threat hunting, and forensic analysis.',
    overview:
      'Cybersecurity platforms have a unique relationship with audit logging: they both produce and consume security events at scale. SIEM platforms, EDR tools, vulnerability management systems, and identity providers all require audit trails of their own operations. When a security tool is compromised or its logs are questioned during an investigation, the integrity of its audit trail is critical. AuditKit provides cryptographic audit log integrity that cybersecurity vendors can offer as a differentiator. SHA-256 hash chains and Merkle tree proofs ensure that security event records are mathematically verifiable, even if the underlying system is compromised.',
    complianceNeeds: [
      'SOC 2 Type II',
      'ISO 27001',
      'FedRAMP (for government-facing security tools)',
      'CMMC (for defense contractor security tools)',
      'Common Criteria (for evaluated products)',
      'CISA Secure by Design principles',
    ],
    typicalEvents: [
      { event: 'threat.detected', description: 'Security threat identified' },
      { event: 'alert.created', description: 'Security alert generated' },
      { event: 'alert.escalated', description: 'Alert escalated to human analyst' },
      { event: 'incident.opened', description: 'Security incident case opened' },
      { event: 'incident.resolved', description: 'Incident investigation closed' },
      { event: 'rule.modified', description: 'Detection rule created or changed' },
      { event: 'scan.completed', description: 'Security scan finished' },
      { event: 'config.changed', description: 'Security tool configuration modified' },
    ],
    auditRequirements: [
      {
        requirement: 'Log integrity assurance',
        details:
          'Security tool audit logs must be tamper-proof because they may be targeted by attackers. Cryptographic integrity provides assurance even if the system is partially compromised.',
      },
      {
        requirement: 'Forensic chain of evidence',
        details:
          'Security investigations require a verifiable chain of evidence. Audit logs must be admissible for legal proceedings and regulatory investigations.',
      },
      {
        requirement: 'Configuration change tracking',
        details:
          'Changes to security tool configurations (detection rules, alert thresholds, access policies) must be logged with full context to support incident investigation.',
      },
      {
        requirement: 'Cross-system correlation',
        details:
          'Security operations require correlating events across multiple tools and systems. Structured, standardized audit events enable SIEM integration and cross-platform analysis.',
      },
    ],
    faqs: [
      {
        question: 'Why do cybersecurity platforms need immutable audit logging?',
        answer:
          'Cybersecurity platforms are high-value targets for attackers. If an attacker compromises a security tool, they may attempt to alter its logs to cover their tracks. SHA-256 hash chains make any alteration mathematically detectable, providing assurance of log integrity even in a partial compromise scenario.',
      },
      {
        question: 'How does AuditKit integrate with existing SIEM platforms?',
        answer:
          'AuditKit provides real-time SIEM streaming that sends structured audit events to your existing SIEM platform (Splunk, Elastic, Datadog, etc.). Events include standardized fields for correlation and can be enriched with custom metadata for your specific use case.',
      },
    ],
  },
  {
    slug: 'devtools',
    name: 'DevTools',
    description:
      'Audit logging for developer tools and platform engineering. Track code changes, deployment events, infrastructure modifications, and access control decisions with cryptographic integrity.',
    overview:
      'Developer tools and platform engineering products serve security-conscious engineering teams that demand visibility into their toolchain. CI/CD platforms, source code management tools, infrastructure-as-code systems, and API management platforms all need comprehensive audit trails. Enterprise customers require SOC 2 compliance, and their security teams want to verify that dev tooling actions are fully traceable. AuditKit provides the audit infrastructure that DevTools companies need to serve enterprise customers, with SDK integration that feels native to developer workflows.',
    complianceNeeds: [
      'SOC 2 Type II (table stakes for enterprise DevTools)',
      'ISO 27001',
      'FedRAMP (for government developer tools)',
      'Supply chain security (SLSA, Sigstore)',
      'SSDF (Secure Software Development Framework)',
    ],
    typicalEvents: [
      { event: 'deploy.initiated', description: 'Deployment pipeline triggered' },
      { event: 'deploy.completed', description: 'Deployment finished (success or failure)' },
      { event: 'config.changed', description: 'Platform configuration modified' },
      { event: 'secret.accessed', description: 'Secret or credential accessed' },
      { event: 'secret.rotated', description: 'Secret or credential rotated' },
      { event: 'api_key.created', description: 'New API key generated' },
      { event: 'permission.changed', description: 'User or team permissions modified' },
      { event: 'environment.created', description: 'New environment provisioned' },
    ],
    auditRequirements: [
      {
        requirement: 'Deployment traceability',
        details:
          'Every deployment must be traceable from code commit through build, test, and release. Audit logs provide the evidence chain that enterprise security teams require.',
      },
      {
        requirement: 'Secret access logging',
        details:
          'Access to secrets, credentials, and API keys must be logged with full context. Enterprise customers need to verify that their secrets are not being accessed inappropriately.',
      },
      {
        requirement: 'Configuration change history',
        details:
          'Platform configuration changes must be logged with who made the change, what changed, and when. This supports SOC 2 change management requirements.',
      },
      {
        requirement: 'Supply chain attestation',
        details:
          'SLSA and other supply chain security frameworks require provenance attestation. Audit logs provide the evidence of build and deployment integrity.',
      },
    ],
    faqs: [
      {
        question: 'Why do developer tools need audit logging?',
        answer:
          'Enterprise customers require SOC 2 compliance from their dev tooling vendors. Security teams need to verify that deployments, secret access, configuration changes, and permission modifications are fully traceable. AuditKit provides the tamper-proof audit trails that enterprise procurement teams require.',
      },
      {
        question: 'How does AuditKit help DevTools companies close enterprise deals?',
        answer:
          'Enterprise security reviews often stall on audit logging questions. AuditKit provides SOC 2-ready audit trails with cryptographic integrity, a React viewer for security team review, and documentation that demonstrates compliance. This accelerates enterprise deal cycles by answering security questionnaires proactively.',
      },
    ],
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug);
}

export function getAllIndustrySlugs(): string[] {
  return industries.map((i) => i.slug);
}
