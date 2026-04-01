import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Check, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AuditKit vs Vanta - SOC 2 Compliance Comparison',
  description:
    'Compare AuditKit and Vanta for SOC 2. Tamper-proof evidence, transparent pricing from $99/mo, no lock-in contracts. Full feature comparison.',
  alternates: { canonical: 'https://auditkit.dev/compare/vanta' },
  openGraph: {
    title: 'AuditKit vs Vanta - SOC 2 Compliance Comparison',
    description:
      'Compare AuditKit and Vanta for SOC 2. Tamper-proof evidence, transparent pricing from $99/mo, no lock-in contracts. Full feature comparison.',
    url: 'https://auditkit.dev/compare/vanta',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuditKit vs Vanta - SOC 2 Compliance Comparison',
    description:
      'Compare AuditKit and Vanta for SOC 2. Tamper-proof evidence, transparent pricing from $99/mo, no lock-in contracts. Full feature comparison.',
  },
};

const comparison = [
  { feature: 'Open source', auditkit: true, vanta: false },
  { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, vanta: false },
  { feature: 'Merkle tree proofs', auditkit: true, vanta: false },
  { feature: 'Policy templates', auditkit: true, vanta: true },
  { feature: 'Evidence vault', auditkit: true, vanta: true },
  { feature: 'Access reviews', auditkit: 'Included', vanta: 'Paid add-on' },
  { feature: 'Risk register', auditkit: 'Built-in', vanta: 'Limited' },
  { feature: 'Control catalog', auditkit: true, vanta: true },
  { feature: 'Vendor management', auditkit: true, vanta: true },
  { feature: 'Trust center', auditkit: 'Coming soon', vanta: true },
  { feature: 'Transparent pricing', auditkit: true, vanta: false },
  { feature: 'Monthly billing (no lock-in)', auditkit: true, vanta: false },
  { feature: 'SOC 2 starting price', auditkit: '$99/mo', vanta: '$10K+/yr' },
  { feature: 'Cryptographic evidence integrity', auditkit: true, vanta: false },
];

export default function CompareVantaPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">Vanta</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Both AuditKit and Vanta help companies achieve SOC 2 compliance.
          Vanta is the market leader with 300+ integrations and a large sales team,
          while AuditKit is a developer-first platform with tamper-proof evidence,
          transparent pricing, and no lock-in contracts. Here is how they compare
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
                <th className="text-center p-5 font-medium text-muted-foreground">Vanta</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.vanta].map((val, j) => (
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

      {/* Why teams switch */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Why teams switch from Vanta to AuditKit</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Price shock at renewal',
              description:
                'Vanta often requires multi-year commitments starting at $10,000+/yr. Many teams report significant price increases at renewal. AuditKit starts at $99/mo with monthly billing and no lock-in.',
            },
            {
              title: 'Lock-in by design',
              description:
                'Vanta\'s multi-year contracts and proprietary platform make it difficult to leave. AuditKit is open source with month-to-month billing, so you stay because it works, not because you are locked in.',
            },
            {
              title: 'Shallow risk management',
              description:
                'Vanta\'s risk management features have historically received mixed reviews from users. AuditKit includes a full-featured risk register built in at every tier.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Vanta does better */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">What Vanta does better</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'More integrations (300+)',
              description:
                'Vanta has 300+ pre-built integrations with cloud providers, SaaS tools, and HR systems. AuditKit\'s integration library is growing but smaller today.',
            },
            {
              title: 'Brand recognition',
              description:
                'Vanta is the most recognized name in compliance automation. If your auditor or board already knows Vanta, that can simplify conversations.',
            },
            {
              title: 'Trust center',
              description:
                'Vanta offers a public-facing trust center where you can share your compliance posture with prospects. AuditKit\'s trust center is coming soon.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What AuditKit does better */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">What AuditKit does better</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Tamper-proof evidence',
              description:
                'AuditKit uses hash chains and Merkle tree proofs to cryptographically guarantee that evidence cannot be altered after collection. Vanta stores evidence but does not provide cryptographic integrity verification.',
            },
            {
              title: 'Transparent, affordable pricing',
              description:
                'AuditKit starts at $99/mo with public pricing. No sales calls, no multi-year commitments, no surprise renewals. Vanta requires a sales conversation and often involves multi-year commitments at $10K+/yr.',
            },
            {
              title: 'No lock-in',
              description:
                'AuditKit is open source and offers monthly billing. You can export your data, self-host, or cancel anytime. Vanta\'s proprietary platform and long-term contracts make switching costly.',
            },
            {
              title: 'Developer-first experience',
              description:
                'AuditKit is built by engineers for engineers. Clean APIs, SDKs, and a codebase you can inspect. No black-box compliance theater.',
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
          <Link href="/blog/audit-logs-soc-2-b2b-saas" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Why Your B2B SaaS Needs Audit Logs Before SOC 2</h3>
            <p className="text-sm text-muted-foreground">Audit logs are a core SOC 2 requirement. Learn why building them early saves months of compliance work.</p>
          </Link>
          <Link href="/compare/drata" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">AuditKit vs Drata</h3>
            <p className="text-sm text-muted-foreground">See how AuditKit compares to Drata on pricing, evidence integrity, and contract flexibility.</p>
          </Link>
          <Link href="/blog/soc-2-evidence-collection-guide" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Evidence Collection Guide</h3>
            <p className="text-sm text-muted-foreground">A practical guide to collecting and organizing evidence for your SOC 2 audit.</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-28">
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Get SOC 2 ready with tamper-proof evidence from $99/mo. No sales call required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition btn-shimmer font-medium inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="text-sm border border-border px-6 py-3 rounded-lg hover:bg-secondary/50 transition font-medium"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
