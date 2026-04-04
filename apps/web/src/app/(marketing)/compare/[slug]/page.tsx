import Link from 'next/link';
import { Check } from 'lucide-react';
import { Logo } from '@/components/logo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { competitors, getCompetitor } from '@/lib/data/competitors';
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { FAQSection } from '@/components/seo/faq-section';
import { CTASection } from '@/components/seo/cta-section';

// Only generate pages for competitors that DON'T already have static pages
const STATIC_PAGES = ['vanta', 'drata', 'pangea', 'retraced', 'workos'];
const dynamicCompetitors = competitors.filter(
  (c) => !STATIC_PAGES.includes(c.slug) && c.slug !== 'workos-auditlog',
);

export function generateStaticParams() {
  return dynamicCompetitors.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor || STATIC_PAGES.includes(slug)) return {};

  const title = `AuditKit vs ${competitor.name} - Audit Logging Comparison`;
  const description = competitor.description;
  const url = `https://auditkit.dev/compare/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'AuditKit', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function CompareCompetitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor || STATIC_PAGES.includes(slug)) notFound();

  const otherCompetitors = competitors
    .filter((c) => c.slug !== slug)
    .slice(0, 4);

  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Compare', url: 'https://auditkit.dev/compare' },
          { name: `AuditKit vs ${competitor.name}`, url: `https://auditkit.dev/compare/${slug}` },
        ]}
      />
      <FAQJsonLd faqs={competitor.faqs} />

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav
          items={[
            { label: 'Compare', href: '/compare/vanta' },
            { label: `AuditKit vs ${competitor.name}` },
          ]}
        />
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          AuditKit vs <span className="gradient-text">{competitor.name}</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          {competitor.description}
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="px-3 py-1 rounded-full border border-border bg-card">
            {competitor.category}
          </span>
          <span>{competitor.pricing}</span>
        </div>
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
                <th className="text-center p-5 font-medium text-muted-foreground">
                  {competitor.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {competitor.features.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}
                >
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.competitor].map((val, j) => (
                    <td key={j} className="text-center p-5">
                      {val === true ? (
                        <div
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${j === 0 ? 'bg-success/20' : 'bg-muted'}`}
                        >
                          <Check
                            className={`h-3.5 w-3.5 ${j === 0 ? 'text-success' : 'text-muted-foreground'}`}
                          />
                        </div>
                      ) : val === false ? (
                        <span className="text-muted-foreground/40">&mdash;</span>
                      ) : (
                        <span
                          className={`text-sm ${j === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                        >
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

      {/* What AuditKit does better */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Why teams choose AuditKit over {competitor.name}
        </h2>
        <div className="grid gap-5">
          {competitor.auditkitAdvantages.map((adv) => (
            <div key={adv.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2">{adv.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{adv.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What competitor does well */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          What {competitor.name} does well
        </h2>
        <div className="grid gap-5">
          {competitor.strengths.map((strength) => (
            <div key={strength} className="rounded-xl border border-border bg-card p-5 flex items-start gap-3">
              <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              <p className="text-muted-foreground">{strength}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Weaknesses */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Common concerns with {competitor.name}
        </h2>
        <div className="grid gap-5">
          {competitor.weaknesses.map((weakness) => (
            <div key={weakness} className="rounded-xl border border-border bg-card p-5 flex items-start gap-3">
              <span className="text-muted-foreground/40 flex-shrink-0 mt-0.5">&bull;</span>
              <p className="text-muted-foreground">{weakness}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={competitor.faqs} />

      {/* Other Comparisons */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">More comparisons</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {otherCompetitors.map((c) => {
            const href = STATIC_PAGES.includes(c.slug)
              ? `/compare/${c.slug === 'workos-auditlog' ? 'workos' : c.slug}`
              : `/compare/${c.slug}`;
            return (
              <Link
                key={c.slug}
                href={href}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
              >
                <h3 className="font-bold mb-1 group-hover:text-primary transition">
                  AuditKit vs {c.name}
                </h3>
                <p className="text-xs text-muted-foreground">{c.category} &middot; {c.pricing}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Cross-links */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">Related resources</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/soc-2" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Compliance</h3>
            <p className="text-sm text-muted-foreground">Tamper-proof evidence collection from $99/mo.</p>
          </Link>
          <Link href="/compliance" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Compliance Frameworks</h3>
            <p className="text-sm text-muted-foreground">Audit logging requirements for SOC 2, HIPAA, GDPR, FedRAMP, and more.</p>
          </Link>
          <Link href="/guides" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Integration Guides</h3>
            <p className="text-sm text-muted-foreground">Add AuditKit to your stack with code examples for 10+ frameworks.</p>
          </Link>
          <Link href="/industries" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Industry Solutions</h3>
            <p className="text-sm text-muted-foreground">Fintech, healthcare, edtech, govtech, and more.</p>
          </Link>
        </div>
      </section>

      <CTASection
        title="Ready to get started?"
        description={`Get tamper-proof audit logging with transparent pricing from $99/mo. No sales call required.`}
      />
    </div>
  );
}
