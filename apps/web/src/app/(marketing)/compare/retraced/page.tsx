import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Check, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AuditKit vs Retraced - Comparison',
  description:
    'Compare AuditKit and Retraced for audit logging. Both are open source, but AuditKit adds managed cloud hosting, cryptographic immutability, SIEM streaming, and multi-language SDKs.',
};

const comparison = [
  { feature: 'Open source', auditkit: true, retraced: true },
  { feature: 'Managed cloud', auditkit: true, retraced: false },
  { feature: 'Tamper-proof (hash chain)', auditkit: true, retraced: false },
  { feature: 'Merkle tree proofs', auditkit: true, retraced: false },
  { feature: 'Tenant-scoped access', auditkit: true, retraced: true },
  { feature: 'Embeddable viewer', auditkit: true, retraced: true },
  { feature: 'SIEM streaming', auditkit: true, retraced: false },
  { feature: 'Multi-language SDKs', auditkit: true, retraced: false },
  { feature: 'Self-hostable', auditkit: true, retraced: true },
  { feature: 'GraphQL API', auditkit: true, retraced: false },
  { feature: 'AI anomaly detection', auditkit: true, retraced: false },
  { feature: 'Setup time', auditkit: '5 min', retraced: '1 week' },
  { feature: 'Price (100K events)', auditkit: '$39/mo', retraced: 'Free' },
];

export default function CompareRetracedPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">Retraced</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          AuditKit and Retraced are both open-source audit logging solutions for SaaS
          applications. Retraced was one of the earlier open-source options but has seen
          limited maintenance. AuditKit builds on the same concept while adding managed
          cloud hosting, cryptographic immutability, SIEM integrations, and a modern
          developer experience.
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
                <th className="text-center p-5 font-medium text-muted-foreground">Retraced</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.retraced].map((val, j) => (
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
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Why teams choose AuditKit over Retraced</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Managed cloud option',
              description:
                'Retraced is self-host only, meaning you handle all the infrastructure, scaling, and uptime yourself. AuditKit offers a managed cloud so you can start logging events immediately without provisioning any servers.',
            },
            {
              title: 'Cryptographic immutability',
              description:
                'AuditKit uses hash chains and Merkle tree proofs to make audit logs verifiably tamper-proof. Retraced stores events in a database without cryptographic integrity guarantees.',
            },
            {
              title: 'Modern SDKs and integrations',
              description:
                'AuditKit provides multi-language SDKs, a GraphQL API, and SIEM streaming out of the box. Retraced has limited SDK support and no built-in SIEM export capabilities.',
            },
            {
              title: 'Active development and support',
              description:
                'AuditKit is actively maintained with regular releases, documentation, and community support. Retraced has seen minimal updates in recent years, leaving teams to maintain their own forks.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
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
