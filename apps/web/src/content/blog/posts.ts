export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  publishedAt: string;
  tags: string[];
  readTime: string;
  seoTitle: string;
  seoDescription: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'audit-logs-soc-2-b2b-saas',
    title: 'Why Your B2B SaaS Needs Audit Logs Before SOC 2',
    description:
      'Audit logs are a core SOC 2 requirement. Learn why building them early saves months of compliance work and builds enterprise trust.',
    seoTitle: 'Audit Logs & SOC 2: Why Your B2B SaaS Needs Them Now | AuditKit',
    seoDescription:
      'Discover why audit logs are essential for SOC 2 compliance in B2B SaaS. Learn best practices for implementing tamper-evident audit trails before your SOC 2 audit.',
    author: 'AuditKit Team',
    publishedAt: '2026-02-20',
    tags: ['SOC 2', 'Compliance', 'B2B SaaS'],
    readTime: '5 min read',
    content: `
      <h2>What Are Audit Logs and Why Do They Matter for SOC 2?</h2>
      <p>
        Audit logs are chronological records of every significant action taken within your application.
        They capture who did what, when, and to which resource. For B2B SaaS companies pursuing SOC 2
        Type II certification, audit logs are not optional — they are a foundational requirement under
        the Common Criteria (CC) controls, specifically CC6.1, CC7.2, and CC7.3.
      </p>
      <p>
        SOC 2 auditors look for evidence that your system can detect unauthorized access, track
        changes to sensitive data, and provide a reliable chain of events during incident
        investigations. Without robust audit logging, you will fail these controls outright.
      </p>

      <h2>Why Should You Build Audit Logs Before Starting SOC 2?</h2>
      <p>
        Most teams treat audit logging as a last-minute checkbox during SOC 2 preparation. This is a
        costly mistake. SOC 2 Type II requires evidence collected over a review period — typically
        three to twelve months. If your audit logs have only been running for two weeks when the
        auditor arrives, you lack the historical evidence needed to pass.
      </p>
      <p>
        Starting early gives you three advantages. First, you accumulate months of log data that
        demonstrates consistent monitoring. Second, you discover gaps in your logging coverage while
        there is still time to fix them. Third, your engineering team can iterate on the log schema
        without the pressure of an active audit window.
      </p>

      <h2>What Specific SOC 2 Controls Require Audit Logs?</h2>
      <p>
        The Trust Services Criteria map directly to audit log capabilities. <strong>CC6.1</strong>
        requires logical access controls with monitoring — you need logs showing who accessed what.
        <strong>CC7.2</strong> mandates that you monitor system components for anomalies, which
        requires a searchable event stream. <strong>CC7.3</strong> requires that you evaluate detected
        events and respond appropriately, meaning your logs must support filtering, alerting, and
        investigation workflows.
      </p>
      <p>
        Beyond the Common Criteria, the Availability and Confidentiality supplemental criteria also
        lean heavily on audit trails. If a customer asks for evidence of who accessed their data, your
        audit logs are the answer.
      </p>

      <h2>How Does AuditKit Accelerate SOC 2 Readiness?</h2>
      <p>
        AuditKit provides a drop-in SDK that captures structured audit events with SHA-256 hash
        chaining. Each event is cryptographically linked to the previous one, creating a tamper-evident
        chain that auditors trust. Events are tenant-scoped, so enterprise customers can view their
        own audit trail — a feature that SOC 2 auditors specifically look for.
      </p>
      <p>
        With AuditKit, you ship audit logging in minutes, not weeks. The SDK handles event capture,
        immutability, search, and compliance exports. You focus on building your product while your
        audit trail builds itself. By the time your SOC 2 observation window opens, you already have
        months of clean, verifiable log data ready for review.
      </p>

      <h2>Key Takeaways</h2>
      <ul>
        <li>Audit logs are mandatory for SOC 2 — not a nice-to-have.</li>
        <li>Start logging early to accumulate the historical evidence auditors require.</li>
        <li>Focus on CC6.1, CC7.2, and CC7.3 as your audit log baseline.</li>
        <li>Use tamper-evident logging (hash chaining) to demonstrate integrity.</li>
        <li>Tenant-scoped logs serve both compliance and customer trust.</li>
      </ul>
    `,
  },
  {
    slug: 'hash-chaining-tamper-proof-audit-logs',
    title: 'Hash Chaining Explained: How AuditKit Creates Tamper-Proof Logs',
    description:
      'Learn how SHA-256 hash chaining makes audit logs tamper-proof. A technical deep dive into cryptographic integrity for audit trails.',
    seoTitle: 'Hash Chaining for Tamper-Proof Audit Logs Explained | AuditKit',
    seoDescription:
      'Learn how SHA-256 hash chaining creates tamper-proof audit logs. Understand the cryptographic technique behind AuditKit\'s immutable audit trail.',
    author: 'AuditKit Team',
    publishedAt: '2026-03-01',
    tags: ['Security', 'Cryptography', 'Technical'],
    readTime: '6 min read',
    content: `
      <h2>What Is Hash Chaining?</h2>
      <p>
        Hash chaining is a cryptographic technique where each new record includes a hash of the
        previous record. This creates a sequential chain — if any record in the middle is altered,
        every subsequent hash breaks, making tampering immediately detectable. It is the same
        foundational concept behind blockchain technology, applied specifically to audit log integrity.
      </p>
      <p>
        In the context of audit logging, hash chaining answers a critical question: can anyone —
        including a database administrator or insider threat — silently modify or delete log entries
        after the fact? With hash chaining, the answer is no.
      </p>

      <h2>How Does SHA-256 Hash Chaining Work in Practice?</h2>
      <p>
        When AuditKit records an audit event, it follows a deterministic process. First, the event
        payload is serialized into a canonical format — the actor, action, target, timestamp, and
        metadata are combined into a consistent string. Next, the SHA-256 hash of the previous event
        in the chain is prepended. Finally, the entire combined payload is hashed using SHA-256 to
        produce the current event's hash.
      </p>
      <p>
        The result looks like this: <code>hash(n) = SHA-256(hash(n-1) + serialize(event(n)))</code>.
        Each event's hash depends on every event that came before it. Changing event number 50 in a
        chain of 10,000 would invalidate the hashes of events 51 through 10,000 — a discrepancy that
        any verification process catches instantly.
      </p>

      <h2>Why Not Just Use Database Permissions to Prevent Tampering?</h2>
      <p>
        Database-level access controls are necessary but insufficient. They protect against
        unauthorized external access, but they do not protect against privileged insiders — DBAs,
        DevOps engineers, or compromised service accounts with direct database access. SOC 2 auditors
        understand this distinction and specifically look for immutability guarantees that go beyond
        access control.
      </p>
      <p>
        Hash chaining provides a mathematical guarantee. Even if someone with full database access
        modifies a record, the chain breaks. AuditKit runs periodic integrity verification that walks
        the chain and alerts you immediately if any inconsistency is detected.
      </p>

      <h2>How Does AuditKit Implement Hash Chaining?</h2>
      <p>
        AuditKit's implementation is designed for both security and performance. Events are hashed
        within the same database transaction that writes them, ensuring no gap between write and hash.
        The chain is scoped per tenant, so each customer's audit trail forms its own independent
        chain. This means verification is fast — you validate one tenant's chain without scanning
        every event in the system.
      </p>
      <p>
        For organizations that need even stronger guarantees, AuditKit's Business and Enterprise tiers
        support Merkle tree proofs. These allow you to generate a cryptographic proof for any
        individual event that can be independently verified without access to the entire chain —
        useful for legal proceedings and regulatory submissions.
      </p>

      <h2>Can Tamper-Proof Logs Be Verified Independently?</h2>
      <p>
        Yes. Because the hash chain is deterministic, any party with access to the raw events can
        recompute the chain and verify that every hash is correct. AuditKit provides a verification
        endpoint and a CLI tool that walks the chain and reports any integrity violations. Enterprise
        customers can also export their chain data and verify it using their own tooling — no vendor
        lock-in on trust.
      </p>

      <h2>Key Takeaways</h2>
      <ul>
        <li>Hash chaining links each audit event to the previous one using SHA-256.</li>
        <li>Modifying any event breaks every subsequent hash in the chain.</li>
        <li>Database permissions alone do not guarantee log immutability.</li>
        <li>Tenant-scoped chains enable fast, isolated verification.</li>
        <li>Independent verification is possible without vendor dependency.</li>
      </ul>
    `,
  },
  {
    slug: 'audit-logging-best-practices-multi-tenant-saas',
    title: 'Audit Logging Best Practices for Multi-Tenant SaaS',
    description:
      'A practical guide to designing audit logs for multi-tenant SaaS applications. Covers schema design, tenant isolation, retention, and compliance.',
    seoTitle: 'Audit Logging Best Practices for Multi-Tenant SaaS | AuditKit',
    seoDescription:
      'Learn audit logging best practices for multi-tenant SaaS. Covers event schema design, tenant isolation, retention policies, and compliance-ready exports.',
    author: 'AuditKit Team',
    publishedAt: '2026-03-06',
    tags: ['Best Practices', 'Multi-Tenant', 'Architecture'],
    readTime: '7 min read',
    content: `
      <h2>What Makes Audit Logging Different in Multi-Tenant SaaS?</h2>
      <p>
        Multi-tenant SaaS applications serve multiple customers from a shared infrastructure. This
        creates a unique challenge for audit logging: every customer expects to see their own activity
        — and only their own activity. A single leaked log entry from another tenant is a security
        incident. Audit logging in multi-tenant systems must enforce strict data isolation at every
        layer, from write to read to export.
      </p>
      <p>
        Beyond isolation, multi-tenant audit logs must handle varying compliance requirements. One
        customer may need 90-day retention while another requires seven years. One may need SIEM
        integration while another just needs CSV exports. Your audit logging architecture must be
        flexible enough to accommodate these differences without per-tenant custom code.
      </p>

      <h2>How Should You Design Your Audit Event Schema?</h2>
      <p>
        A well-designed audit event schema captures the full context of an action in a structured,
        queryable format. At minimum, every event should include: <strong>actor</strong> (who
        performed the action), <strong>action</strong> (what they did), <strong>target</strong> (what
        was affected), <strong>timestamp</strong> (when it happened), and <strong>tenantId</strong>
        (which customer context). Additional useful fields include source IP, user agent, request ID
        for tracing, and a metadata object for action-specific details.
      </p>
      <p>
        Use a consistent naming convention for actions. A pattern like
        <code>resource.verb</code> — for example, <code>document.created</code>,
        <code>user.invited</code>, <code>permission.updated</code> — makes logs searchable and
        filterable. Avoid free-text action descriptions; they become impossible to query at scale.
      </p>

      <h2>How Do You Enforce Tenant Isolation in Audit Logs?</h2>
      <p>
        Tenant isolation should be enforced at the database level, not just the application level.
        Use row-level security (RLS) policies tied to the tenant ID so that even a bug in your
        application code cannot leak data across tenants. Every query should include a tenant filter,
        and your API layer should derive the tenant context from the authenticated session — never
        from user-supplied input.
      </p>
      <p>
        AuditKit enforces tenant scoping at the SDK level. When you initialize the SDK with a tenant
        context, all events are automatically tagged and all queries are automatically filtered. The
        embeddable audit log viewer that you expose to your customers is pre-filtered to their
        tenant — they physically cannot access another tenant's events.
      </p>

      <h2>What Retention Policies Should You Implement?</h2>
      <p>
        Retention requirements vary by regulation and customer contract. GDPR may require you to
        delete user data upon request, but SOC 2 requires you to retain audit evidence. The solution
        is to separate personally identifiable information (PII) from the audit event itself. Store
        actor references (user IDs) rather than names and emails. When a user is deleted, the audit
        events remain intact with anonymized references.
      </p>
      <p>
        Implement tiered retention: hot storage (searchable, recent events) and cold storage
        (archived, older events). AuditKit supports configurable retention per tier, with automatic
        archival to cost-effective storage. Enterprise plans support retention up to seven years for
        industries like healthcare and finance that have extended regulatory requirements.
      </p>

      <h2>How Do You Make Audit Logs Compliance-Ready?</h2>
      <p>
        Compliance-ready audit logs must be exportable in standard formats. SOC 2 auditors typically
        want CSV or PDF evidence packages. Security teams want SIEM integration via syslog or webhook
        streaming. Enterprise customers may need events in industry-standard formats like OCSF (Open
        Cybersecurity Schema Framework) or CEF (Common Event Format).
      </p>
      <p>
        Build export capabilities from day one. AuditKit provides CSV, JSON, and PDF exports out of
        the box, with SIEM streaming to Splunk, Datadog, and S3 on Business plans. The compliance
        evidence package feature generates auditor-ready reports that include event summaries,
        integrity verification results, and chain-of-custody documentation.
      </p>

      <h2>Key Takeaways</h2>
      <ul>
        <li>Enforce tenant isolation at the database level with row-level security.</li>
        <li>Use structured, consistent action naming like <code>resource.verb</code>.</li>
        <li>Separate PII from audit events to handle GDPR and retention conflicts.</li>
        <li>Implement tiered retention with hot and cold storage.</li>
        <li>Build compliance exports (CSV, SIEM, OCSF) from the start.</li>
      </ul>
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
