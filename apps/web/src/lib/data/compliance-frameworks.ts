export interface LoggingRequirement {
  requirement: string;
  details: string;
  auditKitFeature: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ComplianceFramework {
  slug: string;
  name: string;
  fullName: string;
  description: string;
  overview: string;
  loggingRequirements: LoggingRequirement[];
  retentionPeriod: string;
  keyFacts: string[];
  relatedFrameworks: string[];
  faqs: FAQ[];
}

export const complianceFrameworks: ComplianceFramework[] = [
  {
    slug: 'soc2',
    name: 'SOC 2',
    fullName: 'SOC 2 Type II (AICPA Trust Services Criteria)',
    description:
      'SOC 2 requires organizations to maintain comprehensive audit logs that track user activity, system changes, and security events across all trust services criteria.',
    overview:
      'SOC 2 is the de facto compliance standard for B2B SaaS companies. Developed by the AICPA, it evaluates organizations against five Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. Audit logging is foundational to SOC 2 because auditors need verifiable evidence that controls are operating effectively over a sustained period. Without tamper-proof audit trails, achieving SOC 2 Type II becomes significantly harder and more expensive.',
    loggingRequirements: [
      {
        requirement: 'CC6.1 - Logical Access Controls',
        details:
          'Log all authentication events including successful and failed login attempts, MFA challenges, session creation, and session termination. Track user provisioning and deprovisioning.',
        auditKitFeature: 'SHA-256 hash chain captures every auth event with cryptographic integrity verification',
      },
      {
        requirement: 'CC7.2 - System Monitoring',
        details:
          'Monitor and log system activity to detect anomalies, unauthorized access, and security incidents. Maintain audit trails of administrative actions and configuration changes.',
        auditKitFeature: 'Real-time SIEM streaming with tenant-isolated event pipelines',
      },
      {
        requirement: 'CC8.1 - Change Management',
        details:
          'Log all changes to system components including code deployments, infrastructure modifications, configuration updates, and database schema changes.',
        auditKitFeature: 'Structured event schemas capture change context with before/after state diffs',
      },
      {
        requirement: 'CC6.3 - Role-Based Access',
        details:
          'Document and log role assignments, permission changes, and access reviews. Maintain evidence of least-privilege enforcement.',
        auditKitFeature: 'Tenant isolation ensures audit logs cannot be accessed across organizational boundaries',
      },
      {
        requirement: 'CC7.3 - Incident Response',
        details:
          'Maintain detailed logs that support incident investigation, root cause analysis, and forensic review. Logs must be protected from tampering.',
        auditKitFeature: 'Merkle tree proofs provide mathematical guarantees that log entries have not been altered',
      },
    ],
    retentionPeriod: 'Minimum 1 year (SOC 2 Type II audit window is typically 3-12 months)',
    keyFacts: [
      'SOC 2 Type II requires evidence of controls operating over a minimum 3-month period',
      'Audit log integrity is evaluated under the Security trust services criteria (CC6, CC7)',
      'Over 80% of enterprise procurement processes require SOC 2 compliance from vendors',
      'The average SOC 2 audit costs $50,000-$100,000 with traditional approaches',
    ],
    relatedFrameworks: ['iso27001', 'hipaa', 'pci-dss'],
    faqs: [
      {
        question: 'What audit logging is required for SOC 2 compliance?',
        answer:
          'SOC 2 requires logging of authentication events, system access, configuration changes, data modifications, and security incidents. Logs must be tamper-evident, retained for the audit period, and accessible for auditor review. AuditKit satisfies these requirements with SHA-256 hash chains and Merkle tree proofs that provide cryptographic integrity verification.',
      },
      {
        question: 'How long do SOC 2 audit logs need to be retained?',
        answer:
          'SOC 2 Type II audits evaluate controls over a period of at least 3 months, but most organizations retain audit logs for 1 year or longer. The specific retention period depends on your organization\'s policies and what you communicate to your auditor. AuditKit supports configurable retention policies with automatic archival.',
      },
      {
        question: 'Can AuditKit help pass a SOC 2 audit?',
        answer:
          'Yes. AuditKit provides tamper-proof audit trails with SHA-256 hash chains, Merkle tree proofs, and tenant-isolated logging that directly satisfies SOC 2 Trust Services Criteria for system monitoring (CC7.2), logical access (CC6.1), and change management (CC8.1). Multiple AuditKit customers have used the platform to pass SOC 2 Type II audits.',
      },
    ],
  },
  {
    slug: 'iso27001',
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001:2022 Information Security Management',
    description:
      'ISO 27001 mandates audit logging as part of Annex A controls for information security event logging, protection of log information, and administrator activity logging.',
    overview:
      'ISO 27001 is the international standard for information security management systems (ISMS). The 2022 revision reorganized controls into four themes: Organizational, People, Physical, and Technological. Audit logging falls primarily under Annex A control A.8.15 (Logging) and A.8.16 (Monitoring activities). Organizations must produce logs, protect them from tampering, and review them regularly. ISO 27001 certification is recognized globally and increasingly required for cross-border business.',
    loggingRequirements: [
      {
        requirement: 'A.8.15 - Logging',
        details:
          'Produce, store, protect, and analyze logs that record activities, exceptions, faults, and information security events. Logging facilities and log information must be protected against tampering and unauthorized access.',
        auditKitFeature: 'Immutable hash chain logging with cryptographic tamper detection',
      },
      {
        requirement: 'A.8.16 - Monitoring Activities',
        details:
          'Networks, systems, and applications must be monitored for anomalous behavior. Appropriate actions must be taken to evaluate potential security incidents.',
        auditKitFeature: 'SIEM streaming enables real-time anomaly detection and alerting',
      },
      {
        requirement: 'A.5.23 - Information Security for Cloud Services',
        details:
          'Processes for acquisition, use, management, and exit from cloud services must include logging and monitoring requirements.',
        auditKitFeature: 'Multi-tenant isolation ensures cloud audit data is properly segregated',
      },
      {
        requirement: 'A.8.10 - Information Deletion',
        details:
          'Information stored in systems and devices must be deleted when no longer required. Deletion events must be logged.',
        auditKitFeature: 'Structured event logging captures data lifecycle events including deletion with full context',
      },
    ],
    retentionPeriod: 'Organization-defined, typically 1-3 years (must align with risk assessment)',
    keyFacts: [
      'ISO 27001:2022 contains 93 controls organized into 4 themes (reduced from 114 in the 2013 version)',
      'Control A.8.15 explicitly requires protection of logs against tampering',
      'Certification requires annual surveillance audits and recertification every 3 years',
      'Over 70,000 organizations worldwide hold ISO 27001 certification',
    ],
    relatedFrameworks: ['soc2', 'gdpr', 'nis2'],
    faqs: [
      {
        question: 'What does ISO 27001 require for audit logging?',
        answer:
          'ISO 27001 Annex A control A.8.15 requires organizations to produce, store, protect, and analyze logs recording activities, exceptions, faults, and security events. Logs must be protected from tampering and unauthorized access. AuditKit provides cryptographic tamper protection through SHA-256 hash chains and Merkle tree proofs.',
      },
      {
        question: 'How does AuditKit help with ISO 27001 certification?',
        answer:
          'AuditKit directly addresses ISO 27001 controls A.8.15 (Logging), A.8.16 (Monitoring), and A.5.23 (Cloud Security) by providing immutable audit trails, real-time SIEM streaming, and tenant-isolated logging. The built-in React viewer gives auditors a clear interface to review evidence.',
      },
    ],
  },
  {
    slug: 'hipaa',
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description:
      'HIPAA requires covered entities and business associates to implement audit controls that record and examine activity in systems containing electronic protected health information (ePHI).',
    overview:
      'HIPAA is the primary regulatory framework governing the security and privacy of health information in the United States. The Security Rule (45 CFR Part 164) specifically mandates audit controls under section 164.312(b). Any SaaS platform that stores, processes, or transmits ePHI must maintain comprehensive audit trails. HIPAA violations can result in fines ranging from $100 to $50,000 per violation, with annual maximums of $1.5 million per violation category.',
    loggingRequirements: [
      {
        requirement: '164.312(b) - Audit Controls',
        details:
          'Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information.',
        auditKitFeature: 'Comprehensive event capture with SHA-256 hash chains for tamper-evident logging',
      },
      {
        requirement: '164.312(c)(1) - Integrity Controls',
        details:
          'Implement policies and procedures to protect electronic protected health information from improper alteration or destruction.',
        auditKitFeature: 'Merkle tree proofs provide mathematical proof that audit records have not been altered',
      },
      {
        requirement: '164.312(d) - Person or Entity Authentication',
        details:
          'Implement procedures to verify that a person or entity seeking access to ePHI is who they claim to be.',
        auditKitFeature: 'Authentication event logging captures identity verification details for every access attempt',
      },
      {
        requirement: '164.308(a)(5)(ii)(C) - Log-in Monitoring',
        details:
          'Procedures for monitoring log-in attempts and reporting discrepancies.',
        auditKitFeature: 'Real-time authentication event streaming with anomaly detection support',
      },
    ],
    retentionPeriod: '6 years from creation date or last effective date (per 45 CFR 164.530(j))',
    keyFacts: [
      'HIPAA applies to covered entities (healthcare providers, health plans, clearinghouses) and their business associates',
      'The HHS Office for Civil Rights has imposed over $130 million in HIPAA fines since 2003',
      'Audit log requirements are addressable specifications, meaning organizations must assess and implement if reasonable',
      'Business Associate Agreements (BAAs) must address audit logging responsibilities',
    ],
    relatedFrameworks: ['soc2', 'fedramp'],
    faqs: [
      {
        question: 'What audit logging does HIPAA require?',
        answer:
          'HIPAA Security Rule section 164.312(b) requires audit controls that record and examine activity in systems containing ePHI. This includes logging access to patient records, authentication events, data modifications, and system administration actions. AuditKit provides HIPAA-compliant audit logging with tamper-proof hash chains and configurable 6-year retention.',
      },
      {
        question: 'Does AuditKit sign a BAA for HIPAA compliance?',
        answer:
          'AuditKit offers Business Associate Agreements (BAAs) for healthcare customers on paid plans. The platform is designed with HIPAA requirements in mind, including encryption at rest and in transit, access controls, and audit logging that meets 164.312(b) requirements.',
      },
    ],
  },
  {
    slug: 'gdpr',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation (EU) 2016/679',
    description:
      'GDPR requires organizations to demonstrate accountability through records of processing activities and maintain audit trails for data access, consent changes, and data subject requests.',
    overview:
      'The GDPR is the European Union\'s comprehensive data protection regulation, effective since May 2018. While GDPR does not explicitly mandate "audit logs," Articles 5(2), 24, and 30 establish accountability and record-keeping obligations that effectively require detailed audit trails. Organizations must be able to demonstrate compliance at any time, which requires logging of data processing activities, consent management, and data subject request handling. Fines can reach 4% of global annual turnover or 20 million euros, whichever is greater.',
    loggingRequirements: [
      {
        requirement: 'Article 5(2) - Accountability Principle',
        details:
          'The controller shall be responsible for, and be able to demonstrate compliance with, the data protection principles. This requires maintaining records that prove lawful processing.',
        auditKitFeature: 'Immutable audit trails provide verifiable proof of compliance activities',
      },
      {
        requirement: 'Article 30 - Records of Processing Activities',
        details:
          'Maintain records of all processing activities including purposes, data categories, recipients, transfers, retention periods, and security measures.',
        auditKitFeature: 'Structured event schemas capture processing activity details with full context',
      },
      {
        requirement: 'Article 33 - Breach Notification',
        details:
          'Notify supervisory authorities within 72 hours of becoming aware of a personal data breach. This requires detailed incident logging and timeline reconstruction.',
        auditKitFeature: 'SIEM streaming enables real-time breach detection with complete audit trails for timeline reconstruction',
      },
      {
        requirement: 'Article 17 - Right to Erasure Logging',
        details:
          'When processing data erasure requests, organizations must log the request, verification, execution, and confirmation while ensuring the erasure itself is complete.',
        auditKitFeature: 'Event logging captures data subject request lifecycle with cryptographic verification',
      },
    ],
    retentionPeriod: 'Data minimization principle applies - retain logs only as long as necessary for the stated purpose',
    keyFacts: [
      'GDPR fines have exceeded 4 billion euros since enforcement began in 2018',
      'The accountability principle (Article 5(2)) effectively requires audit logging to demonstrate compliance',
      'Data Protection Impact Assessments (DPIAs) under Article 35 should include audit logging provisions',
      'EU supervisory authorities have specifically cited lack of audit trails in enforcement actions',
    ],
    relatedFrameworks: ['nis2', 'dora', 'iso27001'],
    faqs: [
      {
        question: 'Does GDPR require audit logging?',
        answer:
          'While GDPR does not use the term "audit logs" explicitly, the accountability principle (Article 5(2)) requires controllers to demonstrate compliance, which effectively mandates maintaining detailed records of processing activities, consent changes, data access, and data subject requests. AuditKit provides the immutable audit trails needed to satisfy these requirements.',
      },
      {
        question: 'How long should GDPR audit logs be retained?',
        answer:
          'GDPR\'s data minimization principle means audit logs should only be retained as long as necessary for the specific purpose. Most organizations retain compliance-related logs for 3-5 years based on statute of limitations for enforcement actions. AuditKit supports configurable retention policies to match your specific requirements.',
      },
    ],
  },
  {
    slug: 'fedramp',
    name: 'FedRAMP',
    fullName: 'Federal Risk and Authorization Management Program',
    description:
      'FedRAMP requires cloud service providers to implement extensive audit logging based on NIST SP 800-53 controls, including AU-2 through AU-12 for event logging, analysis, and protection.',
    overview:
      'FedRAMP is the U.S. government program that standardizes security assessment and authorization for cloud products and services. Based on NIST SP 800-53, FedRAMP imposes rigorous audit logging requirements across three impact levels: Low, Moderate, and High. The audit and accountability (AU) control family is one of the most scrutinized areas during FedRAMP authorization. Cloud service providers must demonstrate comprehensive logging, log protection, and log analysis capabilities. FedRAMP authorization can take 6-18 months and is required for any cloud service used by federal agencies.',
    loggingRequirements: [
      {
        requirement: 'AU-2 - Event Logging',
        details:
          'Identify events that the system is capable of logging in support of the audit function. Events include password changes, failed logon attempts, access control changes, administrative privilege usage, and system startup/shutdown.',
        auditKitFeature: 'Configurable event capture with comprehensive audit event taxonomy',
      },
      {
        requirement: 'AU-3 - Content of Audit Records',
        details:
          'Audit records must contain the type of event, when the event occurred, where the event occurred, the source of the event, the outcome, and the identity of associated subjects.',
        auditKitFeature: 'Structured event schemas capture all required fields with extensible metadata',
      },
      {
        requirement: 'AU-9 - Protection of Audit Information',
        details:
          'Protect audit information and audit logging tools from unauthorized access, modification, and deletion. Implement cryptographic protections for audit integrity.',
        auditKitFeature: 'SHA-256 hash chains and Merkle tree proofs provide cryptographic integrity protection',
      },
      {
        requirement: 'AU-6 - Audit Record Review, Analysis, and Reporting',
        details:
          'Review and analyze audit records for indications of inappropriate or unusual activity. Report findings to designated officials.',
        auditKitFeature: 'React-based audit viewer with filtering, search, and export capabilities',
      },
      {
        requirement: 'AU-12 - Audit Record Generation',
        details:
          'Provide audit record generation capability for the events defined in AU-2 at all system components. Allow designated personnel to select which events require logging.',
        auditKitFeature: 'SDK-level event generation with configurable event types per tenant',
      },
    ],
    retentionPeriod: 'Minimum 1 year online, 3 years total (per NIST SP 800-53 AU-11)',
    keyFacts: [
      'FedRAMP is based on NIST SP 800-53 Rev 5, which contains 20 audit and accountability (AU) controls',
      'FedRAMP Moderate (the most common level) requires implementation of all 20 AU controls',
      'The Joint Authorization Board (JAB) and agency authorizing officials review audit logging capabilities',
      'FedRAMP Rev 5 transition deadline requires all CSPs to update controls by 2024',
    ],
    relatedFrameworks: ['cmmc', 'sox', 'hipaa'],
    faqs: [
      {
        question: 'What audit logging is required for FedRAMP authorization?',
        answer:
          'FedRAMP requires implementation of NIST SP 800-53 AU controls including AU-2 (Event Logging), AU-3 (Content of Audit Records), AU-6 (Review and Analysis), AU-9 (Protection of Audit Information), and AU-12 (Audit Record Generation). AuditKit addresses these controls with cryptographic hash chains, structured event schemas, SIEM streaming, and a built-in audit viewer.',
      },
      {
        question: 'Can AuditKit be used in a FedRAMP-authorized environment?',
        answer:
          'AuditKit can be self-hosted within your FedRAMP boundary, giving you full control over data residency and network isolation. The SHA-256 hash chains and Merkle tree proofs directly satisfy AU-9 requirements for cryptographic protection of audit information.',
      },
    ],
  },
  {
    slug: 'cmmc',
    name: 'CMMC',
    fullName: 'Cybersecurity Maturity Model Certification',
    description:
      'CMMC requires defense contractors to implement audit logging controls derived from NIST SP 800-171, covering audit event creation, content, review, and protection.',
    overview:
      'CMMC is the Department of Defense (DoD) framework that ensures defense industrial base (DIB) contractors protect Controlled Unclassified Information (CUI). CMMC 2.0 streamlined the model to three levels, with Level 2 mapping directly to NIST SP 800-171 Rev 2. The Audit and Accountability (AU) domain is critical for CMMC compliance, requiring organizations to create, protect, and review audit records. Starting in 2025, CMMC certification is required in DoD contracts, affecting over 300,000 contractors in the defense supply chain.',
    loggingRequirements: [
      {
        requirement: '3.3.1 - Create and Retain Audit Records',
        details:
          'Create and retain system audit records to enable monitoring, analysis, investigation, and reporting of unlawful, unauthorized, or inappropriate system activity.',
        auditKitFeature: 'Immutable hash chain logging with configurable retention policies',
      },
      {
        requirement: '3.3.2 - Individual Accountability',
        details:
          'Ensure that the actions of individual system users can be uniquely traced to those users so they can be held accountable for their actions.',
        auditKitFeature: 'Actor-level event attribution with tenant isolation ensures individual traceability',
      },
      {
        requirement: '3.3.3 - Review and Update Audited Events',
        details:
          'Review and update the set of audited events. Update events based on changes in mission/business functions, threats, or system vulnerabilities.',
        auditKitFeature: 'Configurable event types with SDK-level control over what gets logged',
      },
      {
        requirement: '3.3.5 - Correlate Audit Records',
        details:
          'Correlate audit record review, analysis, and reporting processes for investigation and response to unlawful activities.',
        auditKitFeature: 'SIEM streaming enables correlation across systems with structured event data',
      },
    ],
    retentionPeriod: 'Per NIST SP 800-171: organization-defined, typically 1-3 years',
    keyFacts: [
      'CMMC 2.0 has three levels: Foundational (Level 1), Advanced (Level 2), and Expert (Level 3)',
      'Level 2 maps to 110 security requirements from NIST SP 800-171 Rev 2',
      'CMMC certification is required for DoD contracts starting in 2025 under the CMMC Final Rule',
      'Over 300,000 companies in the Defense Industrial Base are affected by CMMC requirements',
    ],
    relatedFrameworks: ['fedramp', 'nis2', 'soc2'],
    faqs: [
      {
        question: 'What audit logging does CMMC require?',
        answer:
          'CMMC Level 2 requires implementation of NIST SP 800-171 audit controls including creating audit records (3.3.1), ensuring individual accountability (3.3.2), reviewing audited events (3.3.3), and correlating audit records (3.3.5). AuditKit provides immutable logging with cryptographic integrity that satisfies these requirements.',
      },
      {
        question: 'Is AuditKit suitable for CMMC Level 2 compliance?',
        answer:
          'Yes. AuditKit can be self-hosted within your CUI boundary and provides the audit controls required by NIST SP 800-171. SHA-256 hash chains ensure log integrity, tenant isolation supports access control requirements, and SIEM streaming enables the correlation and analysis capabilities CMMC requires.',
      },
    ],
  },
  {
    slug: 'dora',
    name: 'DORA',
    fullName: 'Digital Operational Resilience Act (EU Regulation 2022/2554)',
    description:
      'DORA requires EU financial entities and their ICT service providers to implement comprehensive logging for ICT-related incidents, change management, and access control.',
    overview:
      'The Digital Operational Resilience Act (DORA) is an EU regulation that took effect on January 17, 2025. It establishes a unified framework for digital operational resilience in the financial sector, covering banks, insurance companies, investment firms, crypto-asset providers, and critically, their ICT third-party service providers. DORA mandates detailed logging requirements for ICT risk management, incident reporting, and resilience testing. SaaS platforms serving European financial institutions must demonstrate logging capabilities that support incident classification, root cause analysis, and regulatory reporting.',
    loggingRequirements: [
      {
        requirement: 'Article 9 - ICT Systems Logging',
        details:
          'Financial entities shall put in place mechanisms to promptly detect anomalous activities, including ICT network performance issues and ICT-related incidents. Detection mechanisms shall enable logging of all ICT transactions and activities.',
        auditKitFeature: 'Real-time event capture with SIEM streaming for anomaly detection',
      },
      {
        requirement: 'Article 10 - Incident Response and Logging',
        details:
          'Implement ICT-related incident management processes including indicators of compromise, classification, logging, and impact assessment.',
        auditKitFeature: 'Structured incident event schemas with cryptographic integrity for forensic analysis',
      },
      {
        requirement: 'Article 12 - Backup and Recovery Logging',
        details:
          'Maintain logs of backup, restoration, and recovery activities. Verify the integrity of backed-up data through regular testing.',
        auditKitFeature: 'Immutable audit trails capture backup and recovery operations with Merkle proof verification',
      },
      {
        requirement: 'Article 15 - ICT Third-Party Risk Logging',
        details:
          'Monitor and log activities related to ICT third-party service providers including access, changes, and incidents.',
        auditKitFeature: 'Tenant-isolated logging enables third-party activity monitoring and reporting',
      },
    ],
    retentionPeriod: '5 years minimum for ICT-related incident records (Article 10)',
    keyFacts: [
      'DORA applies to over 22,000 financial entities and ICT service providers in the EU',
      'The regulation became effective on January 17, 2025',
      'DORA explicitly requires logging of all ICT transactions and activities (Article 9)',
      'ICT third-party service providers (including SaaS platforms) are directly regulated under DORA',
    ],
    relatedFrameworks: ['nis2', 'gdpr', 'pci-dss'],
    faqs: [
      {
        question: 'What does DORA require for audit logging?',
        answer:
          'DORA (EU Regulation 2022/2554) requires financial entities to log all ICT transactions and activities (Article 9), maintain incident records for 5 years (Article 10), log backup and recovery operations (Article 12), and monitor third-party ICT provider activities (Article 15). AuditKit provides the immutable, tamper-proof logging that DORA demands.',
      },
      {
        question: 'Does DORA apply to SaaS companies?',
        answer:
          'Yes. DORA directly regulates ICT third-party service providers, including SaaS platforms that serve EU financial institutions. If your SaaS handles data or provides services to banks, insurance companies, or investment firms in the EU, you need DORA-compliant audit logging.',
      },
    ],
  },
  {
    slug: 'nis2',
    name: 'NIS2',
    fullName: 'Network and Information Security Directive 2 (EU Directive 2022/2555)',
    description:
      'NIS2 requires essential and important entities across the EU to implement cybersecurity risk management measures including audit logging, incident reporting, and supply chain security monitoring.',
    overview:
      'NIS2 is the updated EU directive on network and information security, replacing the original NIS Directive. It dramatically expands the scope of organizations that must comply, covering 18 sectors including energy, transport, health, digital infrastructure, and ICT service management. NIS2 mandates cybersecurity risk management measures that include logging and monitoring capabilities. Member states were required to transpose NIS2 into national law by October 17, 2024. Organizations that fail to comply face fines of up to 10 million euros or 2% of global annual turnover.',
    loggingRequirements: [
      {
        requirement: 'Article 21(2)(b) - Incident Handling',
        details:
          'Implement incident handling procedures including detection, analysis, containment, and recovery logging.',
        auditKitFeature: 'Comprehensive incident event logging with SIEM integration for detection and analysis',
      },
      {
        requirement: 'Article 21(2)(d) - Supply Chain Security',
        details:
          'Address security in supply chains including logging and monitoring of third-party access and activities.',
        auditKitFeature: 'Tenant-isolated audit trails track supply chain interactions with cryptographic integrity',
      },
      {
        requirement: 'Article 21(2)(g) - Security Monitoring',
        details:
          'Implement basic cyber hygiene practices and cybersecurity training, including logging and monitoring of security-relevant events.',
        auditKitFeature: 'Real-time event streaming with structured schemas for security event monitoring',
      },
      {
        requirement: 'Article 23 - Incident Reporting',
        details:
          'Report significant incidents to competent authorities within 24 hours (early warning), 72 hours (incident notification), and 1 month (final report). Detailed logs are essential for these reports.',
        auditKitFeature: 'Immutable audit trails provide the forensic evidence needed for mandatory incident reports',
      },
    ],
    retentionPeriod: 'Not explicitly defined; must align with national implementation and risk assessment',
    keyFacts: [
      'NIS2 covers 18 sectors including digital infrastructure, ICT service management, and cloud computing',
      'Member states were required to transpose NIS2 by October 17, 2024',
      'Fines can reach 10 million euros or 2% of global turnover for essential entities',
      'Management bodies can be held personally liable for non-compliance under NIS2',
    ],
    relatedFrameworks: ['dora', 'gdpr', 'iso27001'],
    faqs: [
      {
        question: 'What audit logging does NIS2 require?',
        answer:
          'NIS2 requires cybersecurity risk management measures including incident handling (Article 21(2)(b)), supply chain security monitoring (Article 21(2)(d)), and security event logging (Article 21(2)(g)). Organizations must also maintain logs sufficient for mandatory incident reporting within 24/72-hour timeframes (Article 23). AuditKit provides the immutable audit trails needed for NIS2 compliance.',
      },
      {
        question: 'Does NIS2 apply to SaaS companies?',
        answer:
          'Yes. NIS2 explicitly covers digital infrastructure providers and ICT service management companies. If your SaaS operates in or serves customers in the EU, and falls within one of the 18 covered sectors, you are subject to NIS2 requirements including audit logging and incident reporting.',
      },
    ],
  },
  {
    slug: 'sox',
    name: 'SOX',
    fullName: 'Sarbanes-Oxley Act of 2002',
    description:
      'SOX requires publicly traded companies to maintain audit trails for financial reporting systems, including logging of access to financial data, changes to financial records, and internal controls over financial reporting.',
    overview:
      'The Sarbanes-Oxley Act was enacted in 2002 in response to corporate accounting scandals at Enron, WorldCom, and Tyco. SOX Section 302 and Section 404 establish requirements for internal controls over financial reporting (ICFR). While SOX does not prescribe specific technical controls, the PCAOB auditing standards and COSO framework that underpin SOX compliance require comprehensive audit logging of financial systems. Any SaaS platform that processes, stores, or affects financial data for publicly traded companies must maintain audit trails that support SOX compliance.',
    loggingRequirements: [
      {
        requirement: 'Section 302 - Corporate Responsibility for Financial Reports',
        details:
          'Officers must certify that internal controls are effective. This requires audit trails that demonstrate control operation and evidence of review.',
        auditKitFeature: 'Tamper-proof audit trails provide verifiable evidence of control operation',
      },
      {
        requirement: 'Section 404 - Management Assessment of Internal Controls',
        details:
          'Annual assessment of internal controls over financial reporting (ICFR). External auditors must attest to the effectiveness of these controls, requiring detailed audit evidence.',
        auditKitFeature: 'Merkle tree proofs enable auditors to verify log integrity mathematically',
      },
      {
        requirement: 'PCAOB AS 2201 - IT General Controls',
        details:
          'IT general controls supporting financial reporting must include access controls, change management, and computer operations logging.',
        auditKitFeature: 'Comprehensive event logging covers access, changes, and operations with cryptographic integrity',
      },
      {
        requirement: 'Record Retention (Section 802)',
        details:
          'Knowing destruction, alteration, or falsification of records related to federal investigations or bankruptcy proceedings is a criminal offense with penalties up to 20 years imprisonment.',
        auditKitFeature: 'SHA-256 hash chains make any alteration or deletion cryptographically detectable',
      },
    ],
    retentionPeriod: '7 years minimum for audit workpapers (Section 802); financial records typically 7 years',
    keyFacts: [
      'SOX applies to all publicly traded companies in the United States and their service providers',
      'Section 802 makes document destruction a criminal offense with up to 20 years imprisonment',
      'SOX compliance costs average $1.3 million annually for smaller public companies',
      'The PCAOB oversees auditing standards that define specific logging requirements for SOX',
    ],
    relatedFrameworks: ['soc2', 'pci-dss', 'fedramp'],
    faqs: [
      {
        question: 'What audit trail requirements does SOX have?',
        answer:
          'SOX requires audit trails for financial reporting systems under Sections 302 and 404. PCAOB AS 2201 further specifies IT general controls including access logging, change management tracking, and operations monitoring. AuditKit provides tamper-proof audit trails with SHA-256 hash chains that directly support SOX internal control requirements.',
      },
      {
        question: 'How does AuditKit help with SOX compliance?',
        answer:
          'AuditKit provides immutable audit logging that supports SOX internal controls over financial reporting. SHA-256 hash chains ensure records cannot be altered (addressing Section 802 requirements), Merkle tree proofs enable auditor verification, and SIEM streaming supports real-time monitoring of financial system activities.',
      },
    ],
  },
  {
    slug: 'pci-dss',
    name: 'PCI DSS',
    fullName: 'Payment Card Industry Data Security Standard v4.0',
    description:
      'PCI DSS v4.0 Requirement 10 mandates logging of all access to cardholder data environments, protection of audit trails from tampering, and regular log review and analysis.',
    overview:
      'PCI DSS is the payment card industry standard developed by the PCI Security Standards Council (Visa, Mastercard, Amex, Discover, JCB). Version 4.0 became mandatory on March 31, 2024, replacing v3.2.1. Requirement 10 ("Log and Monitor All Access to System Components and Cardholder Data") is one of the most prescriptive logging requirements in any compliance framework. PCI DSS specifies exactly what events must be logged, what data each log entry must contain, how logs must be protected, and how frequently they must be reviewed.',
    loggingRequirements: [
      {
        requirement: 'Requirement 10.2 - Audit Logs Record User Activities',
        details:
          'Implement automated audit trails for all system components to reconstruct the following events: individual user access to cardholder data, all actions taken by any individual with root or admin privileges, access to all audit trails, invalid logical access attempts, use of and changes to identification and authentication mechanisms, and initialization, stopping, or pausing of audit logs.',
        auditKitFeature: 'Comprehensive event capture with structured schemas covering all PCI DSS required event types',
      },
      {
        requirement: 'Requirement 10.3 - Audit Trail Content',
        details:
          'Record at least the following for each event: user identification, type of event, date and time, success or failure indication, origination of event, and identity or name of affected data, component, or resource.',
        auditKitFeature: 'Structured event schemas capture all required fields with extensible metadata',
      },
      {
        requirement: 'Requirement 10.5 - Secure Audit Trails',
        details:
          'Secure audit trails so they cannot be altered. Use file-integrity monitoring or change-detection software on logs to ensure that existing log data cannot be changed without generating alerts.',
        auditKitFeature: 'SHA-256 hash chains and Merkle tree proofs provide cryptographic tamper detection',
      },
      {
        requirement: 'Requirement 10.7 - Log Retention',
        details:
          'Retain audit trail history for at least 12 months, with at least the most recent three months immediately available for analysis.',
        auditKitFeature: 'Configurable retention with hot/warm/cold storage tiers',
      },
    ],
    retentionPeriod: 'Minimum 12 months, with 3 months immediately available (Requirement 10.7)',
    keyFacts: [
      'PCI DSS v4.0 became mandatory on March 31, 2024',
      'Requirement 10 is one of the 12 core PCI DSS requirements and covers all logging obligations',
      'Non-compliance can result in fines of $5,000-$100,000 per month from payment brands',
      'PCI DSS explicitly requires log integrity protection (Requirement 10.5)',
    ],
    relatedFrameworks: ['soc2', 'sox', 'dora'],
    faqs: [
      {
        question: 'What does PCI DSS require for audit logging?',
        answer:
          'PCI DSS v4.0 Requirement 10 mandates logging all access to cardholder data, admin actions, authentication events, and access control changes. Logs must include user ID, event type, date/time, success/failure, source, and affected resource. Logs must be tamper-proof (10.5) and retained for 12 months (10.7). AuditKit provides all of these capabilities with cryptographic integrity.',
      },
      {
        question: 'How does AuditKit satisfy PCI DSS Requirement 10.5?',
        answer:
          'PCI DSS Requirement 10.5 requires that audit trails cannot be altered. AuditKit uses SHA-256 hash chains where each log entry includes a hash of the previous entry, creating a cryptographic chain. Merkle tree proofs allow any entry to be verified without scanning the entire log. This exceeds the file-integrity monitoring that PCI DSS 10.5 requires.',
      },
    ],
  },
  {
    slug: 'eu-ai-act',
    name: 'EU AI Act',
    fullName: 'EU Artificial Intelligence Act (Regulation 2024/1689)',
    description:
      'The EU AI Act requires providers of high-risk AI systems to implement automatic logging of events relevant to identifying risks, monitoring operations, and ensuring traceability throughout the AI lifecycle.',
    overview:
      'The EU AI Act is the world\'s first comprehensive AI regulation, entered into force on August 1, 2024. It establishes a risk-based framework for AI systems operating in the EU, with the most stringent requirements applying to high-risk AI systems. Article 12 specifically mandates automatic logging capabilities for high-risk AI systems, requiring providers to record events throughout the system lifecycle. This includes model training decisions, inference outputs, user interactions, and system modifications. SaaS platforms that incorporate AI features and serve EU customers must implement logging that meets these requirements.',
    loggingRequirements: [
      {
        requirement: 'Article 12 - Record-Keeping (Automatic Logging)',
        details:
          'High-risk AI systems shall be designed and developed with capabilities enabling the automatic recording of events (logs) while the system is operating. Logging must capture the period of each use, the reference database, input data, and identification of natural persons involved in verification.',
        auditKitFeature: 'Automated event capture with structured schemas for AI system lifecycle logging',
      },
      {
        requirement: 'Article 14 - Human Oversight',
        details:
          'High-risk AI systems shall be designed to allow human oversight, including the ability to understand system capacities and limitations. Oversight actions must be logged.',
        auditKitFeature: 'Human-in-the-loop decision logging with actor attribution and approval workflows',
      },
      {
        requirement: 'Article 61 - Post-Market Monitoring',
        details:
          'Providers must establish post-market monitoring systems to collect and analyze data on AI system performance, including logging of incidents and malfunctions.',
        auditKitFeature: 'Continuous event streaming enables post-market monitoring with SIEM integration',
      },
      {
        requirement: 'Article 72 - Reporting Serious Incidents',
        details:
          'Providers must report serious incidents to market surveillance authorities. Detailed logs are essential for incident investigation and reporting.',
        auditKitFeature: 'Immutable audit trails with Merkle proof verification support forensic incident analysis',
      },
    ],
    retentionPeriod: 'Logs must be kept for a period appropriate to the intended purpose of the high-risk AI system, at least 6 months (Article 12(2))',
    keyFacts: [
      'The EU AI Act entered into force on August 1, 2024, with obligations phasing in through 2027',
      'Article 12 explicitly requires automatic logging capabilities for high-risk AI systems',
      'Prohibited AI practices (Article 5) took effect on February 2, 2025',
      'Fines can reach 35 million euros or 7% of global annual turnover for the most serious violations',
    ],
    relatedFrameworks: ['gdpr', 'nis2', 'iso27001'],
    faqs: [
      {
        question: 'What logging does the EU AI Act require?',
        answer:
          'The EU AI Act Article 12 requires high-risk AI systems to have automatic logging of events including each period of use, reference databases, input data, and identification of involved persons. Article 14 requires logging of human oversight actions, and Article 61 requires post-market monitoring data collection. AuditKit provides the immutable, structured logging infrastructure these requirements demand.',
      },
      {
        question: 'Does the EU AI Act apply to my SaaS product?',
        answer:
          'If your SaaS incorporates AI features and operates in or serves customers in the EU, the AI Act likely applies. High-risk AI systems (Annex III) have the strictest logging requirements, but even limited-risk systems have transparency obligations. Any AI-powered SaaS handling recruitment, credit scoring, education, or law enforcement functions is classified as high-risk.',
      },
    ],
  },
];

export function getFramework(slug: string): ComplianceFramework | undefined {
  return complianceFrameworks.find((f) => f.slug === slug);
}

export function getAllFrameworkSlugs(): string[] {
  return complianceFrameworks.map((f) => f.slug);
}
