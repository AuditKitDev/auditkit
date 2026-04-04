import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import { industries } from '@/lib/data/industries';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { CTASection } from '@/components/seo/cta-section';

export const metadata: Metadata = {
  title: 'Audit Logging by Industry - AuditKit',
  description:
    'Industry-specific audit logging solutions for fintech, healthcare, edtech, govtech, legaltech, insurtech, cybersecurity, and developer tools. Compliance-ready from day one.',
  alternates: { canonical: 'https://auditkit.dev/industries' },
  openGraph: {
    title: 'Audit Logging by Industry - AuditKit',
    description:
      'Industry-specific audit logging solutions for fintech, healthcare, edtech, govtech, legaltech, insurtech, cybersecurity, and developer tools.',
    url: 'https://auditkit.dev/industries',
    siteName: 'AuditKit',
    type: 'website',
  },
};

export default function IndustriesIndexPage() {
  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Industries', url: 'https://auditkit.dev/industries' },
        ]}
      />

      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav items={[{ label: 'Industries' }]} />
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Audit Logging for <span className="gradient-text">Every Industry</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Every industry has unique compliance requirements and audit logging needs. See how
          AuditKit provides tamper-proof audit trails tailored to your specific regulatory
          landscape.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid gap-5">
          {industries.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold group-hover:text-primary transition">
                      {industry.name} Audit Logging
                    </h2>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{industry.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{industry.complianceNeeds.length} compliance requirements</span>
                    <span>{industry.typicalEvents.length} tracked event types</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related resources</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/compliance" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Compliance Frameworks</h3>
            <p className="text-sm text-muted-foreground">Deep dives into SOC 2, HIPAA, GDPR, FedRAMP, and more.</p>
          </Link>
          <Link href="/guides" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Integration Guides</h3>
            <p className="text-sm text-muted-foreground">Add AuditKit to your stack with framework-specific code examples.</p>
          </Link>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
