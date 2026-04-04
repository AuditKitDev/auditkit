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
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}

export function getAllCompetitorSlugs(): string[] {
  return competitors.map((c) => c.slug);
}
