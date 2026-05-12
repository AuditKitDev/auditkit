"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Plus, X, FileCheck2, Layers } from "lucide-react";

interface FrameworkLite {
  slug: string;
  name: string;
  fullName: string;
  description: string;
  retentionPeriod: string;
  keyFacts: string[];
  relatedFrameworks: string[];
  loggingRequirements: Array<{ requirement: string; details: string }>;
}

interface Props {
  frameworks: FrameworkLite[];
  faqs: { question: string; answer: string }[];
}

export function ComplianceComparisonClient({ frameworks, faqs }: Props) {
  const [selected, setSelected] = useState<string[]>(["soc2", "iso27001", "hipaa"]);

  const selectedFrameworks = useMemo(
    () => selected.map((slug) => frameworks.find((f) => f.slug === slug)).filter(Boolean) as FrameworkLite[],
    [selected, frameworks],
  );

  const toggle = (slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 4) {
        // Replace oldest
        return [...prev.slice(1), slug];
      }
      return [...prev, slug];
    });
  };

  const remove = (slug: string) => setSelected((prev) => prev.filter((s) => s !== slug));

  const gridCols = selectedFrameworks.length === 1 ? "sm:grid-cols-1"
    : selectedFrameworks.length === 2 ? "sm:grid-cols-2"
    : selectedFrameworks.length === 3 ? "sm:grid-cols-3"
    : "sm:grid-cols-4";

  return (
    <div className="relative overflow-x-hidden">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        {/* Hero */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4 bg-primary/10 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Free · No signup · Runs in your browser</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Compliance Framework Comparison
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            Compare SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, PCI DSS, CMMC, DORA, NIS2, SOX, and EU AI Act side-by-side. Up to 4 frameworks at a time.
          </p>
        </section>

        {/* Picker */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Select frameworks to compare ({selected.length}/4)
          </h2>
          <div className="flex flex-wrap gap-2">
            {frameworks.map((f) => {
              const isSelected = selected.includes(f.slug);
              return (
                <button
                  key={f.slug}
                  onClick={() => toggle(f.slug)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {isSelected ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {f.name}
                </button>
              );
            })}
          </div>
          {selected.length === 4 && (
            <p className="text-xs mt-3 text-muted-foreground">
              Maximum reached. Clicking another framework will replace the first one selected.
            </p>
          )}
          {selected.length === 0 && (
            <p className="text-xs mt-3 text-muted-foreground">
              Select 2 or more frameworks to start comparing.
            </p>
          )}
        </section>

        {/* Comparison grid */}
        {selectedFrameworks.length > 0 && (
          <section className="mb-12">
            {/* Headers */}
            <div className={`grid grid-cols-1 ${gridCols} gap-4 mb-4`}>
              {selectedFrameworks.map((f) => (
                <div key={f.slug} className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-foreground">{f.name}</h3>
                    <button
                      onClick={() => remove(f.slug)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{f.fullName}</p>
                  <Link
                    href={`/compliance/${f.slug}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Full guide <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>

            {/* Row: Description */}
            <ComparisonRow label="What it covers" frameworks={selectedFrameworks} gridCols={gridCols}>
              {(f) => <p>{f.description}</p>}
            </ComparisonRow>

            {/* Row: Retention */}
            <ComparisonRow label="Log retention requirement" frameworks={selectedFrameworks} gridCols={gridCols}>
              {(f) => <p className="text-sm">{f.retentionPeriod}</p>}
            </ComparisonRow>

            {/* Row: Logging requirements */}
            <ComparisonRow label="Top logging requirements" frameworks={selectedFrameworks} gridCols={gridCols}>
              {(f) => (
                <ul className="space-y-2">
                  {f.loggingRequirements.map((r, i) => (
                    <li key={i}>
                      <p className="font-medium text-foreground text-xs">{r.requirement}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.details}</p>
                    </li>
                  ))}
                </ul>
              )}
            </ComparisonRow>

            {/* Row: Key facts */}
            <ComparisonRow label="Key facts" frameworks={selectedFrameworks} gridCols={gridCols}>
              {(f) => (
                <ul className="space-y-1.5">
                  {f.keyFacts.slice(0, 4).map((fact, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-primary">·</span> {fact}
                    </li>
                  ))}
                </ul>
              )}
            </ComparisonRow>

            {/* Row: AuditKit fit */}
            <ComparisonRow label="AuditKit satisfies" frameworks={selectedFrameworks} gridCols={gridCols}>
              {() => (
                <ul className="space-y-1.5 text-xs">
                  <li className="flex gap-1.5 text-muted-foreground"><span className="text-primary">✓</span> SHA-256 hash chains for tamper detection</li>
                  <li className="flex gap-1.5 text-muted-foreground"><span className="text-primary">✓</span> Merkle tree proofs for cryptographic integrity</li>
                  <li className="flex gap-1.5 text-muted-foreground"><span className="text-primary">✓</span> Tenant-isolated audit pipelines</li>
                  <li className="flex gap-1.5 text-muted-foreground"><span className="text-primary">✓</span> SIEM streaming + auditor viewer UI</li>
                </ul>
              )}
            </ComparisonRow>
          </section>
        )}

        {/* CTA */}
        <section className="mb-12 rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-2">
            <FileCheck2 className="w-6 h-6 text-primary" />
            One audit log infrastructure, every framework
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            AuditKit produces tamper-evident audit logs that satisfy SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, PCI DSS, CMMC, DORA, NIS2, and SOX requirements simultaneously. Build once, attest across every framework.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              See per-framework guides <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/audit-for/soc2-for-fintech"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-primary/40 transition-colors"
            >
              Industry × framework guides
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently asked</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="rounded-lg border border-border bg-card p-5">
                <summary className="cursor-pointer text-sm font-medium">{faq.question}</summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ComparisonRow({
  label,
  frameworks,
  gridCols,
  children,
}: {
  label: string;
  frameworks: FrameworkLite[];
  gridCols: string;
  children: (f: FrameworkLite) => React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">{label}</h3>
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {frameworks.map((f) => (
          <div key={f.slug} className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {children(f)}
          </div>
        ))}
      </div>
    </div>
  );
}
