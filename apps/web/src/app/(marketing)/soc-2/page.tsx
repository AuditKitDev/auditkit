import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  Shield,
  FileCheck,
  ScrollText,
  Users,
  Building2,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  DollarSign,
  MessageSquare,
  Hash,
  GitBranch,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOC 2 Compliance Made Simple — Audit Prep Platform',
  description:
    'Get SOC 2 ready without the $50K price tag. Collect evidence, organize controls, deliver tamper-proof audit packages. From $99/mo.',
  keywords: [
    'SOC 2 compliance',
    'SOC 2 audit prep',
    'SOC 2 evidence collection',
    'SOC 2 readiness',
    'SOC 2 controls',
    'SOC 2 policies',
    'SOC 2 for startups',
    'affordable SOC 2',
    'SOC 2 automation',
    'audit evidence management',
    'compliance platform',
    'tamper-proof audit trail',
  ],
  alternates: { canonical: 'https://auditkit.dev/soc-2' },
  openGraph: {
    title: 'SOC 2 Compliance Made Simple | AuditKit',
    description:
      'Get SOC 2 ready without the $50K price tag. Collect evidence, organize controls, deliver tamper-proof audit packages. From $99/mo.',
    url: 'https://auditkit.dev/soc-2',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOC 2 Compliance Made Simple | AuditKit',
    description: 'Get SOC 2 ready without the $50K price tag. From $99/mo.',
  },
};

const features = [
  {
    icon: FileCheck,
    title: 'Evidence Vault',
    description:
      'Collect, organize, and hash-verify all audit evidence in one place. Every file is SHA-256 hashed on upload so auditors can trust nothing was altered.',
  },
  {
    icon: Shield,
    title: 'Control Catalog',
    description:
      'Pre-built SOC 2 checklist mapped to all Trust Services Criteria. Track readiness at a glance and know exactly what is left before your audit.',
  },
  {
    icon: ScrollText,
    title: 'Policy Templates',
    description:
      '15 pre-written security policies ready to customize — from Acceptable Use to Incident Response. Stop paying consultants $200-$400/hr to write boilerplate.',
  },
  {
    icon: Users,
    title: 'Access Reviews',
    description:
      'Run quarterly access review campaigns with automated reminders. Generate evidence that proves who reviewed what and when — auditors love this.',
  },
  {
    icon: Building2,
    title: 'Vendor Tracking',
    description:
      'Maintain a vendor inventory with SOC 2 report tracking, risk tiers, and renewal dates. Know which vendors are compliant and which are overdue.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Register',
    description:
      'Document and track risks with likelihood and impact scoring. Map risks to controls and show auditors your risk management process is real.',
  },
];

const faqs = [
  {
    question: 'What is SOC 2?',
    answer:
      'SOC 2 (System and Organization Controls 2) is a security framework developed by the AICPA. It evaluates how a company protects customer data across five Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. Most B2B SaaS companies need SOC 2 to close enterprise deals.',
  },
  {
    question: 'How long does SOC 2 take?',
    answer:
      'A SOC 2 Type I audit (point-in-time) typically takes 2-4 months of preparation plus 4-6 weeks for the audit itself. A Type II audit (over a period) requires a 3-12 month observation window after your controls are in place. With AuditKit, most teams significantly reduce their prep time by having evidence organized from day one.',
  },
  {
    question: 'Do I need SOC 2 Type I or Type II?',
    answer:
      'Type I evaluates your controls at a single point in time — it says "these controls exist." Type II evaluates them over a period (usually 6-12 months) — it says "these controls work consistently." Most companies start with Type I to get the report faster, then move to Type II for stronger assurance. Enterprise customers increasingly require Type II.',
  },
  {
    question: 'What evidence do auditors need?',
    answer:
      'Auditors need evidence across several categories: access control lists and reviews, change management records, security policies, incident response procedures, risk assessments, vendor management documentation, system monitoring configurations, encryption settings, backup verification, and employee training records. AuditKit organizes all of this into a structured evidence vault.',
  },
  {
    question: 'How is AuditKit different from Vanta?',
    answer:
      'Vanta is a full compliance automation platform that starts at $10K/yr. AuditKit is a focused audit prep tool that starts at $99/mo. We do not try to replace your auditor or automate everything — we help you collect evidence, organize controls, and deliver a tamper-proof audit package. If you are a startup that needs SOC 2 without a six-figure budget, AuditKit is built for you.',
  },
  {
    question: 'Does AuditKit replace my auditor?',
    answer:
      'No. AuditKit does not perform audits and does not replace your CPA firm. We are friends of auditors — we help you prepare so thoroughly that your audit goes smoothly. Your auditor will appreciate receiving organized, hash-verified evidence instead of a messy Dropbox folder.',
  },
];

const controlCriteria = [
  { code: 'CC1', name: 'Control Environment', covered: true },
  { code: 'CC2', name: 'Communication & Information', covered: true },
  { code: 'CC3', name: 'Risk Assessment', covered: true },
  { code: 'CC4', name: 'Monitoring Activities', covered: true },
  { code: 'CC5', name: 'Control Activities', covered: true },
  { code: 'CC6', name: 'Logical & Physical Access', covered: true },
  { code: 'CC7', name: 'System Operations', covered: true },
  { code: 'CC8', name: 'Change Management', covered: true },
  { code: 'CC9', name: 'Risk Mitigation', covered: true },
  { code: 'A1', name: 'Availability (optional)', covered: true },
  { code: 'PI1', name: 'Processing Integrity (optional)', covered: true },
  { code: 'C1', name: 'Confidentiality (optional)', covered: true },
  { code: 'P1', name: 'Privacy (optional)', covered: false },
];

const pricingComparison = [
  { feature: 'Starting price', auditkit: 'From $99/mo', vanta: '~$10K+/yr', drata: '~$7K+/yr', spreadsheets: '$0 + 200-500 hrs' },
  { feature: 'Annual cost', auditkit: '$1,188 – $5,988', vanta: '$10K – $50K+', drata: '$7K – $50K+', spreadsheets: '$0 + your sanity' },
  { feature: 'Evidence hashing', auditkit: true, vanta: false, drata: false, spreadsheets: false },
  { feature: 'Tamper-proof audit trail', auditkit: true, vanta: false, drata: false, spreadsheets: false },
  { feature: 'Policy templates', auditkit: true, vanta: true, drata: true, spreadsheets: false },
  { feature: 'Control mapping', auditkit: true, vanta: true, drata: true, spreadsheets: false },
  { feature: 'Risk register', auditkit: true, vanta: true, drata: true, spreadsheets: false },
  { feature: 'No annual lock-in', auditkit: true, vanta: false, drata: false, spreadsheets: true },
  { feature: 'Setup in < 1 hour', auditkit: true, vanta: false, drata: false, spreadsheets: true },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};


export default function SOC2Page() {
  return (
    <div className="relative overflow-x-hidden">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Get SOC 2 Ready
          <br />
          <span className="gradient-text">Without the $50K Price Tag</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
          AuditKit helps you collect evidence, organize controls, and deliver
          tamper-proof audit packages to your auditor. Stop drowning in
          spreadsheets — start your audit prep in minutes, not months.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="text-sm bg-primary text-primary-foreground px-8 py-3.5 rounded-lg hover:bg-primary/90 transition btn-shimmer font-semibold inline-flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="text-sm border border-border px-8 py-3.5 rounded-lg hover:bg-secondary/50 transition font-medium inline-flex items-center gap-2"
          >
            See How It Works
            <ChevronDown className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* What is SOC 2? — GEO definition section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4">What is SOC 2?</h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          SOC 2 (Service Organization Control 2) is an auditing standard developed by the AICPA that evaluates how companies handle customer data. It covers five trust service criteria: security, availability, processing integrity, confidentiality, and privacy. SOC 2 Type II audits assess whether controls operate effectively over a 3-12 month observation period.
        </p>

        <h3 className="text-xl font-bold mb-3">How much does SOC 2 cost?</h3>
        <p className="text-muted-foreground leading-relaxed mb-8">
          A first-time SOC 2 audit typically costs $25,000-$80,000 including auditor fees ($7,500-$20,000), compliance platform subscriptions ($5,000-$50,000/year), consultant fees, and 100-500 hours of internal engineering time.
        </p>

        <h3 className="text-xl font-bold mb-3">How long does SOC 2 take?</h3>
        <p className="text-muted-foreground leading-relaxed mb-8">
          SOC 2 Type I takes 2-4 months from start to report. SOC 2 Type II requires a 3-12 month observation period plus 2-6 weeks of audit fieldwork, totaling 6-15 months for first-time audits.
        </p>

        <h3 className="text-xl font-bold mb-3">What is the difference between SOC 2 Type I and Type II?</h3>
        <p className="text-muted-foreground leading-relaxed">
          SOC 2 Type I evaluates whether security controls are properly designed at a single point in time. SOC 2 Type II tests whether those controls operated effectively over a sustained period (typically 3-12 months). Most enterprise customers require Type II.
        </p>
      </section>

      {/* What is SOC 2 evidence collection? — GEO definition section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4">What is SOC 2 evidence collection?</h2>
        <p className="text-muted-foreground leading-relaxed">
          SOC 2 evidence collection is the process of gathering documentation that proves your security controls are designed and operating effectively. Auditors request 200+ pieces of evidence including access lists, change management tickets, vulnerability scans, policy documents, incident logs, and vendor assessments. Evidence collection typically consumes 60-70% of total compliance effort.
        </p>
      </section>

      {/* Pain Points */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-center">
          SOC 2 prep is painful. It does not have to be.
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Most teams face the same three problems when preparing for their SOC 2 audit.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Clock,
              stat: '100–500 hours',
              label: 'Gathering evidence manually',
              detail:
                'Screenshots, exports, spreadsheets — scattered across a dozen tools with no structure.',
            },
            {
              icon: DollarSign,
              stat: '$10K–$50K/yr',
              label: 'Enterprise compliance tools',
              detail:
                'Vanta, Drata, and others charge five figures annually. Most startups cannot afford that.',
            },
            {
              icon: MessageSquare,
              stat: 'Weeks of back-and-forth',
              label: 'Auditor evidence requests',
              detail:
                'Missing evidence, wrong formats, unclear mappings — auditors ask for the same things repeatedly.',
            },
          ].map((pain) => (
            <div
              key={pain.label}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
                <pain.icon className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-3xl font-extrabold tracking-tight mb-1">{pain.stat}</p>
              <p className="font-semibold mb-2">{pain.label}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{pain.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How AuditKit Helps */}
      <section id="features" className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-center">
          How <span className="gradient-text">AuditKit</span> Helps
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Six tools in one platform to take you from &ldquo;we need SOC 2&rdquo; to
          &ldquo;here is our audit package.&rdquo;
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tamper-Proof Evidence */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-xl border border-border bg-card p-8 md:p-10">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Tamper-Proof Evidence — <span className="gradient-text">Our Differentiator</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
            After the Delve scandal — where 494 fake SOC 2 reports were issued — auditors
            want proof your evidence is real. AuditKit provides cryptographic guarantees
            that no other compliance tool offers.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              {
                icon: Hash,
                title: 'SHA-256 Hash Chains',
                description:
                  'Every piece of evidence is hashed on upload. Each hash links to the previous, creating an unbreakable chain. Alter one file and the entire chain breaks.',
              },
              {
                icon: GitBranch,
                title: 'Merkle Tree Proofs',
                description:
                  'Batch-verify hundreds of evidence files in milliseconds. Auditors can independently verify any single file without downloading your entire vault.',
              },
              {
                icon: KeyRound,
                title: 'Ed25519 Digital Signatures',
                description:
                  'Every evidence submission is cryptographically signed. Your auditor knows exactly who uploaded what, and that it has not been modified since.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border/50 bg-secondary/20 p-5">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 mb-3">
                  <item.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="font-bold mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-secondary/30 border border-border/50 p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Why this matters:</span>{' '}
              Traditional compliance tools store evidence in plain databases. If someone
              with admin access modifies a file, there is no way to detect it. AuditKit&apos;s
              cryptographic evidence chain makes tampering mathematically detectable — giving
              auditors confidence they have never had before.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-center">
          Transparent pricing. <span className="gradient-text">No surprises.</span>
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Monthly billing. No annual lock-in. Cancel anytime. See how AuditKit stacks up
          against the alternatives.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xl shadow-black/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-5 font-medium text-muted-foreground">Feature</th>
                <th className="text-center p-5 font-bold text-primary">
                  <Logo size="md" />
                </th>
                <th className="text-center p-5 font-medium text-muted-foreground">
                  <Link href="/compare/vanta" className="hover:text-primary transition">Vanta</Link>
                </th>
                <th className="text-center p-5 font-medium text-muted-foreground">
                  <Link href="/compare/drata" className="hover:text-primary transition">Drata</Link>
                </th>
                <th className="text-center p-5 font-medium text-muted-foreground">
                  <Link href="/compare/spreadsheets" className="hover:text-primary transition">Spreadsheets</Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {pricingComparison.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}
                >
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.vanta, row.drata, row.spreadsheets].map((val, j) => (
                    <td key={j} className="text-center p-5">
                      {val === true ? (
                        <div
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            j === 0 ? 'bg-success/20' : 'bg-muted'
                          }`}
                        >
                          <Check
                            className={`h-3.5 w-3.5 ${
                              j === 0 ? 'text-success' : 'text-muted-foreground'
                            }`}
                          />
                        </div>
                      ) : val === false ? (
                        <span className="text-muted-foreground/40">&mdash;</span>
                      ) : (
                        <span
                          className={`text-sm ${
                            j === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'
                          }`}
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

      {/* SOC 2 Control Coverage */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-center">
          SOC 2 Control Coverage
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          AuditKit maps to all nine common criteria plus optional Trust Services Criteria.
          Every control has pre-built evidence requirements and readiness tracking.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {controlCriteria.map((criterion) => (
              <div
                key={criterion.code}
                className={`flex items-center gap-3 rounded-lg border p-4 ${
                  criterion.covered
                    ? 'border-success/30 bg-success/5'
                    : 'border-border bg-secondary/20'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                    criterion.covered ? 'bg-success/20' : 'bg-muted'
                  }`}
                >
                  {criterion.covered ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{criterion.code}</span>
                  <p className="text-sm font-medium leading-tight">{criterion.name}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Privacy criteria (P1) coverage is on our roadmap.{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>{' '}
            to explore the full control catalog in your dashboard.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-10 text-center">
          Frequently Asked Questions
        </h2>
        <div className="grid gap-5">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h3 className="text-lg font-bold mb-2">{faq.question}</h3>
              <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Resources */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-extrabold tracking-tight mb-8">
          Learn more about SOC 2 compliance
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/blog/audit-logs-soc-2-b2b-saas" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">Why Your B2B SaaS Needs Audit Logs Before SOC 2</h3>
            <p className="text-sm text-muted-foreground">Audit logs are a core SOC 2 requirement. Building them early saves months of compliance work.</p>
          </Link>
          <Link href="/blog/soc-2-evidence-collection-guide" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 Evidence Collection Guide</h3>
            <p className="text-sm text-muted-foreground">A practical guide to collecting and organizing evidence for your SOC 2 audit.</p>
          </Link>
          <Link href="/blog/soc-2-for-startups-affordable-compliance" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">SOC 2 for Startups: Affordable Compliance</h3>
            <p className="text-sm text-muted-foreground">How startups can achieve SOC 2 compliance without breaking the bank.</p>
          </Link>
          <Link href="/" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition group">
            <h3 className="font-bold mb-1 group-hover:text-primary transition">AuditKit: Open-Source Audit Logs for B2B SaaS</h3>
            <p className="text-sm text-muted-foreground">Ship tamper-evident audit trails in 5 minutes with our open-source SDK and managed cloud.</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-28">
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Start your SOC 2 journey today
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join teams that chose audit readiness over audit anxiety.
            Free trial — no credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-8 py-3.5 rounded-lg hover:bg-primary/90 transition btn-shimmer font-semibold inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="text-sm border border-border px-8 py-3.5 rounded-lg hover:bg-secondary/50 transition font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
