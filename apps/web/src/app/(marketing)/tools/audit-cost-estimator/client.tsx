"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Calculator,
  DollarSign,
  Clock,
  TrendingDown,
  Users,
  FileCheck2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

type FrameworkSlug = "soc2-type1" | "soc2-type2" | "iso27001" | "hipaa" | "pci-dss" | "fedramp-moderate";

interface FrameworkProfile {
  slug: FrameworkSlug;
  label: string;
  shortLabel: string;
  auditorFeesYear1: [number, number];
  auditorFeesYear2: [number, number];
  internalHoursYear1: [number, number];
  internalHoursYear2: [number, number];
  pentestRequired: boolean;
  pentestCost: [number, number];
  grcReductionPct: number; // % reduction in internal hours when using GRC tooling
  timelineMonths: [number, number];
  notes: string;
}

const FRAMEWORKS: FrameworkProfile[] = [
  {
    slug: "soc2-type1",
    label: "SOC 2 Type 1 (point-in-time)",
    shortLabel: "SOC 2 Type 1",
    auditorFeesYear1: [15000, 30000],
    auditorFeesYear2: [12000, 25000],
    internalHoursYear1: [80, 150],
    internalHoursYear2: [40, 80],
    pentestRequired: false,
    pentestCost: [0, 0],
    grcReductionPct: 35,
    timelineMonths: [2, 4],
    notes: "Point-in-time snapshot. Cheaper but rarely accepted by enterprise procurement — most ask for Type 2.",
  },
  {
    slug: "soc2-type2",
    label: "SOC 2 Type 2 (3-12 month observation)",
    shortLabel: "SOC 2 Type 2",
    auditorFeesYear1: [25000, 80000],
    auditorFeesYear2: [20000, 55000],
    internalHoursYear1: [250, 600],
    internalHoursYear2: [120, 250],
    pentestRequired: true,
    pentestCost: [15000, 40000],
    grcReductionPct: 40,
    timelineMonths: [4, 9],
    notes: "The B2B SaaS standard. Most enterprise buyers require Type 2. Observation period is the long pole.",
  },
  {
    slug: "iso27001",
    label: "ISO 27001:2022",
    shortLabel: "ISO 27001",
    auditorFeesYear1: [22000, 70000],
    auditorFeesYear2: [12000, 30000],
    internalHoursYear1: [300, 700],
    internalHoursYear2: [100, 250],
    pentestRequired: true,
    pentestCost: [12000, 35000],
    grcReductionPct: 35,
    timelineMonths: [6, 12],
    notes: "Dominant outside US. Requires surveillance audits in years 2 & 3, full re-cert year 3.",
  },
  {
    slug: "hipaa",
    label: "HIPAA (Privacy + Security)",
    shortLabel: "HIPAA",
    auditorFeesYear1: [12000, 45000],
    auditorFeesYear2: [10000, 30000],
    internalHoursYear1: [200, 500],
    internalHoursYear2: [80, 200],
    pentestRequired: true,
    pentestCost: [10000, 30000],
    grcReductionPct: 25,
    timelineMonths: [3, 9],
    notes: "No 'HIPAA certification' — instead a HIPAA risk assessment + ongoing controls program. Required for ePHI.",
  },
  {
    slug: "pci-dss",
    label: "PCI DSS v4.0 (Level 1-4 by volume)",
    shortLabel: "PCI DSS",
    auditorFeesYear1: [18000, 90000],
    auditorFeesYear2: [15000, 65000],
    internalHoursYear1: [250, 800],
    internalHoursYear2: [120, 350],
    pentestRequired: true,
    pentestCost: [15000, 45000],
    grcReductionPct: 30,
    timelineMonths: [4, 10],
    notes: "Mandatory for any business storing/processing card data. Level 1 (>6M txn/yr) requires QSA on-site audit; lower levels self-assess.",
  },
  {
    slug: "fedramp-moderate",
    label: "FedRAMP Moderate",
    shortLabel: "FedRAMP",
    auditorFeesYear1: [200000, 600000],
    auditorFeesYear2: [80000, 200000],
    internalHoursYear1: [2000, 5000],
    internalHoursYear2: [500, 1200],
    pentestRequired: true,
    pentestCost: [50000, 150000],
    grcReductionPct: 20,
    timelineMonths: [12, 24],
    notes: "Required to sell to US federal agencies. 18+ months typical. The most expensive framework by 5-10x.",
  },
];

interface Props {
  faqs: { question: string; answer: string }[];
}

export function AuditCostEstimatorClient({ faqs }: Props) {
  const [selected, setSelected] = useState<FrameworkSlug[]>(["soc2-type2"]);
  const [companySize, setCompanySize] = useState<number>(75);
  const [engineerRate, setEngineerRate] = useState<number>(130); // $/hr loaded
  const [useGrcTooling, setUseGrcTooling] = useState<boolean>(true);
  const [grcCost, setGrcCost] = useState<number>(20000); // annual
  const [useVciso, setUseVciso] = useState<boolean>(false);
  const [vcisoCost, setVcisoCost] = useState<number>(60000);

  const toggle = (slug: FrameworkSlug) => {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug],
    );
  };

  // Company-size multiplier: smaller = lower auditor fee bound, larger = upper
  const sizeMultiplier = useMemo(() => {
    if (companySize <= 25) return 0.35;
    if (companySize <= 75) return 0.55;
    if (companySize <= 200) return 0.75;
    if (companySize <= 500) return 1.0;
    return 1.25;
  }, [companySize]);

  const calc = useMemo(() => {
    let auditorY1 = 0;
    let auditorY2 = 0;
    let internalHoursY1 = 0;
    let internalHoursY2 = 0;
    let pentestY1 = 0;
    let pentestY2 = 0;
    let longestTimeline = 0;
    const selectedProfiles = selected
      .map((s) => FRAMEWORKS.find((f) => f.slug === s))
      .filter(Boolean) as FrameworkProfile[];

    for (const f of selectedProfiles) {
      // Interpolate within ranges by size multiplier
      const a1 = f.auditorFeesYear1[0] + (f.auditorFeesYear1[1] - f.auditorFeesYear1[0]) * sizeMultiplier;
      const a2 = f.auditorFeesYear2[0] + (f.auditorFeesYear2[1] - f.auditorFeesYear2[0]) * sizeMultiplier;
      auditorY1 += a1;
      auditorY2 += a2;

      // Internal hours
      let h1 = f.internalHoursYear1[0] + (f.internalHoursYear1[1] - f.internalHoursYear1[0]) * sizeMultiplier;
      let h2 = f.internalHoursYear2[0] + (f.internalHoursYear2[1] - f.internalHoursYear2[0]) * sizeMultiplier;
      if (useGrcTooling) {
        h1 *= 1 - f.grcReductionPct / 100;
        h2 *= 1 - f.grcReductionPct / 100;
      }
      internalHoursY1 += h1;
      internalHoursY2 += h2;

      // Pentest: shared if multiple frameworks need it (we count once)
      if (f.pentestRequired && pentestY1 === 0) {
        pentestY1 += f.pentestCost[0] + (f.pentestCost[1] - f.pentestCost[0]) * sizeMultiplier;
        pentestY2 = pentestY1; // annual cadence typical
      }

      // Timeline (longest of selected)
      const tl = f.timelineMonths[0] + (f.timelineMonths[1] - f.timelineMonths[0]) * sizeMultiplier;
      if (tl > longestTimeline) longestTimeline = tl;
    }

    // Cross-framework overlap discount on internal hours when stacking 2+ frameworks
    const overlapDiscount = selectedProfiles.length >= 2 ? 0.22 : 0;
    internalHoursY1 *= 1 - overlapDiscount;
    internalHoursY2 *= 1 - overlapDiscount;

    const internalCostY1 = internalHoursY1 * engineerRate;
    const internalCostY2 = internalHoursY2 * engineerRate;
    const grcY1 = useGrcTooling ? grcCost : 0;
    const grcY2 = grcY1;
    const vcisoY1 = useVciso ? vcisoCost : 0;
    const vcisoY2 = vcisoY1;

    const totalY1 = auditorY1 + internalCostY1 + pentestY1 + grcY1 + vcisoY1;
    const totalY2 = auditorY2 + internalCostY2 + pentestY2 + grcY2 + vcisoY2;

    // AuditKit savings estimate: replaces $8k-$25k of custom audit log
    // infrastructure work in Y1; saves ~80 hours/yr in evidence collection
    const auditkitSavingsY1 = selectedProfiles.length > 0 ? 12000 + 80 * engineerRate : 0;
    const auditkitSavingsY2 = selectedProfiles.length > 0 ? 60 * engineerRate : 0;

    return {
      auditorY1,
      auditorY2,
      internalHoursY1,
      internalHoursY2,
      internalCostY1,
      internalCostY2,
      pentestY1,
      pentestY2,
      grcY1,
      grcY2,
      vcisoY1,
      vcisoY2,
      totalY1,
      totalY2,
      longestTimeline,
      auditkitSavingsY1,
      auditkitSavingsY2,
      selectedCount: selectedProfiles.length,
    };
  }, [selected, sizeMultiplier, engineerRate, useGrcTooling, grcCost, useVciso, vcisoCost]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

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
            Audit Cost &amp; Timeline Estimator
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            Estimate the real Year 1 and Year 2 cost of SOC 2, ISO 27001, HIPAA, PCI DSS, and FedRAMP — auditor fees, internal engineering time, pen testing, GRC tooling, and timeline. Built from published auditor pricing and industry benchmarks.
          </p>
        </section>

        {/* Framework picker */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4" /> Select frameworks ({selected.length} selected)
          </h2>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map((f) => {
              const isSelected = selected.includes(f.slug);
              return (
                <button
                  key={f.slug}
                  onClick={() => toggle(f.slug)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border hover:border-primary/50"
                  }`}
                >
                  {f.shortLabel}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              {selected.map((s) => {
                const f = FRAMEWORKS.find((f) => f.slug === s);
                if (!f) return null;
                return (
                  <p key={s}>
                    <span className="font-medium text-foreground">{f.shortLabel}:</span> {f.notes}
                  </p>
                );
              })}
            </div>
          )}
          {selected.length >= 2 && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
              <strong>Multi-framework discount applied:</strong> 22% reduction in internal hours when pursuing 2+ frameworks (shared evidence + control infrastructure).
            </div>
          )}
        </section>

        {/* Inputs + Results */}
        <section className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Inputs */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Your context
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Company size: <span className="text-primary font-semibold">{companySize} employees</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={1000}
                  step={5}
                  value={companySize}
                  onChange={(e) => setCompanySize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Used to interpolate auditor fees within published ranges.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Engineer loaded rate: <span className="text-primary font-semibold">${engineerRate}/hr</span>
                </label>
                <input
                  type="range"
                  min={75}
                  max={250}
                  step={5}
                  value={engineerRate}
                  onChange={(e) => setEngineerRate(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Salary + benefits + overhead. $130/hr ≈ $180k/yr loaded.</p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useGrcTooling}
                    onChange={(e) => setUseGrcTooling(e.target.checked)}
                    className="accent-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Use GRC tooling (Vanta / Drata / Secureframe)</p>
                    <p className="text-xs text-muted-foreground">Reduces internal hours 25-40%, adds annual platform cost.</p>
                  </div>
                </label>
                {useGrcTooling && (
                  <div>
                    <label className="block text-xs mb-1">
                      Annual platform cost: <span className="text-primary">{fmt(grcCost)}</span>
                    </label>
                    <input
                      type="range"
                      min={6000}
                      max={48000}
                      step={1000}
                      value={grcCost}
                      onChange={(e) => setGrcCost(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useVciso}
                    onChange={(e) => setUseVciso(e.target.checked)}
                    className="accent-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Add vCISO / fractional security lead</p>
                    <p className="text-xs text-muted-foreground">Optional outside expertise. Reduces internal time, especially for first audit.</p>
                  </div>
                </label>
                {useVciso && (
                  <div>
                    <label className="block text-xs mb-1">
                      Annual vCISO cost: <span className="text-primary">{fmt(vcisoCost)}</span>
                    </label>
                    <input
                      type="range"
                      min={20000}
                      max={150000}
                      step={5000}
                      value={vcisoCost}
                      onChange={(e) => setVcisoCost(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Your estimate
            </h2>

            {calc.selectedCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Select at least one framework above to see your cost estimate.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Year 1 hero */}
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-5">
                  <p className="text-xs uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                    <Calculator className="w-3 h-3" /> Year 1 total
                  </p>
                  <p className="text-4xl font-bold">{fmt(calc.totalY1)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {calc.selectedCount === 1 ? "Single framework" : `${calc.selectedCount} frameworks`} · {Math.round(calc.internalHoursY1).toLocaleString()} internal hours · {Math.round(calc.longestTimeline)}mo timeline
                  </p>
                </div>

                {/* Year 2 */}
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                    <TrendingDown className="w-3 h-3" /> Year 2+ recurring
                  </p>
                  <p className="text-2xl font-bold">{fmt(calc.totalY2)}/yr</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(calc.internalHoursY2).toLocaleString()} internal hours · drops ~{Math.round((1 - calc.totalY2 / calc.totalY1) * 100)}% after initial audit
                  </p>
                </div>

                {/* Breakdown */}
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Year 1 breakdown</p>
                  <div className="space-y-2 text-sm">
                    <Row label="Auditor fees" value={fmt(calc.auditorY1)} />
                    <Row
                      label={`Internal engineering (${Math.round(calc.internalHoursY1)} hrs × $${engineerRate}/hr)`}
                      value={fmt(calc.internalCostY1)}
                    />
                    {calc.pentestY1 > 0 && <Row label="Penetration test" value={fmt(calc.pentestY1)} />}
                    {calc.grcY1 > 0 && <Row label="GRC platform" value={fmt(calc.grcY1)} />}
                    {calc.vcisoY1 > 0 && <Row label="vCISO" value={fmt(calc.vcisoY1)} />}
                  </div>
                </div>

                {/* Timeline */}
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Estimated timeline
                  </p>
                  <p className="text-xl font-bold">~{Math.round(calc.longestTimeline)} months from kickoff to first report</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Longest framework in your set. Type 2 observation period is typically the long pole.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* AuditKit savings */}
        {calc.selectedCount > 0 && (
          <section className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Where AuditKit fits
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-3">
                  AuditKit replaces custom-built audit log integrity infrastructure (hash chains, Merkle proofs, tamper-evident retention) that auditors require for SOC 2 CC7.2, ISO 27001 A.8.15-A.8.18, HIPAA 164.312(b), and PCI DSS Requirement 10 simultaneously.
                </p>
                <p className="text-muted-foreground">
                  Typical Year 1 savings: <strong className="text-primary">{fmt(calc.auditkitSavingsY1)}</strong> in avoided custom infrastructure work + faster evidence collection. Year 2+ savings: <strong className="text-primary">{fmt(calc.auditkitSavingsY2)}</strong> in ongoing evidence handling.
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-3">
                  Your audit-log line item in the breakdown above already includes 80-160 hours of custom log integrity engineering. AuditKit cuts that to a 2-day deployment.
                </p>
                <p className="text-xs text-muted-foreground">
                  Self-host (open source) for free or use the managed cloud at $0-$199/mo. The cryptographic primitives are the same in both.
                </p>
                <Link
                  href="/compliance"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  See framework coverage <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Method explainer */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" /> How the math works
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-2">Auditor fees</p>
              <p className="mb-3">
                Interpolated within published ranges from CPA firm pricing surveys (KirkpatrickPrice, Schellman, A-LIGN, Prescient Assurance), scaled by company size. Smaller companies (≤25 employees) hit the lower bound; 500+ hits the upper.
              </p>
              <p className="font-medium text-foreground mb-2">Internal engineering time</p>
              <p>
                Based on AICPA practitioner estimates and customer-reported hours across 60+ readiness programs. GRC tooling reduces hours 25-40% by automating evidence collection. Multi-framework pursuit gets a 22% discount on shared work (access reviews, audit logs, change management).
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Pen testing</p>
              <p className="mb-3">
                Most frameworks require annual penetration tests. The cost is shared across frameworks (one pen test satisfies multiple frameworks if scoped correctly). Range $10k-$45k depending on application scope and tester reputation.
              </p>
              <p className="font-medium text-foreground mb-2">What&apos;s NOT included</p>
              <p>
                Legal review of customer contracts, security awareness training tooling, MDM/EDR licensing, identity provider costs, and SOC analyst time during the observation period. These vary widely by company stack and typically add another 5-15% to total cost.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-5">Frequently asked</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="rounded-lg border border-border bg-card p-5">
                <summary className="cursor-pointer font-medium text-sm">{faq.question}</summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Cut the audit-log line item to a 2-day deployment.</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            AuditKit gives you tamper-evident, auditor-grade logs that satisfy SOC 2, ISO 27001, HIPAA, and PCI DSS simultaneously — open source or managed cloud, both free to start.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              See pricing <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tools/compliance-comparison"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-primary/50 transition-colors"
            >
              Compare frameworks side-by-side
            </Link>
          </div>
        </section>

        {/* Cross-link */}
        <section className="mt-10 grid sm:grid-cols-2 gap-4">
          <Link
            href="/blog/compliance-frameworks-2026-side-by-side"
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors"
          >
            <p className="font-semibold mb-1 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              Compliance Frameworks 2026: Side-by-Side
            </p>
            <p className="text-sm text-muted-foreground">The pillar guide to choosing which frameworks to pursue and in what order.</p>
          </Link>
          <Link
            href="/blog/audit-log-architecture-b2b-saas-2026"
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors"
          >
            <p className="font-semibold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Audit Log Architecture for B2B SaaS
            </p>
            <p className="text-sm text-muted-foreground">The reference architecture for compliance-grade logging across multi-tenant SaaS in 2026.</p>
          </Link>
        </section>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
