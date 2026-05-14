import type { Metadata } from "next";
import { AuditCostEstimatorClient } from "./client";

const TITLE = "Free SOC 2 / ISO 27001 / HIPAA Audit Cost Estimator (2026)";
const DESCRIPTION =
  "Estimate the real Year 1 and Year 2 cost of SOC 2, ISO 27001, HIPAA, PCI DSS, and FedRAMP compliance — auditor fees, internal engineering time, GRC tooling, pen testing, and timeline. Free, no signup, runs in your browser.";
const URL = "https://auditkit.dev/tools/audit-cost-estimator";

const FAQS = [
  {
    question: "What does a SOC 2 audit actually cost in 2026?",
    answer:
      "For a typical 50-150 person SaaS company: SOC 2 Type II auditor fees range $20,000-$60,000 for a small CPA firm, $50,000-$120,000 for a top-tier firm. Add $15,000-$40,000 for a penetration test, $0-$36,000/yr for GRC tooling (Vanta/Drata/Secureframe), and 200-600 hours of internal engineering time. Year 1 total typically $60,000-$220,000. Year 2+ drops 30-50% (Type II renewal is faster than initial Type II).",
  },
  {
    question: "Why is the internal engineering time the biggest hidden cost?",
    answer:
      "Most cost estimators only count auditor fees. The reality: a SOC 2 Type II readiness program consumes 200-600 engineering hours across access reviews, audit logging, change management, vulnerability scanning, and evidence collection. At a $180k/yr engineer's loaded rate (~$130/hr), that's $26,000-$78,000 in opportunity cost — often more than the auditor fee.",
  },
  {
    question: "What's the difference between Type 1 and Type 2 in cost?",
    answer:
      "SOC 2 Type 1 is a point-in-time snapshot — typically $15,000-$30,000 in auditor fees and 80-150 internal hours. Type 2 covers a 3-12 month observation period and requires continuous evidence — typically $25,000-$80,000 in auditor fees and 250-600 internal hours. Most B2B buyers require Type 2; Type 1 is rarely sufficient for procurement.",
  },
  {
    question: "Do GRC platforms (Vanta, Drata, Secureframe) actually save money?",
    answer:
      "They save time on evidence collection and auditor liaison, typically reducing engineering hours by 30-50%. But the platforms cost $12,000-$36,000/year for a small-to-mid company. The math works if your engineering rate is high and your team is small — at $180k loaded eng rate, saving 150 hours pays for the platform. For large internal compliance teams, the platforms are often cost-neutral.",
  },
  {
    question: "Where does AuditKit fit in this stack?",
    answer:
      "AuditKit specifically addresses the audit-log integrity requirement — tamper-evident logs with hash chains and Merkle proofs that satisfy SOC 2 CC7.2, ISO 27001 A.8.15-A.8.18, HIPAA 164.312(b), and PCI DSS Requirement 10 simultaneously. It doesn't replace your GRC platform — it provides the cryptographic logging primitive that GRC platforms reference as evidence. Cost: $0-$199/mo open core vs $8,000-$25,000 in custom in-house logging infrastructure.",
  },
  {
    question: "How long does each framework take to implement?",
    answer:
      "From kickoff to Type II report: SOC 2 typically 4-9 months, ISO 27001 typically 6-12 months, HIPAA depends on scope (3-6 months for software-only, 6-12 months for full BAA workflows). The Type 2 observation period is usually the long pole — 3 months minimum, 6-12 months typical. You can shorten by doing a 3-month Type 2 with mature controls, but most procurement teams prefer 12-month reports.",
  },
  {
    question: "Does this estimator save my data?",
    answer:
      "No. The calculation runs entirely in your browser. Nothing is sent to a server — there is no submit button, no API call, no tracking. You can verify in browser DevTools.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  keywords: [
    "SOC 2 cost",
    "SOC 2 audit cost",
    "how much does SOC 2 cost",
    "ISO 27001 cost",
    "HIPAA compliance cost",
    "compliance audit cost calculator",
    "SOC 2 Type 2 cost",
    "FedRAMP cost",
    "PCI DSS cost",
    "compliance cost estimator",
    "audit timeline calculator",
    "SOC 2 readiness cost",
  ],
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://auditkit.dev/" },
        { "@type": "ListItem", position: 2, name: "Tools", item: "https://auditkit.dev/tools" },
        { "@type": "ListItem", position: 3, name: "Audit Cost Estimator", item: URL },
      ],
    },
    {
      "@type": "WebApplication",
      name: "Audit Cost & Timeline Estimator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      description: DESCRIPTION,
      url: URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <AuditCostEstimatorClient faqs={FAQS} />
    </>
  );
}
