import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Check, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AuditKit vs Drata - SOC 2 Compliance Comparison',
  description:
    'Compare AuditKit and Drata for SOC 2 compliance. See pricing, features, and why startups choose AuditKit\'s tamper-proof evidence platform over Drata.',
  alternates: { canonical: 'https://auditkit.dev/compare/drata' },
  openGraph: {
    title: 'AuditKit vs Drata - SOC 2 Compliance Comparison',
    description:
      'Compare AuditKit and Drata for SOC 2 compliance. See pricing, features, and why startups choose AuditKit\'s tamper-proof evidence platform over Drata.',
    url: 'https://auditkit.dev/compare/drata',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuditKit vs Drata - SOC 2 Compliance Comparison',
    description:
      'Compare AuditKit and Drata for SOC 2 compliance. See pricing, features, and why startups choose AuditKit\'s tamper-proof evidence platform over Drata.',
  },
};

const comparison = [
  { feature: 'Open source', auditkit: true, drata: false },
  { feature: 'Tamper-proof evidence (hash chain)', auditkit: true, drata: false },
  { feature: 'Merkle tree proofs', auditkit: true, drata: false },
  { feature: 'Policy templates', auditkit: true, drata: true },
  { feature: 'Evidence vault', auditkit: true, drata: true },
  { feature: 'Access reviews', auditkit: 'Included', drata: true },
  { feature: 'Risk register', auditkit: 'Built-in', drata: true },
  { feature: 'Control catalog', auditkit: true, drata: true },
  { feature: 'Vendor management', auditkit: true, drata: true },
  { feature: 'Trust center', auditkit: 'Coming soon', drata: 'Via SafeBase' },
  { feature: 'Continuous monitoring', auditkit: true, drata: true },
  { feature: 'Transparent pricing', auditkit: true, drata: false },
  { feature: 'Monthly billing (no lock-in)', auditkit: true, drata: false },
  { feature: 'SOC 2 starting price', auditkit: '$99/mo', drata: '$7K+/yr' },
  { feature: 'Renewal price increases', auditkit: 'Published, transparent pricing', drata: 'Common' },
];

export default function CompareDrataPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">Drata</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Both AuditKit and Drata help companies achieve SOC 2 compliance.
          Drata has reported ~$100M ARR, thousands of customers, and recently acquired SafeBase for $250M
          to add trust center capabilities. AuditKit is a developer-first platform with
          tamper-proof evidence, transparent pricing, and no lock-in contracts. Here is how
          they compare feature by feature.
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
                <th className="text-center p-5 font-medium text-muted-foreground">Drata</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.drata].map((val, j) => (
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
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Why teams switch from Drata to AuditKit</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Renewal price jumps',
              description:
                'Drata is known for aggressive renewal pricing. Teams that signed at a startup discount often see significant price increases when the initial term expires. AuditKit has transparent, public pricing that does not change at renewal.',
            },
            {
              title: 'No cryptographic evidence integrity',
              description:
                'Drata collects and stores evidence, but it does not cryptographically prove that evidence has not been tampered with. AuditKit uses hash chains and Merkle tree proofs so auditors can independently verify evidence integrity.',
            },
            {
              title: 'Multi-year lock-in',
              description:
                'Drata typically requires annual or multi-year contracts. AuditKit offers month-to-month billing so you can cancel anytime without penalty.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Drata does better */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">What Drata does better</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Mature platform with broad coverage',
              description:
                'Drata has been in market since 2020, has thousands of customers, and supports 16+ compliance frameworks including SOC 2, ISO 27001, HIPAA, PCI DSS, and GDPR. Their platform is battle-tested at scale.',
            },
            {
              title: 'Trust center via SafeBase',
              description:
                'Drata acquired SafeBase for $250M, giving them a best-in-class trust center for sharing compliance posture with prospects and customers. AuditKit\'s trust center is coming soon.',
            },
            {
              title: 'Extensive integrations',
              description:
                'Drata offers 100+ integrations with cloud providers, identity providers, HR systems, and developer tools. AuditKit\'s integration library is growing but smaller today.',
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
                'AuditKit uses hash chains and Merkle tree proofs to cryptographically guarantee that evidence cannot be altered after collection. This is a fundamental architectural difference, not a feature toggle.',
            },
            {
              title: 'Transparent, predictable pricing',
              description:
                'AuditKit starts at $99/mo with public pricing on the website. No sales calls, no surprise renewal increases. What you see is what you pay.',
            },
            {
              title: 'Open source',
              description:
                'AuditKit is fully open source. You can audit the code, contribute improvements, and self-host if needed. Drata is entirely proprietary.',
            },
            {
              title: 'No contracts',
              description:
                'AuditKit offers monthly billing with no minimum commitment. Cancel anytime. Drata requires annual or multi-year agreements.',
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
          <Link href="/blog/soc-2-evidence-collection-guide" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Evidence Collection Guide</h3>
            <p className="text-sm text-muted-foreground">A practical guide to collecting and organizing evidence for your SOC 2 audit.</p>
          </Link>
          <Link href="/compare/vanta" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">AuditKit vs Vanta</h3>
            <p className="text-sm text-muted-foreground">Compare AuditKit and Vanta on pricing, integrations, and tamper-proof evidence.</p>
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
