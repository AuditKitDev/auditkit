import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Check, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AuditKit vs Pangea Secure Audit Log - Comparison',
  description:
    'Compare AuditKit and Pangea Secure Audit Log side by side. Both offer tamper-proof logging, but AuditKit is open source, self-hostable, and more affordable.',
};

const comparison = [
  { feature: 'Open source', auditkit: true, pangea: false },
  { feature: 'Managed cloud', auditkit: true, pangea: true },
  { feature: 'Tamper-proof (hash chain)', auditkit: true, pangea: true },
  { feature: 'Merkle tree proofs', auditkit: true, pangea: true },
  { feature: 'Tenant-scoped access', auditkit: true, pangea: true },
  { feature: 'Embeddable viewer', auditkit: true, pangea: true },
  { feature: 'SIEM streaming', auditkit: true, pangea: true },
  { feature: 'Multi-language SDKs', auditkit: true, pangea: true },
  { feature: 'Self-hostable', auditkit: true, pangea: false },
  { feature: 'GraphQL API', auditkit: true, pangea: false },
  { feature: 'AI anomaly detection', auditkit: true, pangea: false },
  { feature: 'Setup time', auditkit: '5 min', pangea: '2 hrs' },
  { feature: 'Price (100K events)', auditkit: '$39/mo', pangea: 'Contact' },
];

export default function ComparePangeaPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">Pangea Secure Audit Log</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          AuditKit and Pangea both provide tamper-proof audit logging with cryptographic
          verification. Pangea is a closed-source, cloud-only security platform, while
          AuditKit is fully open source with the option to self-host or use managed cloud.
          Here is how they stack up across key features.
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
                <th className="text-center p-5 font-medium text-muted-foreground">Pangea</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.pangea].map((val, j) => (
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
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Why teams choose AuditKit over Pangea</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Fully open source',
              description:
                'AuditKit is open source under a permissive license. You can audit the code yourself, contribute improvements, and avoid vendor lock-in. Pangea is a proprietary, closed-source platform.',
            },
            {
              title: 'Self-hosting option',
              description:
                'Need to keep audit data on your own infrastructure for compliance or data residency requirements? AuditKit can be self-hosted. Pangea is cloud-only with no self-hosting option.',
            },
            {
              title: 'Transparent, affordable pricing',
              description:
                'AuditKit offers clear usage-based pricing starting at $39/mo for 100K events. Pangea requires contacting sales for pricing, which typically means higher costs and longer procurement cycles.',
            },
            {
              title: 'Faster setup',
              description:
                'AuditKit can be integrated in about 5 minutes with a simple SDK install and a few lines of code. Pangea typically requires around 2 hours to configure across its broader security platform.',
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
