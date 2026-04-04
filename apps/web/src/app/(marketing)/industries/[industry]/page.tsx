import Link from 'next/link';
import { Building2, Shield } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { industries, getIndustry } from '@/lib/data/industries';
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { FAQSection } from '@/components/seo/faq-section';
import { CTASection } from '@/components/seo/cta-section';

export function generateStaticParams() {
  return industries.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};

  const title = `${industry.name} Audit Logging - AuditKit`;
  const description = industry.description;
  const url = `https://auditkit.dev/industries/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'AuditKit', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const otherIndustries = industries.filter((i) => i.slug !== slug).slice(0, 4);

  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Industries', url: 'https://auditkit.dev/industries' },
          { name: `${industry.name} Audit Logging`, url: `https://auditkit.dev/industries/${slug}` },
        ]}
      />
      <FAQJsonLd faqs={industry.faqs} />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav
          items={[
            { label: 'Industries', href: '/industries' },
            { label: `${industry.name} Audit Logging` },
          ]}
        />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Industry Solution</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className="gradient-text">{industry.name}</span> Audit Logging
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          {industry.description}
        </p>
      </section>

      {/* Overview */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-6">Overview</h2>
        <p className="text-muted-foreground leading-relaxed text-lg">{industry.overview}</p>
      </section>

      {/* Compliance Needs */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Compliance requirements</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {industry.complianceNeeds.map((need) => (
            <div
              key={need}
              className="rounded-xl border border-border bg-card p-5 flex items-start gap-3"
            >
              <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground">{need}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typical Events */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Events you should be logging</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xl shadow-black/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-5 font-medium text-muted-foreground">Event</th>
                <th className="text-left p-5 font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {industry.typicalEvents.map((evt, i) => (
                <tr
                  key={evt.event}
                  className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}
                >
                  <td className="p-5">
                    <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono">
                      {evt.event}
                    </code>
                  </td>
                  <td className="p-5 text-muted-foreground">{evt.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Requirements */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Audit requirements for {industry.name.toLowerCase()}
        </h2>
        <div className="grid gap-5">
          {industry.auditRequirements.map((req) => (
            <div key={req.requirement} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{req.requirement}</h3>
              <p className="text-muted-foreground leading-relaxed">{req.details}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why AuditKit */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Why {industry.name.toLowerCase()} companies choose AuditKit
        </h2>
        <div className="grid gap-5">
          {[
            {
              title: 'Tamper-proof audit trails',
              description: `SHA-256 hash chains and Merkle tree proofs provide mathematical proof that your ${industry.name.toLowerCase()} audit records have not been altered. This level of integrity assurance is increasingly expected by regulators and auditors.`,
            },
            {
              title: 'Multi-tenant isolation',
              description: `AuditKit enforces strict tenant isolation at the infrastructure level. Your customers' audit data is logically separated, satisfying data segregation requirements common in ${industry.name.toLowerCase()} compliance frameworks.`,
            },
            {
              title: 'SIEM integration',
              description: `Stream audit events to your existing SIEM for real-time monitoring and alerting. AuditKit integrates with Splunk, Datadog, Elastic, and other platforms commonly used in ${industry.name.toLowerCase()} security operations.`,
            },
            {
              title: 'Open source transparency',
              description: `AuditKit is open source, so your security team and auditors can inspect the code. This transparency is particularly valued in ${industry.name.toLowerCase()} where trust and verifiability are paramount.`,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={industry.faqs} />

      {/* Other Industries */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Other industries</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {otherIndustries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/industries/${ind.slug}`}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
            >
              <h3 className="font-bold mb-1 group-hover:text-primary transition">
                {ind.name} Audit Logging
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{ind.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related resources</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/compliance" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Compliance Frameworks</h3>
            <p className="text-sm text-muted-foreground">Deep dives into SOC 2, HIPAA, GDPR, FedRAMP, and more.</p>
          </Link>
          <Link href="/guides" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Integration Guides</h3>
            <p className="text-sm text-muted-foreground">Add AuditKit to your stack with code examples for Node.js, Python, Go, and more.</p>
          </Link>
        </div>
      </section>

      <CTASection
        title={`Audit logging built for ${industry.name.toLowerCase()}`}
        description={`Tamper-proof audit trails that satisfy ${industry.name.toLowerCase()} compliance requirements. Start from $99/mo.`}
      />
    </div>
  );
}
