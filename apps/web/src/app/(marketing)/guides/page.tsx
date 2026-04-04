import Link from 'next/link';
import { ArrowRight, Code } from 'lucide-react';
import type { Metadata } from 'next';
import { devFrameworks } from '@/lib/data/frameworks';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { BreadcrumbNav } from '@/components/seo/breadcrumb-nav';
import { CTASection } from '@/components/seo/cta-section';

export const metadata: Metadata = {
  title: 'Audit Logging Integration Guides - AuditKit',
  description:
    'Add tamper-proof audit logging to your application. Integration guides with real code examples for Node.js, NestJS, FastAPI, Go, Django, Rails, Express.js, Spring Boot, Laravel, and .NET.',
  alternates: { canonical: 'https://auditkit.dev/guides' },
  openGraph: {
    title: 'Audit Logging Integration Guides - AuditKit',
    description:
      'Add tamper-proof audit logging to your application. Integration guides with real code examples for 10+ frameworks.',
    url: 'https://auditkit.dev/guides',
    siteName: 'AuditKit',
    type: 'website',
  },
};

export default function GuidesIndexPage() {
  return (
    <div className="relative overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://auditkit.dev' },
          { name: 'Integration Guides', url: 'https://auditkit.dev/guides' },
        ]}
      />

      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <BreadcrumbNav items={[{ label: 'Integration Guides' }]} />
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Audit Logging <span className="gradient-text">Integration Guides</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Add tamper-proof audit logging to your application in minutes. Each guide includes
          installation steps, configuration, and real code examples using the AuditKit SDK.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-2 gap-5">
          {devFrameworks.map((fw) => (
            <Link
              key={fw.slug}
              href={`/guides/${fw.slug}`}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Code className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold group-hover:text-primary transition">
                      {fw.name} Audit Logging
                    </h2>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{fw.language}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {fw.description}
                  </p>
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
            <p className="text-sm text-muted-foreground">Understand audit logging requirements for SOC 2, HIPAA, GDPR, and more.</p>
          </Link>
          <Link href="/industries" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Industry Solutions</h3>
            <p className="text-sm text-muted-foreground">See how AuditKit serves fintech, healthcare, edtech, and more.</p>
          </Link>
        </div>
      </section>

      <CTASection
        secondaryHref="/docs"
        secondaryLabel="Read the Docs"
      />
    </div>
  );
}
