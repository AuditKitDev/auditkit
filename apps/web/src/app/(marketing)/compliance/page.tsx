import Link from 'next/link';
import { ArrowRight, Shield } from 'lucide-react';
import type { Metadata } from 'next';
import { complianceFrameworks } from '@/lib/data/compliance-frameworks';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { CTASection } from '@/components/seo/cta-section';

export const metadata: Metadata = {
  title: 'Compliance Framework Audit Logging Requirements - AuditKit',
  description:
    'Understand audit logging requirements for SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, CMMC, DORA, NIS2, SOX, PCI DSS, and the EU AI Act. Real compliance data with AuditKit implementation guidance.',
  alternates: { canonical: 'https://auditkit.dev/compliance' },
  openGraph: {
    title: 'Compliance Framework Audit Logging Requirements - AuditKit',
    description:
      'Understand audit logging requirements for SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, CMMC, DORA, NIS2, SOX, PCI DSS, and the EU AI Act.',
    url: 'https://auditkit.dev/compliance',
    siteName: 'AuditKit',
    type: 'website',
  },
};

export default function ComplianceIndexPage() {
  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Compliance Frameworks', url: 'https://auditkit.dev/compliance' },
        ]}
      />

      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav items={[{ label: 'Compliance Frameworks' }]} />
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Compliance Framework <span className="gradient-text">Audit Logging</span> Requirements
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Every major compliance framework requires audit logging. Understand what each framework
          demands and how AuditKit satisfies those requirements with SHA-256 hash chains, Merkle
          tree proofs, and tenant-isolated event streams.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid gap-5">
          {complianceFrameworks.map((framework) => (
            <Link
              key={framework.slug}
              href={`/compliance/${framework.slug}`}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold group-hover:text-primary transition">
                      {framework.name} Audit Logging Requirements
                    </h2>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{framework.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Retention: {framework.retentionPeriod}</span>
                    <span>{framework.loggingRequirements.length} logging requirements</span>
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
          <Link href="/guides" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Integration Guides</h3>
            <p className="text-sm text-muted-foreground">Add AuditKit to your stack with framework-specific guides and real code examples.</p>
          </Link>
          <Link href="/industries" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Industry Solutions</h3>
            <p className="text-sm text-muted-foreground">See how AuditKit serves fintech, healthcare, edtech, govtech, and more.</p>
          </Link>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
