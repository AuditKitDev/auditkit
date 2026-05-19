import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Check, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WorkOS Audit Log Alternative 2026: AuditKit Pricing + Feature Comparison',
  description:
    "WorkOS Audit Log alternative head-to-head. AuditKit: open source, hash-chain immutability, $39/mo (vs WorkOS $99+/mo for 100K events). Self-hostable, Merkle proofs, GraphQL API — every feature WorkOS doesn't ship.",
  alternates: { canonical: 'https://auditkit.dev/compare/workos' },
  openGraph: {
    title: 'WorkOS Audit Log Alternative 2026: AuditKit Pricing + Feature Comparison',
    description:
      "WorkOS Audit Log alternative head-to-head. AuditKit: open source, hash-chain immutability, $39/mo (vs WorkOS $99+/mo for 100K events). Self-hostable, Merkle proofs, GraphQL API — every feature WorkOS doesn't ship.",
    url: 'https://auditkit.dev/compare/workos',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkOS Audit Log Alternative 2026: AuditKit Pricing + Feature Comparison',
    description:
      "WorkOS Audit Log alternative head-to-head. AuditKit: open source, hash-chain immutability, $39/mo (vs WorkOS $99+/mo for 100K events). Self-hostable, Merkle proofs, GraphQL API — every feature WorkOS doesn't ship.",
  },
};

const comparison = [
  { feature: 'Open source', auditkit: true, workos: false },
  { feature: 'Managed cloud', auditkit: true, workos: true },
  { feature: 'Tamper-proof (hash chain)', auditkit: true, workos: false },
  { feature: 'Merkle tree proofs', auditkit: true, workos: false },
  { feature: 'Tenant-scoped access', auditkit: true, workos: true },
  { feature: 'Embeddable viewer', auditkit: true, workos: false },
  { feature: 'SIEM streaming', auditkit: true, workos: true },
  { feature: 'Multi-language SDKs', auditkit: true, workos: true },
  { feature: 'Self-hostable', auditkit: true, workos: false },
  { feature: 'GraphQL API', auditkit: true, workos: false },
  { feature: 'AI anomaly detection', auditkit: true, workos: false },
  { feature: 'Setup time', auditkit: '5 min', workos: '1 day' },
  { feature: 'Price (100K events)', auditkit: '$39/mo', workos: '$99+/mo' },
];

export default function CompareWorkOSPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">WorkOS Audit Log</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Both AuditKit and WorkOS provide audit logging for B2B SaaS applications.
          WorkOS bundles audit logs as part of its broader enterprise-readiness platform,
          while AuditKit is a dedicated audit trail solution that is open source,
          cryptographically immutable, and self-hostable. Here is how they compare
          feature by feature.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Feature comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xl shadow-black/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-5 font-medium text-muted-foreground">Feature</th>
                <th className="text-center p-5 font-bold text-primary">
                  <Logo size="md" />
                </th>
                <th className="text-center p-5 font-medium text-muted-foreground">WorkOS</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.workos].map((val, j) => (
                    <td key={j} className="text-center p-5">
                      {val === true ? (
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${j === 0 ? 'bg-success/20' : 'bg-muted'}`}>
                          <Check className={`h-3.5 w-3.5 ${j === 0 ? 'text-success' : 'text-muted-foreground'}`} />
                        </div>
                      ) : val === false ? (
                        <span className="text-muted-foreground/40">&mdash;</span>
                      ) : (
                        <span className={`text-sm ${j === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                          {String(val)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Why teams choose AuditKit over WorkOS</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Cryptographic immutability',
              description:
                'AuditKit uses hash chains and Merkle tree proofs to guarantee that audit logs cannot be tampered with. WorkOS does not offer cryptographic verification of log integrity.',
            },
            {
              title: 'Open source and self-hostable',
              description:
                'AuditKit is fully open source. You can inspect the code, self-host on your own infrastructure, and avoid vendor lock-in. WorkOS audit logs are proprietary and cloud-only.',
            },
            {
              title: 'Lower cost at scale',
              description:
                'AuditKit starts at $39/mo for 100K events with transparent, usage-based pricing. WorkOS audit log pricing starts at $99+/mo and requires bundling with other WorkOS products.',
            },
            {
              title: 'Built-in embeddable viewer',
              description:
                'AuditKit includes a drop-in log viewer component your customers can use directly in your app. WorkOS does not provide an embeddable audit log UI.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Resources */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related resources</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/soc-2" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Compliance Made Simple</h3>
            <p className="text-sm text-muted-foreground">Collect evidence, organize controls, and deliver tamper-proof audit packages from $99/mo.</p>
          </Link>
          <Link href="/blog/audit-logging-best-practices-multi-tenant-saas" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Audit Logging Best Practices for Multi-Tenant SaaS</h3>
            <p className="text-sm text-muted-foreground">Best practices for implementing audit logs in multi-tenant B2B SaaS applications.</p>
          </Link>
          <Link href="/compare/pangea" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">AuditKit vs Pangea</h3>
            <p className="text-sm text-muted-foreground">Both offer tamper-proof logging, but AuditKit is open source, self-hostable, and more affordable.</p>
          </Link>
          <Link href="/blog/audit-logs-soc-2-b2b-saas" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Why Your B2B SaaS Needs Audit Logs Before SOC 2</h3>
            <p className="text-sm text-muted-foreground">Audit logs are a core SOC 2 requirement. Learn why building them early saves months of compliance work.</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-28">
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Add tamper-proof audit logs to your app in 5 minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/docs"
              className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition btn-shimmer font-medium inline-flex items-center gap-2"
            >
              Read the Docs
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="text-sm border border-border px-6 py-3 rounded-lg hover:bg-secondary/50 transition font-medium"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
