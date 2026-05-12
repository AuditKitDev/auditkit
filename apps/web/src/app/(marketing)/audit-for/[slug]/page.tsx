/**
 * Industry × Framework pSEO matrix page.
 *
 * URL: /audit-for/[slug] where slug matches buyer search intent
 * (e.g. `soc2-for-fintech`, `hipaa-for-healthcare`).
 *
 * Combines framework + industry data with intersection-specific content
 * to capture high-commercial-intent long-tail queries.
 */

import Link from 'next/link';
import { Building2, ShieldCheck, FileCheck2 } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  FRAMEWORK_INDUSTRY_MATRIX,
  getAllMatrixSlugs,
  getMatrixEntryWithData,
} from '@/lib/data/framework-industry-matrix';
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { FAQSection } from '@/components/seo/faq-section';
import { CTASection } from '@/components/seo/cta-section';

export function generateStaticParams() {
  return getAllMatrixSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = getMatrixEntryWithData(slug);
  if (!data) return {};
  const { framework, industry } = data;

  const title = `${framework.name} for ${industry.name}: Audit Logging Guide - AuditKit`;
  const description = `How ${industry.name} companies meet ${framework.fullName} audit logging requirements. Tamper-proof event logs with cryptographic integrity verification.`;
  const url = `https://auditkit.dev/audit-for/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'AuditKit', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function FrameworkIndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getMatrixEntryWithData(slug);
  if (!data) notFound();
  const { entry, framework, industry } = data;

  // Build a combined FAQ list — intersection-specific FAQs first, then sample from both sources
  const mergedFaqs = [
    ...entry.intersectionFaqs,
    ...framework.faqs.slice(0, 1),
    ...industry.faqs.slice(0, 1),
  ];

  // Find sibling matrix entries (same framework OR same industry) for cross-linking
  const siblings = FRAMEWORK_INDUSTRY_MATRIX.filter(
    (m) =>
      m.slug !== slug &&
      (m.frameworkSlug === entry.frameworkSlug || m.industrySlug === entry.industrySlug),
  ).slice(0, 6);

  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Audit Logging Guides', url: 'https://auditkit.dev/audit-for' },
          {
            name: `${framework.name} for ${industry.name}`,
            url: `https://auditkit.dev/audit-for/${slug}`,
          },
        ]}
      />
      <FAQJsonLd faqs={mergedFaqs} />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav
          items={[
            { label: 'Audit Logging Guides', href: '/audit-for' },
            { label: `${framework.name} for ${industry.name}` },
          ]}
        />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {framework.name} × {industry.name}
          </span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className="gradient-text">{framework.name}</span> Audit Logging for{' '}
          <span className="gradient-text">{industry.name}</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          {entry.intersectionAngle}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-xs">
          <Link
            href={`/compliance/${framework.slug}`}
            className="rounded-full border border-border bg-card px-4 py-2 hover:border-primary/40 transition"
          >
            ← Back to {framework.name} guide
          </Link>
          <Link
            href={`/industries/${industry.slug}`}
            className="rounded-full border border-border bg-card px-4 py-2 hover:border-primary/40 transition"
          >
            ← Back to {industry.name} solutions
          </Link>
        </div>
      </section>

      {/* Why this combo matters */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Why {framework.name} matters for {industry.name.toLowerCase()}
        </h2>
        <div className="grid gap-4">
          {entry.whyItMatters.map((point) => (
            <div
              key={point}
              className="rounded-xl border border-border bg-card p-5 flex items-start gap-3"
            >
              <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Framework overview */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-6">
          About {framework.fullName}
        </h2>
        <p className="text-muted-foreground leading-relaxed text-lg mb-6">
          {framework.overview}
        </p>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm">
            <span className="font-semibold">Retention requirement: </span>
            <span className="text-muted-foreground">{framework.retentionPeriod}</span>
          </p>
        </div>
      </section>

      {/* Critical events for this combo */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Events {industry.name.toLowerCase()} must log for {framework.name}
        </h2>
        <div className="grid gap-3">
          {entry.criticalEvents.map((evt) => (
            <div key={evt} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <Building2 className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground">{evt}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Framework logging requirements */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          {framework.name} logging requirements
        </h2>
        <div className="grid gap-5">
          {framework.loggingRequirements.slice(0, 4).map((req) => (
            <div key={req.requirement} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{req.requirement}</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">{req.details}</p>
              <p className="text-xs text-primary">
                <span className="font-semibold">AuditKit: </span>
                {req.auditKitFeature}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How AuditKit fits */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          How AuditKit helps {industry.name.toLowerCase()} pass {framework.name}
        </h2>
        <div className="grid gap-5">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-2">Cryptographically tamper-proof logs</h3>
            <p className="text-muted-foreground leading-relaxed">
              SHA-256 hash chains and Merkle tree proofs provide mathematical proof that audit
              records have not been altered. This is increasingly the standard mechanism for
              satisfying {framework.name} log-integrity requirements — assessors no longer accept
              policy-only controls.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-2">Tenant-isolated audit pipelines</h3>
            <p className="text-muted-foreground leading-relaxed">
              {industry.name} platforms typically serve multiple customers from shared
              infrastructure. AuditKit enforces strict tenant isolation at the infrastructure
              level — your customers&apos; audit data is logically separated, satisfying data
              segregation requirements common in {framework.name} assessments.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-2">SIEM-ready event streaming</h3>
            <p className="text-muted-foreground leading-relaxed">
              Stream audit events to Splunk, Datadog, Elastic, or any SIEM your security team
              uses. {framework.name} increasingly requires real-time monitoring, not just retained
              logs — AuditKit ships native streaming with at-least-once delivery semantics.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-2">Built-in auditor viewer</h3>
            <p className="text-muted-foreground leading-relaxed">
              The AuditKit React viewer gives {framework.name} auditors a clear interface for
              evidence review — filtered queries, integrity verification UI, and exportable
              evidence packages. Cuts auditor request cycles by 60-80% in typical engagements.
            </p>
          </div>
        </div>
      </section>

      {/* Key facts */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Quick facts</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {framework.keyFacts.map((fact) => (
            <div key={fact} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{fact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={mergedFaqs} />

      {/* Sibling matrix entries */}
      {siblings.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related audit guides</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {siblings.map((s) => {
              const sibData = getMatrixEntryWithData(s.slug);
              if (!sibData) return null;
              return (
                <Link
                  key={s.slug}
                  href={`/audit-for/${s.slug}`}
                  className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
                >
                  <h3 className="font-bold mb-1 group-hover:text-primary transition">
                    {sibData.framework.name} for {sibData.industry.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {sibData.entry.intersectionAngle}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <CTASection
        title={`${framework.name} audit logging built for ${industry.name.toLowerCase()}`}
        description={`Tamper-proof audit trails that satisfy ${framework.name} requirements out of the box. Start from $99/mo.`}
      />
    </div>
  );
}
