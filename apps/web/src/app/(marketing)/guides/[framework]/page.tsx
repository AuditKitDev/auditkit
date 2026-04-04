import Link from 'next/link';
import { Code } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { devFrameworks, getDevFramework } from '@/lib/data/frameworks';
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { FAQSection } from '@/components/seo/faq-section';
import { CTASection } from '@/components/seo/cta-section';

export function generateStaticParams() {
  return devFrameworks.map((f) => ({ framework: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string }>;
}): Promise<Metadata> {
  const { framework: slug } = await params;
  const fw = getDevFramework(slug);
  if (!fw) return {};

  const title = `${fw.name} Audit Logging Guide - AuditKit`;
  const description = fw.description;
  const url = `https://auditkit.dev/guides/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'AuditKit', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="rounded-xl border border-border bg-[#0d1117] overflow-x-auto">
      {language && (
        <div className="border-b border-border/30 px-4 py-2">
          <span className="text-xs text-muted-foreground">{language}</span>
        </div>
      )}
      <pre className="p-4 text-sm leading-relaxed">
        <code className="text-[#c9d1d9]">{code}</code>
      </pre>
    </div>
  );
}

export default async function GuidesFrameworkPage({
  params,
}: {
  params: Promise<{ framework: string }>;
}) {
  const { framework: slug } = await params;
  const fw = getDevFramework(slug);
  if (!fw) notFound();

  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Integration Guides', url: 'https://auditkit.dev/guides' },
          { name: `${fw.name} Audit Logging`, url: `https://auditkit.dev/guides/${slug}` },
        ]}
      />
      <FAQJsonLd faqs={fw.faqs} />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav
          items={[
            { label: 'Guides', href: '/guides' },
            { label: `${fw.name} Audit Logging` },
          ]}
        />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Code className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{fw.language}</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className="gradient-text">{fw.name}</span> Audit Logging Guide
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          {fw.description}
        </p>
      </section>

      {/* Overview */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-6">Overview</h2>
        <p className="text-muted-foreground leading-relaxed text-lg">{fw.overview}</p>
      </section>

      {/* Integration Steps */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Getting started</h2>
        <div className="grid gap-8">
          {fw.integrationSteps.map((step) => (
            <div key={step.step}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold">{step.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4 ml-11">
                {step.description}
              </p>
              {step.code && (
                <div className="ml-11">
                  <CodeBlock code={step.code} language={fw.language} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Full Example */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-6">Complete example</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Here is a complete example showing AuditKit integrated into a {fw.name} application
          with authentication logging, data access tracking, and explicit event capture.
        </p>
        <CodeBlock code={fw.codeExample} language={fw.language} />
      </section>

      {/* Common Patterns */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Common patterns</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {fw.commonPatterns.map((pattern) => (
            <div
              key={pattern}
              className="rounded-xl border border-border bg-card p-5 flex items-start gap-3"
            >
              <Code className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground">{pattern}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={fw.faqs} />

      {/* Related Guides */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">More integration guides</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {devFrameworks
            .filter((f) => f.slug !== slug)
            .slice(0, 6)
            .map((f) => (
              <Link
                key={f.slug}
                href={`/guides/${f.slug}`}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition group"
              >
                <h3 className="font-bold mb-1 group-hover:text-primary transition text-sm">
                  {f.name} Audit Logging
                </h3>
                <p className="text-xs text-muted-foreground">{f.language}</p>
              </Link>
            ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related resources</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/compliance/soc2" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Audit Logging Requirements</h3>
            <p className="text-sm text-muted-foreground">Understand what SOC 2 requires for audit logging and how AuditKit satisfies each control.</p>
          </Link>
          <Link href="/compliance" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">All Compliance Frameworks</h3>
            <p className="text-sm text-muted-foreground">SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, and more.</p>
          </Link>
        </div>
      </section>

      <CTASection
        title={`Add audit logging to your ${fw.name} app`}
        description={`Get started with tamper-proof audit trails in minutes. Open source, from $99/mo.`}
        secondaryHref="/docs"
        secondaryLabel="Read the Docs"
      />
    </div>
  );
}
