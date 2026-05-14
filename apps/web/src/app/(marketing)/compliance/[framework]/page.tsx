import Link from 'next/link';
import { Shield, CheckCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { complianceFrameworks, getFramework } from '@/lib/data/compliance-frameworks';
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { FAQSection } from '@/components/seo/faq-section';
import { CTASection } from '@/components/seo/cta-section';

export function generateStaticParams() {
  return complianceFrameworks.map((f) => ({ framework: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string }>;
}): Promise<Metadata> {
  const { framework: slug } = await params;
  const framework = getFramework(slug);
  if (!framework) return {};

  // Lead with the framework name + "Audit Log Requirements 2026" — that is
  // the literal search query enterprise compliance buyers type. The bare
  // framework name (CMMC, ISO27001) carries the click intent.
  const title = `${framework.name} Audit Log Requirements 2026: What You Actually Need to Log`;
  const description = `Pass your ${framework.name} audit the first time. See the exact log fields, retention windows, and integrity controls required, plus a free SDK that ships compliant logs in under a day.`;
  const url = `https://auditkit.dev/compliance/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'AuditKit', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ComplianceFrameworkPage({
  params,
}: {
  params: Promise<{ framework: string }>;
}) {
  const { framework: slug } = await params;
  const framework = getFramework(slug);
  if (!framework) notFound();

  const relatedFrameworks = framework.relatedFrameworks
    .map((s) => complianceFrameworks.find((f) => f.slug === s))
    .filter(Boolean);

  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Compliance Frameworks', url: 'https://auditkit.dev/compliance' },
          { name: `${framework.name} Audit Logging`, url: `https://auditkit.dev/compliance/${slug}` },
        ]}
      />
      <FAQJsonLd faqs={framework.faqs} />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav
          items={[
            { label: 'Compliance', href: '/compliance' },
            { label: `${framework.name} Audit Logging` },
          ]}
        />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Compliance Framework</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className="gradient-text">{framework.name}</span> Audit Logging Requirements
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          {framework.description}
        </p>
      </section>

      {/* Overview */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-6">Overview</h2>
        <p className="text-muted-foreground leading-relaxed text-lg">{framework.overview}</p>
      </section>

      {/* Key Facts */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Key facts</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {framework.keyFacts.map((fact) => (
            <div key={fact} className="rounded-xl border border-border bg-card p-5 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{fact}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">
            Retention period: <span className="text-primary">{framework.retentionPeriod}</span>
          </p>
        </div>
      </section>

      {/* Logging Requirements */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Audit logging requirements
        </h2>
        <div className="grid gap-5">
          {framework.loggingRequirements.map((req) => (
            <div key={req.requirement} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{req.requirement}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">{req.details}</p>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                <p className="text-sm">
                  <span className="font-semibold text-primary">How AuditKit helps: </span>
                  <span className="text-muted-foreground">{req.auditKitFeature}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={framework.faqs} />

      {/* Related Frameworks */}
      {relatedFrameworks.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related compliance frameworks</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {relatedFrameworks.map((rf) =>
              rf ? (
                <Link
                  key={rf.slug}
                  href={`/compliance/${rf.slug}`}
                  className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
                >
                  <h3 className="font-bold mb-1 group-hover:text-primary transition">
                    {rf.name} Audit Logging
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{rf.description}</p>
                </Link>
              ) : null,
            )}
          </div>
        </section>
      )}

      {/* Cross-links */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related resources</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/guides" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Integration Guides</h3>
            <p className="text-sm text-muted-foreground">Add AuditKit to your stack with code examples for Node.js, Python, Go, and more.</p>
          </Link>
          <Link href="/industries" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Industry Solutions</h3>
            <p className="text-sm text-muted-foreground">See how AuditKit serves fintech, healthcare, edtech, govtech, and more.</p>
          </Link>
          <Link href="/compare/vanta" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">AuditKit vs Vanta</h3>
            <p className="text-sm text-muted-foreground">See how AuditKit compares to the market leader on features, pricing, and evidence integrity.</p>
          </Link>
          <Link href="/soc-2" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Compliance</h3>
            <p className="text-sm text-muted-foreground">Tamper-proof evidence collection and compliance automation from $99/mo.</p>
          </Link>
        </div>
      </section>

      <CTASection
        title={`Get ${framework.name}-ready with AuditKit`}
        description={`Tamper-proof audit logging that satisfies ${framework.name} requirements. Start from $99/mo with no lock-in.`}
      />
    </div>
  );
}
