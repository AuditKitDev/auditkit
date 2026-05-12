import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, FileCheck2 } from "lucide-react";

const TITLE = "Free Compliance & Audit Tools | AuditKit";
const DESCRIPTION =
  "Free tools for compliance and audit teams — framework comparisons, requirement checklists, and more. Runs in your browser, no signup.";
const URL = "https://auditkit.dev/tools";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
};

const tools = [
  {
    href: "/tools/compliance-comparison",
    title: "Compliance Framework Comparison",
    description:
      "Compare SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, PCI DSS, CMMC, DORA, NIS2, SOX, and EU AI Act side-by-side. Up to 4 frameworks at once.",
    icon: FileCheck2,
    badge: "New",
  },
];

export default function ToolsIndex() {
  return (
    <div className="relative overflow-x-hidden">
      <main className="max-w-5xl mx-auto px-6 pt-28 pb-16">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4 bg-primary/10 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Free · No signup · Runs in your browser</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Free compliance tools
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            Quick utilities for compliance and audit teams. Use them to scope your next audit, or compare frameworks before deciding which to pursue.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-5 mb-12">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  {tool.badge && (
                    <span className="text-[10px] uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-1">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-2">{tool.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open tool <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">From comparison to attestation</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            These free tools help you scope and plan. AuditKit's audit logging infrastructure produces the cryptographic evidence that satisfies the frameworks you choose to pursue.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Compliance frameworks <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-primary/40 transition-colors"
            >
              Industry guides
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
