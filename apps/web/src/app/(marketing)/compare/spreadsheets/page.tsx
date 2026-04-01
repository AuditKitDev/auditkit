import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOC 2 Compliance: AuditKit vs Spreadsheets',
  description:
    'Still using Google Sheets for SOC 2? See why teams switch to AuditKit for evidence collection, control tracking, and tamper-proof audit trails. From $99/mo.',
  alternates: { canonical: 'https://auditkit.dev/compare/spreadsheets' },
  openGraph: {
    title: 'SOC 2 Compliance: AuditKit vs Spreadsheets',
    description:
      'Still using Google Sheets for SOC 2? See why teams switch to AuditKit for evidence collection, control tracking, and tamper-proof audit trails. From $99/mo.',
    url: 'https://auditkit.dev/compare/spreadsheets',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOC 2 Compliance: AuditKit vs Spreadsheets',
    description:
      'Still using Google Sheets for SOC 2? See why teams switch to AuditKit for evidence collection, control tracking, and tamper-proof audit trails. From $99/mo.',
  },
};

const comparison = [
  { feature: 'Evidence organization', auditkit: 'Auto-organized by control', spreadsheets: 'Manual folders' },
  { feature: 'Tamper-proof evidence', auditkit: 'Hash-chained', spreadsheets: 'Anyone can edit' },
  { feature: 'Control tracking', auditkit: 'Pre-built catalog', spreadsheets: 'Build your own' },
  { feature: 'Policy management', auditkit: '15+ templates', spreadsheets: 'Google Docs' },
  { feature: 'Access reviews', auditkit: 'Review campaigns', spreadsheets: 'Manual tracking' },
  { feature: 'Auditor delivery', auditkit: 'Export package', spreadsheets: 'Email attachments' },
  { feature: 'Version history', auditkit: 'Immutable audit trail', spreadsheets: 'Google Sheets history' },
  { feature: 'Time to audit-ready', auditkit: 'Weeks, not months', spreadsheets: 'Weeks to months' },
  { feature: 'Cost', auditkit: '$99/mo', spreadsheets: '"Free" (+ 200-500 hrs)' },
];

export default function CompareSpreadsheetsPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">Spreadsheets</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Most companies start their SOC 2 journey with Google Sheets, Notion, or Excel.
          It works at first, but the manual effort compounds fast. Evidence gets lost,
          controls fall out of date, and auditors ask for things you cannot find.
          Here is how a purpose-built compliance platform compares to the spreadsheet approach.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Feature comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xl shadow-black/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-5 font-medium text-muted-foreground">Capability</th>
                <th className="text-center p-5 font-bold text-primary">
                  <Logo size="md" />
                </th>
                <th className="text-center p-5 font-medium text-muted-foreground">Spreadsheets</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.spreadsheets].map((val, j) => (
                    <td key={j} className="text-center p-5">
                      {typeof val === 'string' ? (
                        <span className={`text-sm ${j === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                          {val}
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hidden cost of spreadsheets */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">The hidden cost of spreadsheets</h2>
        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-muted-foreground leading-relaxed mb-6">
            Spreadsheets are free, but your time is not. Companies preparing for SOC 2 with
            spreadsheets typically spend 200-500 hours on manual evidence collection, control
            mapping, policy writing, and auditor coordination. Here is what that actually costs:
          </p>
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Spreadsheet approach</p>
              <p className="text-4xl font-extrabold tracking-tight mb-2">$20,000+</p>
              <p className="text-sm text-muted-foreground">200 hours x $100/hr engineer time</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">AuditKit</p>
              <p className="text-4xl font-extrabold tracking-tight text-primary mb-2">$1,188/yr</p>
              <p className="text-sm text-muted-foreground">$99/mo — dramatically reduce the time spent on evidence collection</p>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            That does not include the cost of failed audits, delayed deals waiting on SOC 2 reports,
            or the ongoing maintenance burden of keeping spreadsheets up to date for continuous compliance.
            Many teams save more in engineer time than they spend on the platform.
          </p>
        </div>
      </section>

      {/* What goes wrong */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">What goes wrong with spreadsheets</h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Evidence gets lost or overwritten',
              description:
                'Screenshots end up in random Google Drive folders. Someone overwrites a row in the tracker. The auditor asks for evidence from Q2 and nobody can find it. With AuditKit, evidence is auto-organized by control and cryptographically sealed.',
            },
            {
              title: 'No proof of integrity',
              description:
                'A spreadsheet can be edited by anyone with access. There is no way to prove to an auditor that evidence was not modified after the fact. AuditKit hash-chains every piece of evidence so tampering is mathematically detectable.',
            },
            {
              title: 'Controls drift without anyone noticing',
              description:
                'Spreadsheet trackers go stale within weeks. Nobody updates the "last reviewed" column. AuditKit tracks control status in real time and alerts you when things fall behind.',
            },
            {
              title: 'Auditor back-and-forth',
              description:
                'Auditors request evidence via email. You send attachments. They ask for more. Weeks pass. AuditKit generates a complete, organized evidence package that auditors can review in one place.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* When spreadsheets make sense */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">When spreadsheets still make sense</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-muted-foreground leading-relaxed">
            If you are a very early-stage startup just exploring whether SOC 2 is relevant,
            a spreadsheet is fine for initial scoping. Map out which controls might apply,
            list your systems, and get a sense of the gap. But the moment you commit to
            getting the report, switch to a purpose-built tool. The time savings pay for
            themselves immediately, and you will avoid the painful rework of migrating
            mid-audit.
          </p>
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
          <Link href="/blog/soc-2-for-startups-affordable-compliance" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 for Startups: Affordable Compliance</h3>
            <p className="text-sm text-muted-foreground">How startups can achieve SOC 2 compliance without breaking the bank.</p>
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
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Ditch the spreadsheet</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Get SOC 2 ready in days, not months. Tamper-proof evidence from $99/mo.
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
