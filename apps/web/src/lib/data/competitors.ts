export interface FAQ {
  question: string;
  answer: string;
}

export interface FeatureComparison {
  feature: string;
  auditkit: boolean | string;
  competitor: boolean | string;
}

export interface Competitor {
  slug: string;
  name: string;
  pricing: string;
  category: 'GRC' | 'Observability' | 'Audit-specific';
  description: string;
  features: FeatureComparison[];
  strengths: string[];
  weaknesses: string[];
  auditkitAdvantages: { title: string; description: string }[];
  faqs: FAQ[];
}

export const competitors: Competitor[] = [
  {
    slug: 'vanta',
    name: 'Vanta',
    pricing: 'Starting ~$10,000/yr (annual contracts, custom pricing)',
    category: 'GRC',
    description:
      'Compare AuditKit and Vanta for SOC 2 compliance. Vanta is the largest GRC automation platform, while AuditKit provides tamper-proof evidence with transparent pricing from $99/mo.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Policy templates', auditkit: true, competitor: true },
      { feature: 'Evidence vault', auditkit: true, competitor: true },
      { feature: 'Access reviews', auditkit: 'Included', competitor: 'Paid add-on' },
      { feature: 'Risk register', auditkit: 'Built-in', competitor: 'Limited' },
      { feature: 'Control catalog', auditkit: true, competitor: true },
      { feature: 'Vendor management', auditkit: true, competitor: true },
      { feature: 'Trust center', auditkit: 'Coming soon', competitor: true },
      { feature: 'Transparent pricing', auditkit: true, competitor: false },
      { feature: 'Monthly billing (no lock-in)', auditkit: true, competitor: false },
      { feature: 'SOC 2 starting price', auditkit: '$99/mo', competitor: '$10K+/yr' },
      { feature: 'Cryptographic evidence integrity', auditkit: true, competitor: false },
    ],
    strengths: [
      'Largest integration library (300+ pre-built integrations)',
      'Most recognized brand in compliance automation',
      'Trust center for sharing compliance posture',
      'Large customer success and support teams',
    ],
    weaknesses: [
      'Expensive annual contracts ($10K+/yr) with price increases at renewal',
      'Multi-year lock-in contracts are standard',
      'No cryptographic evidence integrity',
      'Proprietary platform with no self-hosting option',
      'Sales-led process requires demo calls for pricing',
    ],
    auditkitAdvantages: [
      {
        title: 'Tamper-proof evidence',
        description:
          'AuditKit uses SHA-256 hash chains and Merkle tree proofs to cryptographically guarantee evidence integrity. Vanta stores evidence but cannot prove it has not been altered.',
      },
      {
        title: 'Transparent pricing from $99/mo',
        description:
          'AuditKit offers public pricing with monthly billing and no lock-in. Vanta requires sales calls and typically involves multi-year contracts at $10K+/yr.',
      },
      {
        title: 'Open source',
        description:
          'AuditKit is open source. You can inspect the code, self-host, and avoid vendor lock-in. Vanta is a closed-source proprietary platform.',
      },
    ],
    faqs: [
      {
        question: 'How does AuditKit compare to Vanta?',
        answer:
          'AuditKit and Vanta both help companies achieve SOC 2 compliance. Vanta is the market leader with 300+ integrations and a large sales team, but requires annual contracts at $10K+/yr. AuditKit is open source, starts at $99/mo with no lock-in, and provides tamper-proof evidence through SHA-256 hash chains that Vanta does not offer.',
      },
      {
        question: 'Is AuditKit cheaper than Vanta?',
        answer:
          'Yes. AuditKit starts at $99/mo with monthly billing and no contracts. Vanta typically starts at $10,000+/yr with annual or multi-year commitments. For early-stage startups, AuditKit costs roughly 90% less than Vanta.',
      },
    ],
  },
  {
    slug: 'drata',
    name: 'Drata',
    pricing: 'Starting ~$10,000/yr (annual contracts, custom pricing)',
    category: 'GRC',
    description:
      'Compare AuditKit and Drata for SOC 2 compliance automation. Both platforms help companies achieve SOC 2, but AuditKit provides cryptographic evidence integrity at a fraction of the cost.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Policy templates', auditkit: true, competitor: true },
      { feature: 'Evidence vault', auditkit: true, competitor: true },
      { feature: 'Continuous monitoring', auditkit: true, competitor: true },
      { feature: 'Risk management', auditkit: 'Built-in', competitor: true },
      { feature: 'Trust center', auditkit: 'Coming soon', competitor: true },
      { feature: 'Transparent pricing', auditkit: true, competitor: false },
      { feature: 'Monthly billing (no lock-in)', auditkit: true, competitor: false },
      { feature: 'SOC 2 starting price', auditkit: '$99/mo', competitor: '$10K+/yr' },
      { feature: 'Self-hosting option', auditkit: true, competitor: false },
    ],
    strengths: [
      'Strong continuous monitoring and automation',
      'Good integration library',
      'Built-in trust center',
      'Multi-framework support (SOC 2, ISO 27001, HIPAA, PCI DSS)',
    ],
    weaknesses: [
      'Annual contracts with sales-led pricing',
      'No cryptographic evidence integrity',
      'Proprietary platform',
      'Price increases common at renewal',
    ],
    auditkitAdvantages: [
      {
        title: 'Cryptographic evidence integrity',
        description:
          'AuditKit provides SHA-256 hash chains and Merkle tree proofs for mathematical evidence integrity. Drata stores evidence but offers no cryptographic tamper detection.',
      },
      {
        title: '90% lower starting price',
        description:
          'AuditKit starts at $99/mo with monthly billing. Drata requires annual contracts starting at approximately $10K/yr.',
      },
      {
        title: 'Self-hosting option',
        description:
          'AuditKit can be self-hosted for full data control. Drata is cloud-only with no self-hosting option.',
      },
    ],
    faqs: [
      {
        question: 'How does AuditKit compare to Drata?',
        answer:
          'Both AuditKit and Drata automate SOC 2 compliance. Drata offers strong continuous monitoring and a trust center, but requires annual contracts at $10K+/yr. AuditKit is open source, starts at $99/mo, and provides cryptographic evidence integrity that Drata does not offer.',
      },
      {
        question: 'Should I choose AuditKit or Drata?',
        answer:
          'Choose AuditKit if you want tamper-proof evidence, transparent pricing, open-source flexibility, or the option to self-host. Choose Drata if you need a large integration library and are willing to commit to annual contracts.',
      },
    ],
  },
  {
    slug: 'splunk',
    name: 'Splunk',
    pricing: 'Usage-based, typically $20K-$500K+/yr depending on data volume',
    category: 'Observability',
    description:
      'Compare AuditKit and Splunk for audit logging. Splunk is a general-purpose SIEM/observability platform, while AuditKit is purpose-built for compliance-grade audit trails with cryptographic integrity.',
    features: [
      { feature: 'Purpose-built for audit logging', auditkit: true, competitor: false },
      { feature: 'SHA-256 hash chain integrity', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Tenant isolation', auditkit: true, competitor: 'Manual config' },
      { feature: 'Real-time search', auditkit: true, competitor: true },
      { feature: 'Custom dashboards', auditkit: 'React viewer', competitor: true },
      { feature: 'Log aggregation', auditkit: 'Audit events', competitor: 'All logs' },
      { feature: 'SIEM capabilities', auditkit: 'Streams to SIEM', competitor: 'Full SIEM' },
      { feature: 'Machine learning', auditkit: false, competitor: true },
      { feature: 'Predictable pricing', auditkit: '$99/mo', competitor: 'Usage-based' },
      { feature: 'Open source', auditkit: true, competitor: false },
    ],
    strengths: [
      'Industry-leading SIEM with advanced search and analytics',
      'Handles massive data volumes across all log types',
      'Machine learning and anomaly detection',
      'Huge ecosystem of apps and integrations',
      'Strong brand recognition in enterprise security',
    ],
    weaknesses: [
      'Extremely expensive at scale (data volume pricing)',
      'Not purpose-built for compliance audit trails',
      'No cryptographic log integrity',
      'Complex to configure for audit compliance use cases',
      'Steep learning curve (SPL query language)',
      'No built-in tenant isolation for SaaS audit logging',
    ],
    auditkitAdvantages: [
      {
        title: 'Purpose-built for compliance',
        description:
          'AuditKit is designed specifically for compliance-grade audit logging. Splunk is a general-purpose SIEM that can be configured for auditing but requires significant setup and expertise.',
      },
      {
        title: 'Cryptographic integrity',
        description:
          'AuditKit provides SHA-256 hash chains and Merkle tree proofs. Splunk stores logs but cannot cryptographically prove they have not been altered.',
      },
      {
        title: 'Predictable pricing',
        description:
          'AuditKit starts at $99/mo with predictable pricing. Splunk charges based on data ingestion volume, which can lead to unexpected costs as your audit log volume grows.',
      },
    ],
    faqs: [
      {
        question: 'Should I use AuditKit or Splunk for audit logging?',
        answer:
          'Use AuditKit if you need compliance-grade audit trails with cryptographic integrity and predictable pricing. Use Splunk if you need a full SIEM with advanced analytics, machine learning, and log aggregation across all data sources. Many organizations use both: AuditKit for tamper-proof audit logging and Splunk for broader security analytics, with AuditKit streaming events to Splunk.',
      },
      {
        question: 'Can AuditKit replace Splunk?',
        answer:
          'AuditKit is not a Splunk replacement. AuditKit is purpose-built for compliance audit trails, while Splunk is a general-purpose SIEM/observability platform. AuditKit streams to Splunk via SIEM integration, so they work well together.',
      },
    ],
  },
  {
    slug: 'datadog',
    name: 'Datadog',
    pricing: 'Log Management from $0.10/GB ingested + retention costs',
    category: 'Observability',
    description:
      'Compare AuditKit and Datadog for audit logging. Datadog is a full-stack observability platform, while AuditKit provides compliance-focused audit trails with cryptographic tamper detection.',
    features: [
      { feature: 'Purpose-built for audit logging', auditkit: true, competitor: false },
      { feature: 'SHA-256 hash chain integrity', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Tenant isolation', auditkit: true, competitor: 'Manual' },
      { feature: 'APM integration', auditkit: false, competitor: true },
      { feature: 'Infrastructure monitoring', auditkit: false, competitor: true },
      { feature: 'Log management', auditkit: 'Audit events', competitor: 'All logs' },
      { feature: 'Compliance-ready reports', auditkit: true, competitor: 'Limited' },
      { feature: 'Predictable pricing', auditkit: '$99/mo', competitor: 'Usage-based' },
      { feature: 'Open source', auditkit: true, competitor: false },
    ],
    strengths: [
      'Comprehensive full-stack observability (APM, metrics, logs, traces)',
      'Excellent visualization and dashboarding',
      'Strong integration ecosystem',
      'Real-time alerting and anomaly detection',
    ],
    weaknesses: [
      'Usage-based pricing can become very expensive',
      'Not designed for compliance audit trails',
      'No cryptographic log integrity',
      'Audit logging is a secondary use case',
      'Complex pricing model with many SKUs',
    ],
    auditkitAdvantages: [
      {
        title: 'Compliance-first design',
        description:
          'AuditKit is built for compliance audit trails. Datadog is an observability platform where log management is one of many features. AuditKit provides compliance-specific features like tenant isolation, structured audit events, and cryptographic integrity.',
      },
      {
        title: 'Tamper-proof audit trails',
        description:
          'AuditKit uses SHA-256 hash chains to ensure audit records cannot be altered. Datadog provides no cryptographic integrity guarantees for stored logs.',
      },
      {
        title: 'Cost-effective for audit logging',
        description:
          'AuditKit starts at $99/mo for audit logging. Datadog log management pricing is based on ingestion volume and retention, which can escalate quickly.',
      },
    ],
    faqs: [
      {
        question: 'Should I use AuditKit or Datadog for audit logging?',
        answer:
          'Use AuditKit for compliance-grade audit trails with cryptographic integrity. Use Datadog for full-stack observability including APM, metrics, and general log management. AuditKit streams to Datadog via SIEM integration, so you can use both: AuditKit for tamper-proof audit logging and Datadog for broader observability.',
      },
      {
        question: 'Can Datadog provide compliance-grade audit logging?',
        answer:
          'Datadog can store audit logs but is not purpose-built for compliance. It lacks cryptographic integrity verification, built-in tenant isolation, and compliance-specific reporting. For SOC 2, HIPAA, or PCI DSS audit logging requirements, a purpose-built solution like AuditKit provides stronger compliance guarantees.',
      },
    ],
  },
  {
    slug: 'elastic',
    name: 'Elastic (ELK Stack)',
    pricing: 'Open source (self-hosted) or Elastic Cloud from $95/mo',
    category: 'Observability',
    description:
      'Compare AuditKit and Elastic (ELK Stack) for audit logging. Elastic is a powerful search and analytics engine, while AuditKit provides purpose-built compliance audit trails with cryptographic integrity.',
    features: [
      { feature: 'Purpose-built for audit logging', auditkit: true, competitor: false },
      { feature: 'SHA-256 hash chain integrity', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Tenant isolation', auditkit: true, competitor: 'Manual' },
      { feature: 'Full-text search', auditkit: true, competitor: true },
      { feature: 'Open source', auditkit: true, competitor: 'Partial (SSPL)' },
      { feature: 'Self-hosting', auditkit: true, competitor: true },
      { feature: 'Visualization', auditkit: 'React viewer', competitor: 'Kibana' },
      { feature: 'Log aggregation', auditkit: 'Audit events', competitor: 'All logs' },
      { feature: 'Compliance reports', auditkit: true, competitor: 'Manual' },
    ],
    strengths: [
      'Powerful search and analytics engine',
      'Kibana visualization and dashboarding',
      'Can be self-hosted (SSPL license)',
      'Handles very large data volumes',
      'Strong ecosystem (Logstash, Beats, etc.)',
    ],
    weaknesses: [
      'Not designed for compliance audit trails',
      'No cryptographic log integrity',
      'Significant operational overhead for self-hosting',
      'Requires expertise to configure for audit compliance',
      'License changed from Apache 2.0 to SSPL',
      'No built-in tenant isolation',
    ],
    auditkitAdvantages: [
      {
        title: 'Zero-config compliance',
        description:
          'AuditKit provides compliance-grade audit trails out of the box. Elastic requires significant configuration and custom development to achieve similar compliance capabilities.',
      },
      {
        title: 'Cryptographic integrity',
        description:
          'AuditKit provides SHA-256 hash chains and Merkle tree proofs. Elastic stores data but has no built-in mechanism to prove logs have not been tampered with.',
      },
      {
        title: 'Lower operational overhead',
        description:
          'AuditKit is a managed service (or simple self-hosted deployment) purpose-built for audit logging. Running Elastic for audit compliance requires managing Elasticsearch clusters, configuring retention policies, and building custom compliance tooling.',
      },
    ],
    faqs: [
      {
        question: 'Should I use AuditKit or Elastic for audit logging?',
        answer:
          'Use AuditKit for compliance-grade audit trails with cryptographic integrity and minimal operational overhead. Use Elastic if you need a general-purpose search and analytics engine for all types of log data. AuditKit can stream events to Elastic via SIEM integration for organizations that want both compliance-grade auditing and powerful search analytics.',
      },
      {
        question: 'Can I build audit logging on top of Elasticsearch?',
        answer:
          'You can store audit events in Elasticsearch, but you will need to build cryptographic integrity, tenant isolation, compliance reporting, and audit-specific query interfaces yourself. AuditKit provides all of these out of the box, saving months of engineering effort.',
      },
    ],
  },
  {
    slug: 'workos-auditlog',
    name: 'WorkOS Audit Log',
    pricing: 'Included in WorkOS enterprise plans (usage-based)',
    category: 'Audit-specific',
    description:
      'Compare AuditKit and WorkOS Audit Log for B2B SaaS audit logging. Both are developer-focused, but AuditKit provides cryptographic integrity and can be used independently from an identity provider.',
    features: [
      { feature: 'Standalone audit logging', auditkit: true, competitor: 'Bundled with WorkOS' },
      { feature: 'SHA-256 hash chain integrity', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Tenant isolation', auditkit: true, competitor: true },
      { feature: 'Event export', auditkit: true, competitor: true },
      { feature: 'SIEM streaming', auditkit: true, competitor: true },
      { feature: 'React viewer component', auditkit: true, competitor: true },
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'SSO/SCIM included', auditkit: false, competitor: true },
      { feature: 'Multi-language SDKs', auditkit: true, competitor: true },
    ],
    strengths: [
      'Clean developer experience and documentation',
      'Integrated with WorkOS SSO, SCIM, and Directory Sync',
      'Drop-in React component for customer-facing audit log viewer',
      'Good enterprise features (SIEM export, event filtering)',
    ],
    weaknesses: [
      'Tied to the WorkOS platform (not standalone)',
      'No cryptographic log integrity',
      'Limited compliance reporting features',
      'Closed source',
      'Usage-based pricing can be unpredictable',
    ],
    auditkitAdvantages: [
      {
        title: 'Standalone product',
        description:
          'AuditKit is a standalone audit logging platform that works with any identity provider. WorkOS Audit Log is bundled with WorkOS and requires adopting their SSO/SCIM platform.',
      },
      {
        title: 'Cryptographic integrity',
        description:
          'AuditKit provides SHA-256 hash chains and Merkle tree proofs for tamper-proof audit trails. WorkOS Audit Log stores events but offers no cryptographic integrity verification.',
      },
      {
        title: 'Open source',
        description:
          'AuditKit is open source with a self-hosting option. WorkOS Audit Log is closed source and cloud-only.',
      },
    ],
    faqs: [
      {
        question: 'How does AuditKit compare to WorkOS Audit Log?',
        answer:
          'Both AuditKit and WorkOS Audit Log provide developer-focused audit logging for B2B SaaS. WorkOS bundles audit logging with SSO, SCIM, and Directory Sync. AuditKit is a standalone product with cryptographic integrity (SHA-256 hash chains), open source code, and a self-hosting option.',
      },
      {
        question: 'Can I use AuditKit if I already use WorkOS for SSO?',
        answer:
          'Yes. AuditKit is identity-provider agnostic and works alongside any SSO solution including WorkOS, Auth0, Clerk, and Okta. You can use WorkOS for authentication and AuditKit for tamper-proof audit logging.',
      },
    ],
  },
  {
    slug: 'pangea',
    name: 'Pangea',
    pricing: 'Free tier available, paid plans from usage-based pricing',
    category: 'Audit-specific',
    description:
      'Compare AuditKit and Pangea Secure Audit Log. Both provide tamper-evident logging, but AuditKit is open source with broader compliance tooling beyond just audit events.',
    features: [
      { feature: 'Tamper-evident logging', auditkit: true, competitor: true },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: true },
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Self-hosting option', auditkit: true, competitor: false },
      { feature: 'SOC 2 compliance tooling', auditkit: true, competitor: false },
      { feature: 'Policy templates', auditkit: true, competitor: false },
      { feature: 'Evidence vault', auditkit: true, competitor: false },
      { feature: 'SIEM streaming', auditkit: true, competitor: true },
      { feature: 'Multi-language SDKs', auditkit: true, competitor: true },
      { feature: 'React viewer', auditkit: true, competitor: false },
    ],
    strengths: [
      'Tamper-evident logging with tree proofs',
      'Part of a broader security services platform',
      'Free tier for development',
      'Multi-language SDK support',
    ],
    weaknesses: [
      'Closed source, cloud-only',
      'No compliance tooling beyond audit logging',
      'No built-in SOC 2/compliance features',
      'Limited reporting and visualization',
      'Smaller community and ecosystem',
    ],
    auditkitAdvantages: [
      {
        title: 'Complete compliance platform',
        description:
          'AuditKit provides audit logging plus SOC 2 compliance tooling including policy templates, evidence vault, risk register, and control catalog. Pangea provides only the audit log component.',
      },
      {
        title: 'Open source with self-hosting',
        description:
          'AuditKit is fully open source and can be self-hosted. Pangea is closed source and cloud-only.',
      },
      {
        title: 'Built-in React viewer',
        description:
          'AuditKit includes a React-based audit viewer for both internal teams and customer-facing audit log access. Pangea requires building your own UI.',
      },
    ],
    faqs: [
      {
        question: 'How does AuditKit compare to Pangea Secure Audit Log?',
        answer:
          'Both AuditKit and Pangea provide tamper-evident audit logging. AuditKit differentiates with its open source model, self-hosting option, complete SOC 2 compliance tooling (policy templates, evidence vault, control catalog), and built-in React viewer. Pangea provides audit logging as one of several security API services.',
      },
      {
        question: 'Does Pangea offer the same cryptographic integrity as AuditKit?',
        answer:
          'Pangea provides tamper-evident logging with tree proofs, similar to AuditKit. However, AuditKit is open source so you can verify the implementation yourself, and AuditKit bundles compliance tooling that Pangea does not offer.',
      },
    ],
  },
  {
    slug: 'retraced',
    name: 'Retraced',
    pricing: 'Open source (self-hosted), commercial plans available',
    category: 'Audit-specific',
    description:
      'Compare AuditKit and Retraced for B2B SaaS audit logging. Both are developer-focused audit log solutions, but AuditKit provides stronger cryptographic integrity and a more complete compliance platform.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: true },
      { feature: 'SHA-256 hash chain', auditkit: true, competitor: 'Basic' },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'SOC 2 compliance tooling', auditkit: true, competitor: false },
      { feature: 'Policy templates', auditkit: true, competitor: false },
      { feature: 'Evidence vault', auditkit: true, competitor: false },
      { feature: 'SIEM streaming', auditkit: true, competitor: 'Limited' },
      { feature: 'React viewer', auditkit: true, competitor: 'Embedded viewer' },
      { feature: 'Multi-language SDKs', auditkit: true, competitor: 'Node.js focus' },
      { feature: 'Active maintenance', auditkit: true, competitor: 'Minimal' },
    ],
    strengths: [
      'Open source with self-hosting',
      'Purpose-built for B2B SaaS audit logging',
      'Embedded viewer component',
      'Event export and search',
    ],
    weaknesses: [
      'Limited active maintenance and updates',
      'No Merkle tree proofs for integrity verification',
      'No SOC 2 compliance tooling',
      'Limited SDK language support',
      'Smaller community',
      'No SIEM streaming',
    ],
    auditkitAdvantages: [
      {
        title: 'Active development',
        description:
          'AuditKit is actively maintained with regular updates, new features, and security patches. Retraced has had minimal updates in recent years.',
      },
      {
        title: 'Stronger cryptographic integrity',
        description:
          'AuditKit provides SHA-256 hash chains with Merkle tree proofs for efficient verification of individual events. Retraced has basic hash chain support without Merkle proofs.',
      },
      {
        title: 'Complete compliance platform',
        description:
          'AuditKit includes SOC 2 compliance tooling, policy templates, evidence vault, and risk register. Retraced provides only the audit logging component.',
      },
    ],
    faqs: [
      {
        question: 'How does AuditKit compare to Retraced?',
        answer:
          'Both AuditKit and Retraced are open source audit logging solutions for B2B SaaS. AuditKit provides stronger cryptographic integrity (Merkle tree proofs), active maintenance, multi-language SDKs, SIEM streaming, and complete SOC 2 compliance tooling. Retraced is a simpler audit log solution with more limited features and maintenance.',
      },
      {
        question: 'Is AuditKit a replacement for Retraced?',
        answer:
          'Yes. AuditKit provides all of Retraced\'s audit logging capabilities plus Merkle tree proofs, SIEM streaming, multi-language SDKs, and SOC 2 compliance tooling. Organizations using Retraced can migrate to AuditKit for a more complete and actively maintained solution.',
      },
    ],
  },
  {
    slug: 'sprinto',
    name: 'Sprinto',
    pricing: 'Starting ~$5,000-$10,000/yr (annual contracts, sales-led)',
    category: 'GRC',
    description:
      'Compare AuditKit and Sprinto for SOC 2 compliance. Sprinto is positioned as a cheaper Drata/Vanta alternative for early-stage startups; AuditKit is open source with tamper-proof evidence at $99/mo and a free self-hosted option.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Self-hosted option', auditkit: true, competitor: false },
      { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Multi-language audit log SDKs', auditkit: 'TS, Python, Go, Java', competitor: 'Limited' },
      { feature: 'Policy templates', auditkit: true, competitor: true },
      { feature: 'Evidence vault', auditkit: true, competitor: true },
      { feature: 'Continuous control monitoring', auditkit: 'Roadmap', competitor: true },
      { feature: 'Vendor risk management', auditkit: 'Basic', competitor: true },
      { feature: 'Auditor portal', auditkit: 'Built-in', competitor: 'Add-on' },
      { feature: 'Transparent published pricing', auditkit: true, competitor: false },
      { feature: 'Self-serve trial without sales call', auditkit: true, competitor: false },
      { feature: 'Monthly billing (no annual lock-in)', auditkit: true, competitor: false },
      { feature: 'SOC 2 starting price', auditkit: '$99/mo (free self-host)', competitor: '~$5K+/yr' },
      { feature: 'Cryptographic evidence integrity', auditkit: true, competitor: false },
    ],
    strengths: [
      'Lower priced than Drata or Vanta — entry point under $10K/yr',
      'Continuous control monitoring across cloud and SaaS',
      'Established vendor risk management workflows',
      'Mature integrations with major identity providers and cloud platforms',
      'Active customer success team and onboarding support',
    ],
    weaknesses: [
      'Annual contracts required — no monthly billing option',
      'Sales-led purchase requires a demo before access to pricing',
      'No self-hosting option for organizations with data residency requirements',
      'No cryptographic evidence integrity (hash chains, Merkle proofs)',
      'No open-source codebase to inspect or extend',
      'Audit log functionality is basic compared to dedicated audit log platforms',
      'Pricing scales aggressively as you add competitors and seats',
    ],
    auditkitAdvantages: [
      {
        title: '99% lower entry cost',
        description:
          'AuditKit cloud starts at $99/mo ($1,188/yr) vs Sprinto\'s ~$5,000-$10,000/yr typical entry. Self-hosted is free under AGPLv3. Same core SOC 2 evidence and audit log capabilities at a fraction of the cost — ideal for pre-seed through Series A startups where Sprinto pricing is still hard to justify.',
      },
      {
        title: 'Self-serve onboarding (no demo required)',
        description:
          'Sign up, drop in the SDK, start logging audit events the same day. Sprinto requires a sales call and onboarding process before you can use the product. For startups with a SOC 2 deadline measured in weeks, the difference between same-day setup and 3-4 week onboarding is substantial.',
      },
      {
        title: 'Cryptographic evidence integrity Sprinto cannot match',
        description:
          'AuditKit hash-chains every audit event so any tampering shows up as a broken chain — and exports Merkle proofs that an auditor can independently verify. Sprinto\'s evidence is stored in a database with database-level access controls; it has no cryptographic integrity verification. Auditors increasingly ask about this.',
      },
      {
        title: 'Open source under AGPLv3',
        description:
          'Self-host on your infrastructure for $0 in licensing. Inspect the codebase, audit the hash-chain implementation, extend the SDK for custom needs. Sprinto is a closed-source SaaS — you trust the vendor or you don\'t use the product.',
      },
      {
        title: 'Drop-in SDK in four languages',
        description:
          'TypeScript, Python, Go, and Java SDKs with the same event schema across all four. Sprinto\'s audit log functionality is basic and integrates via cloud-platform connectors rather than direct in-application instrumentation.',
      },
      {
        title: 'Auditor portal included, not added-on',
        description:
          'AuditKit ships a read-only auditor portal at no extra cost — auditors pull tenant-scoped, time-bounded evidence directly without burning your engineering team\'s week. Sprinto charges for advanced auditor access in higher tiers.',
      },
    ],
    faqs: [
      {
        question: 'Is AuditKit a Sprinto alternative?',
        answer:
          'Yes, particularly for the audit log and evidence-collection slice of the SOC 2 platform. Sprinto is a full GRC platform — vendor risk, continuous control monitoring, policy management — and AuditKit covers the audit log + evidence portal at much lower cost with cryptographic integrity Sprinto does not have. For startups whose primary SOC 2 need is "tamper-proof audit logs and an auditor-friendly evidence portal," AuditKit replaces 80% of Sprinto\'s value at 1-5% of the cost. For organizations needing the full GRC platform (vendor risk, control monitoring, policy library), Sprinto plus AuditKit can coexist — Sprinto for the platform layer, AuditKit for the audit log layer.',
      },
      {
        question: 'How does AuditKit compare to Sprinto on price?',
        answer:
          'AuditKit cloud starts at $99/month ($1,188/year) with monthly billing and no annual commitment. AuditKit self-hosted is free under AGPLv3. Sprinto typically starts around $5,000-$10,000/year on annual contracts. For early-stage startups, the AuditKit cloud tier is a 4-10x cost reduction for the audit log and evidence-collection use case.',
      },
      {
        question: 'What does Sprinto have that AuditKit does not?',
        answer:
          'Sprinto is a fuller GRC platform: continuous control monitoring across cloud and SaaS, mature vendor risk management workflows, policy management with version control, and broader pre-built integrations with identity providers and cloud platforms. AuditKit\'s focus is the audit log + evidence portal slice — narrower scope, deeper capability in that slice (cryptographic integrity, multi-language SDKs, open source), and dramatically lower cost.',
      },
      {
        question: 'Can I use AuditKit and Sprinto together?',
        answer:
          'Yes. Many organizations run a full GRC platform like Sprinto for control monitoring and policy management, and use AuditKit for the application-layer audit log that the GRC platform cannot generate. AuditKit\'s audit events flow into Sprinto\'s evidence vault via export or webhook, giving auditors both the platform-level monitoring evidence and the application-level audit trail.',
      },
      {
        question: 'Will an auditor accept AuditKit evidence in place of Sprinto?',
        answer:
          'Yes. AuditKit produces tenant-scoped, time-bounded, cryptographically verifiable evidence exports that auditors specifically appreciate. The hash-chained event log and Merkle proofs are stronger evidence integrity than what most GRC platforms (Sprinto included) provide. The deciding factor for auditors is evidence quality, not vendor brand — AuditKit\'s evidence quality is competitive or superior.',
      },
      {
        question: 'Can I switch from Sprinto to AuditKit?',
        answer:
          'Yes — most often this happens at Sprinto contract renewal. AuditKit can be deployed in parallel during the final 60-90 days of the Sprinto contract, with audit events logged to both during the transition. Once the team is comfortable with AuditKit\'s evidence-export workflow, the team cuts over fully at Sprinto renewal. Self-hosted deployments take roughly 1-2 days; cloud is same-day.',
      },
    ],
  },
  {
    slug: 'secureframe',
    name: 'Secureframe',
    pricing: 'Starting ~$7,000-$15,000/yr (annual contracts, sales-led)',
    category: 'GRC',
    description:
      'Compare AuditKit and Secureframe for SOC 2 compliance. Secureframe is a Drata/Vanta-tier GRC platform with strong auditor relationships; AuditKit is open source with tamper-proof evidence at $99/mo and free self-hosting.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Self-hosted option', auditkit: true, competitor: false },
      { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Multi-language audit log SDKs', auditkit: 'TS, Python, Go, Java', competitor: 'Limited' },
      { feature: 'Policy templates', auditkit: true, competitor: true },
      { feature: 'Evidence vault', auditkit: true, competitor: true },
      { feature: 'Auditor partner network', auditkit: 'Self-serve', competitor: 'Strong' },
      { feature: 'Continuous control monitoring', auditkit: 'Roadmap', competitor: true },
      { feature: 'Vendor risk management', auditkit: 'Basic', competitor: true },
      { feature: 'Auditor portal', auditkit: 'Built-in', competitor: 'Included' },
      { feature: 'Transparent published pricing', auditkit: true, competitor: false },
      { feature: 'Self-serve trial without sales call', auditkit: true, competitor: false },
      { feature: 'Monthly billing (no annual lock-in)', auditkit: true, competitor: false },
      { feature: 'SOC 2 starting price', auditkit: '$99/mo (free self-host)', competitor: '~$7K+/yr' },
      { feature: 'Cryptographic evidence integrity', auditkit: true, competitor: false },
    ],
    strengths: [
      'Strong auditor partner network — auditor introductions are bundled with the platform',
      'Mature continuous control monitoring across cloud, SaaS, and code repos',
      'Polished vendor risk management workflows',
      'Multi-framework support (SOC 2, ISO 27001, HIPAA, PCI, GDPR) in one platform',
      'Established trust center for sharing compliance posture with prospects',
    ],
    weaknesses: [
      'Annual contracts starting around $7,000-$15,000/year, no monthly billing',
      'Sales-led purchase requires demo before access to pricing',
      'No self-hosting option for organizations with data residency requirements',
      'No cryptographic evidence integrity (hash chains or Merkle proofs)',
      'Closed source — no ability to inspect or extend the audit logging implementation',
      'Audit log functionality is GRC-style (platform-collected) rather than application-instrumented',
      'Pricing scales aggressively for multi-framework or multi-entity organizations',
    ],
    auditkitAdvantages: [
      {
        title: '85-99% lower entry cost',
        description:
          'AuditKit cloud starts at $99/mo ($1,188/yr) vs Secureframe\'s ~$7,000-$15,000/yr typical entry. Self-hosted is free under AGPLv3. For startups whose primary SOC 2 need is the audit log + evidence portion of the platform, AuditKit delivers that core value at 1-15% of Secureframe\'s cost.',
      },
      {
        title: 'Cryptographic evidence integrity Secureframe cannot match',
        description:
          'AuditKit hash-chains every audit event so any tampering shows up as a broken chain — and exports Merkle proofs that an auditor can independently verify. Secureframe stores evidence in a database with database-level access controls; it has no cryptographic integrity verification. The integrity story matters more every audit cycle as auditors raise the bar.',
      },
      {
        title: 'Open source under AGPLv3',
        description:
          'Self-host on your own infrastructure for $0 in licensing. Inspect the codebase, audit the hash-chain implementation, extend the SDK for custom needs. Secureframe is a closed-source SaaS — you trust the vendor on evidence integrity claims, with no way to verify them independently.',
      },
      {
        title: 'Self-serve onboarding (no demo required)',
        description:
          'Sign up, drop in the SDK, start logging audit events the same day. Secureframe requires a sales call and a multi-week onboarding process before the platform is fully configured for your environment.',
      },
      {
        title: 'Application-level audit log instrumentation',
        description:
          'AuditKit instruments inside your application via SDK — every business event (user invited, role changed, data accessed, billing modified) gets a structured audit event with cryptographic chain integrity. Secureframe\'s audit log is platform-collected — it pulls infrastructure events from cloud and SaaS connectors but cannot capture application-internal business events. SOC 2 auditors care about both layers; Secureframe covers one, AuditKit covers the other (and the two are complementary).',
      },
      {
        title: 'Monthly billing with no lock-in',
        description:
          'AuditKit is month-to-month. Cancel anytime, change tiers anytime, no annual commitment. Secureframe is annual contracts only.',
      },
    ],
    faqs: [
      {
        question: 'Is AuditKit a Secureframe alternative?',
        answer:
          'Partial. Secureframe is a full GRC platform with auditor partnerships, vendor risk, continuous control monitoring, and multi-framework support; AuditKit covers the audit log + evidence portal slice with cryptographic integrity Secureframe does not have. For startups whose primary SOC 2 need is "tamper-proof audit logs and auditor-friendly evidence," AuditKit replaces ~80% of Secureframe\'s value for that slice at 1-15% of the cost. For organizations needing auditor partnerships or full GRC platform breadth, the two products are complementary rather than competitive.',
      },
      {
        question: 'How does AuditKit compare to Secureframe on price?',
        answer:
          'AuditKit cloud starts at $99/month ($1,188/year) with monthly billing. Self-hosted is free under AGPLv3. Secureframe typically starts around $7,000-$15,000/year on annual contracts. For most early-stage SaaS startups, this is a 6-15x cost reduction for the audit log and evidence-collection use case.',
      },
      {
        question: 'What does Secureframe have that AuditKit does not?',
        answer:
          'Secureframe has stronger auditor partner relationships (auditor intros bundled with the platform), continuous control monitoring across cloud and SaaS via mature integrations, vendor risk workflows, and multi-framework breadth (SOC 2, ISO 27001, HIPAA, PCI, GDPR) in one platform. AuditKit\'s focus is the audit log + evidence slice with cryptographic integrity, multi-language SDKs, and open source — narrower scope but deeper capability in that scope.',
      },
      {
        question: 'Can I use AuditKit and Secureframe together?',
        answer:
          'Yes — and many organizations do. The two products operate at different layers: Secureframe at the GRC platform layer (control monitoring, policy management, vendor risk), AuditKit at the application audit log layer (in-app event instrumentation with cryptographic integrity). AuditKit\'s evidence exports flow into Secureframe\'s evidence vault, giving auditors a unified view across both layers.',
      },
      {
        question: 'Will an auditor accept AuditKit evidence?',
        answer:
          'Yes. AuditKit produces tenant-scoped, time-bounded, cryptographically verifiable evidence exports. The hash-chained event log and Merkle proofs are stronger evidence integrity than what most GRC platforms provide. Auditors increasingly value the cryptographic integrity story, particularly for high-stakes audits.',
      },
      {
        question: 'Can I switch from Secureframe to AuditKit?',
        answer:
          'For the audit log and evidence-collection slice, yes. The transition usually happens at Secureframe contract renewal, with AuditKit deployed in parallel during the final 60-90 days. Self-hosted deployments take 1-2 days; cloud is same-day. For organizations using Secureframe\'s broader GRC platform features (control monitoring, vendor risk), the right move is often to keep Secureframe and add AuditKit specifically for the application-layer audit log — the two complement rather than compete.',
      },
    ],
  },
  {
    slug: 'thoropass',
    name: 'Thoropass',
    pricing: 'Starting ~$8,000-$20,000/yr (annual contracts, includes auditor)',
    category: 'GRC',
    description:
      'Compare AuditKit and Thoropass for SOC 2 compliance. Thoropass bundles compliance software with auditor services in one contract; AuditKit is open source with tamper-proof evidence at $99/mo and a free self-hosted option.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Self-hosted option', auditkit: true, competitor: false },
      { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Multi-language audit log SDKs', auditkit: 'TS, Python, Go, Java', competitor: 'Limited' },
      { feature: 'Bundled audit services (CPA firm)', auditkit: false, competitor: true },
      { feature: 'Policy templates', auditkit: true, competitor: true },
      { feature: 'Evidence vault', auditkit: true, competitor: true },
      { feature: 'Continuous control monitoring', auditkit: 'Roadmap', competitor: true },
      { feature: 'Auditor portal', auditkit: 'Built-in', competitor: 'Bundled with audit' },
      { feature: 'Multi-framework (SOC 2, ISO, HIPAA)', auditkit: 'SOC 2 first', competitor: true },
      { feature: 'Transparent published pricing', auditkit: true, competitor: false },
      { feature: 'Self-serve trial without sales call', auditkit: true, competitor: false },
      { feature: 'Monthly billing (no annual lock-in)', auditkit: true, competitor: false },
      { feature: 'SOC 2 starting price', auditkit: '$99/mo (free self-host)', competitor: '~$8K+/yr (incl. audit)' },
      { feature: 'Cryptographic evidence integrity', auditkit: true, competitor: false },
      { feature: 'Independent CPA selection', auditkit: 'Bring your own', competitor: 'Tied to platform' },
    ],
    strengths: [
      'Bundles compliance software with audit services from a single provider — one contract, one bill',
      'Continuous control monitoring across cloud and SaaS via mature integrations',
      'Multi-framework support (SOC 2, ISO 27001, HIPAA, GDPR) in one platform',
      'Full-service onboarding with dedicated customer success',
      'Established auditor relationships shorten time-to-audit-report',
    ],
    weaknesses: [
      'Annual contracts starting around $8,000-$20,000/year — pricing gates early-stage startups',
      'CPA firm tied to the platform — limits flexibility to use a preferred or specialty auditor',
      'Sales-led purchase requires demo and scoping calls before pricing or product access',
      'No self-hosting option for organizations with data residency or sovereignty requirements',
      'No cryptographic evidence integrity (hash chains or Merkle proofs)',
      'Closed source — no ability to inspect or extend the audit logging implementation',
      'Audit log functionality is collected through cloud connectors rather than instrumented in-application',
    ],
    auditkitAdvantages: [
      {
        title: '85-99% lower entry cost (and bring-your-own auditor flexibility)',
        description:
          'AuditKit cloud starts at $99/mo ($1,188/yr) vs Thoropass\'s ~$8,000-$20,000/yr typical entry — and Thoropass\'s pricing includes an auditor bundle that may or may not be the right CPA firm for your business. AuditKit lets you choose any AICPA-licensed auditor independently. Self-hosted is free under AGPLv3.',
      },
      {
        title: 'Cryptographic evidence integrity Thoropass cannot match',
        description:
          'AuditKit hash-chains every audit event so any tampering shows up as a broken chain — and exports Merkle proofs that an auditor can independently verify. Thoropass stores evidence in a database with database-level access controls; it has no cryptographic integrity verification.',
      },
      {
        title: 'Open source under AGPLv3',
        description:
          'Self-host on your own infrastructure for $0 in licensing. Inspect the codebase, audit the hash-chain implementation, extend the SDK for custom needs. Thoropass is a closed-source SaaS bundled with a CPA firm — you trust the vendor on evidence integrity claims, with no way to verify them independently.',
      },
      {
        title: 'Self-serve onboarding (no demo required)',
        description:
          'Sign up, drop in the SDK, start logging audit events the same day. Thoropass requires a sales call, scoping conversation, and contract signature before product access. For startups with a SOC 2 deadline measured in weeks, the difference between same-day setup and 4-6 week onboarding is substantial.',
      },
      {
        title: 'Auditor independence',
        description:
          'AuditKit produces clean, tenant-scoped, cryptographically verifiable evidence exports that any AICPA-licensed CPA firm can use. You pick your auditor based on industry expertise, geography, price, and reputation — not on which platform they\'re tied to. Thoropass\'s bundled-auditor model is convenient for some, restrictive for others.',
      },
      {
        title: 'Application-level audit log instrumentation',
        description:
          'AuditKit instruments inside your application via SDK — every business event (user invited, role changed, data accessed, billing modified) gets a structured audit event with cryptographic chain integrity. Thoropass\'s audit log is platform-collected from cloud and SaaS connectors, which captures infrastructure events but cannot capture application-internal business events. SOC 2 auditors want both layers.',
      },
    ],
    faqs: [
      {
        question: 'Is AuditKit a Thoropass alternative?',
        answer:
          'For the audit log + evidence portion, yes. Thoropass is a bundled compliance platform plus audit services in one contract — strong if you want one-vendor convenience and don\'t care which specific CPA firm performs the audit. AuditKit is the audit log + evidence layer specifically, with cryptographic integrity Thoropass does not have, plus the freedom to use any auditor independently. For startups whose primary need is "tamper-proof audit logs and clean evidence exports," AuditKit replaces ~80% of Thoropass\'s software value at a fraction of the cost — and you keep auditor flexibility.',
      },
      {
        question: 'How does AuditKit compare to Thoropass on price?',
        answer:
          'AuditKit cloud starts at $99/month ($1,188/year) with monthly billing. Self-hosted is free under AGPLv3. Thoropass typically starts around $8,000-$20,000/year on annual contracts that bundle the audit fee. Comparing apples to apples: AuditKit + a regional AICPA CPA firm for the audit ($7K-$15K) usually totals less than Thoropass\'s bundled price, with the same SOC 2 report at the end and the freedom to choose your auditor.',
      },
      {
        question: 'What does Thoropass have that AuditKit does not?',
        answer:
          'Thoropass\'s biggest differentiator is the bundled audit services — one contract covers compliance software AND the audit. That\'s convenient for startups that don\'t want to source an auditor separately. Thoropass also has continuous control monitoring across cloud and SaaS via mature connectors, and supports multiple compliance frameworks (SOC 2, ISO 27001, HIPAA, GDPR) on a single platform. AuditKit\'s focus is the audit log + evidence slice — narrower scope, deeper capability in that slice, and you bring your own auditor.',
      },
      {
        question: 'Why might I prefer to bring my own auditor instead of using Thoropass\'s bundled CPA?',
        answer:
          'Three common reasons. First, industry expertise — a CPA firm that specializes in your vertical (fintech, healthtech, etc.) often produces a more useful audit. Second, price — regional AICPA-licensed firms often charge significantly less than the platform-bundled audit fee. Third, continuity — once you have a relationship with an auditor, you typically want to keep them across multiple audit cycles for context efficiency. AuditKit\'s evidence exports work with any AICPA firm.',
      },
      {
        question: 'Can I use AuditKit and Thoropass together?',
        answer:
          'Yes — and this is a sensible pattern. Run Thoropass for the broad GRC platform (control monitoring, policy management, vendor risk, multi-framework support) and add AuditKit for the application-layer audit log with cryptographic integrity. AuditKit\'s evidence exports flow into Thoropass\'s evidence vault. Auditors get a unified view across both layers. The cost of AuditKit ($99-$999/mo) is rounding error against Thoropass\'s annual bundle.',
      },
      {
        question: 'Will an auditor accept AuditKit evidence?',
        answer:
          'Yes. AuditKit produces tenant-scoped, time-bounded, cryptographically verifiable evidence exports. The hash-chained event log and Merkle proofs are stronger evidence integrity than what most GRC platforms (Thoropass included) provide. Any AICPA-licensed CPA firm can perform a SOC 2 audit using AuditKit\'s evidence — auditors care about evidence quality, not vendor brand.',
      },
    ],
  },
  {
    slug: 'aikido',
    name: 'Aikido Security',
    pricing: 'Starting ~$200-$15,000/yr (developer-priced, scales by team size)',
    category: 'GRC',
    description:
      'Compare AuditKit and Aikido for SOC 2 compliance. Aikido is a developer-first security platform (SAST, DAST, container scanning, cloud posture) with bolt-on compliance modules; AuditKit is the application-layer audit log with cryptographic evidence integrity at $99/mo or free self-hosted.',
    features: [
      { feature: 'Open source', auditkit: true, competitor: false },
      { feature: 'Self-hosted option', auditkit: true, competitor: false },
      { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, competitor: false },
      { feature: 'Merkle tree proofs', auditkit: true, competitor: false },
      { feature: 'Multi-language audit log SDKs', auditkit: 'TS, Python, Go, Java', competitor: 'No app-layer SDK' },
      { feature: 'Static code analysis (SAST)', auditkit: false, competitor: true },
      { feature: 'Dynamic application testing (DAST)', auditkit: false, competitor: true },
      { feature: 'Container vulnerability scanning', auditkit: false, competitor: true },
      { feature: 'Cloud posture management (CSPM)', auditkit: false, competitor: true },
      { feature: 'Application audit log', auditkit: 'Built-in', competitor: 'Not core focus' },
      { feature: 'SOC 2 evidence collection', auditkit: 'App-layer events', competitor: 'Infra/code-layer' },
      { feature: 'Auditor portal', auditkit: 'Built-in', competitor: 'Compliance Hub add-on' },
      { feature: 'Transparent published pricing', auditkit: true, competitor: 'Partial (free tier published, enterprise quoted)' },
      { feature: 'Self-serve trial without sales call', auditkit: true, competitor: true },
      { feature: 'Monthly billing', auditkit: true, competitor: 'Available on lower tiers' },
      { feature: 'Cryptographic evidence integrity', auditkit: true, competitor: false },
    ],
    strengths: [
      'Developer-first onboarding — sign up, connect a repo, see vulnerability findings in minutes',
      'Comprehensive infrastructure-layer security: SAST, DAST, container scanning, IaC scanning, CSPM',
      'Strong free tier for open-source projects and small teams',
      'Mature integrations with GitHub, GitLab, Bitbucket, AWS, GCP, Azure',
      'Compliance Hub bundles SOC 2 / ISO 27001 / HIPAA control mappings on top of the security findings',
    ],
    weaknesses: [
      'Application audit log is not a core focus — Aikido captures infrastructure and code events but not in-app business events (user invited, role changed, data exported)',
      'Enterprise pricing is quoted, not published',
      'Compliance Hub is a higher-tier add-on rather than included in base plans',
      'No cryptographic evidence integrity (hash chains or Merkle proofs)',
      'Closed source — no ability to inspect or extend the implementation',
      'Audit log functionality, where present, is Aikido-event-focused rather than tenant-scoped multi-customer SaaS audit logging',
    ],
    auditkitAdvantages: [
      {
        title: 'Different layer of the security stack — complementary, not competitive',
        description:
          'Aikido covers code-layer and infrastructure-layer security (SAST, DAST, container scanning, CSPM). AuditKit covers application-layer audit logging — the events your customers and auditors care about. Most B2B SaaS organizations need both: Aikido (or similar) for SCA/SAST/CSPM, AuditKit for the in-application audit trail your customers can see and your auditor can verify.',
      },
      {
        title: 'Tenant-scoped, customer-visible audit trails',
        description:
          'AuditKit ships an audit log architecture designed for multi-tenant B2B SaaS — every event is tenant-scoped so your enterprise customers can pull their own audit trail. This is the feature that closes enterprise deals. Aikido does not have a customer-facing audit log surface; it is a security-team-facing platform for code and infra events.',
      },
      {
        title: 'Cryptographic evidence integrity',
        description:
          'AuditKit hash-chains every event so any tampering shows up as a broken chain — and exports Merkle proofs that an auditor can independently verify. Aikido stores its findings and audit data in a database with database-level access controls; it has no cryptographic integrity verification.',
      },
      {
        title: 'Open source under AGPLv3',
        description:
          'Self-host the audit log infrastructure on your own deployment for $0 in licensing. Inspect the codebase, audit the hash-chain implementation, extend the SDK for custom needs. Aikido is a closed-source SaaS with self-hosted options only at the highest enterprise tier.',
      },
      {
        title: 'Application-level instrumentation',
        description:
          'AuditKit instruments inside your application via SDK — every business event (user invited, role changed, data accessed, billing modified) gets a structured audit event with cryptographic chain integrity. Aikido captures security events from infrastructure connectors and code analysis, which complements rather than replaces in-app audit logging.',
      },
    ],
    faqs: [
      {
        question: 'Is AuditKit an Aikido alternative?',
        answer:
          'Not really — they cover different layers. Aikido is a developer-first security platform (SAST, DAST, container scanning, cloud posture management). AuditKit is the application-layer audit log with cryptographic evidence integrity. Most B2B SaaS organizations need both: Aikido (or a similar security platform) for code and infrastructure security, AuditKit for the in-application audit trail customers and auditors specifically want. AuditKit is not a replacement for Aikido and vice versa.',
      },
      {
        question: 'How does AuditKit complement Aikido for SOC 2?',
        answer:
          'For SOC 2, auditors look at multiple layers: code security (CC7.1), infrastructure security (CC6.1), and application audit logs (CC7.2, CC7.3). Aikido covers the code and infrastructure layers comprehensively. AuditKit covers the application audit log layer. Running both gives the auditor a full view of evidence across all the relevant Trust Services Criteria, with each layer using the best tool for that scope.',
      },
      {
        question: 'Can AuditKit replace Aikido for any use case?',
        answer:
          'For the application audit log slice, yes. If you only need application-level audit events (who did what to what when, in your SaaS app) and not code or infrastructure security scanning, AuditKit alone is sufficient. If you also need SAST, DAST, container scanning, or cloud posture management, Aikido (or a similar platform) is still required — AuditKit does not cover those layers.',
      },
      {
        question: 'How does pricing compare?',
        answer:
          'They are not directly comparable because they cover different problems. Aikido starts free for open-source projects and small teams, scaling into the thousands of dollars per year for enterprise teams with the full security platform. AuditKit cloud starts at $99/month ($1,188/year) for the application audit log; self-hosted is free. For organizations comparing total compliance-tooling spend, the typical pattern is Aikido (or an equivalent) for security scanning + AuditKit for application audit logs, with the combined cost often less than a single GRC platform like Drata or Vanta.',
      },
      {
        question: 'Should I use AuditKit, Aikido, or both?',
        answer:
          'For most B2B SaaS startups: both. Aikido covers a category (code and infrastructure security) where AuditKit does not compete. AuditKit covers a category (multi-tenant application audit logs with cryptographic integrity) where Aikido does not compete. Running both gives complete SOC 2 evidence coverage at a combined cost typically lower than a single full GRC platform.',
      },
      {
        question: 'Does Aikido provide tenant-scoped customer-facing audit trails?',
        answer:
          'No. Aikido is a security-team-facing platform — its events are scoped to your organization for your security team to consume. AuditKit is purpose-built for multi-tenant B2B SaaS where each customer needs to see their own audit trail in your product. If your enterprise prospects are asking for customer-facing audit visibility, AuditKit is the layer that delivers it.',
      },
    ],
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}

export function getAllCompetitorSlugs(): string[] {
  return competitors.map((c) => c.slug);
}
