import type { Metadata } from "next";
import { ComplianceComparisonClient } from "./client";
import { complianceFrameworks } from "@/lib/data/compliance-frameworks";

const TITLE = "Free Compliance Framework Comparison — SOC 2 vs ISO 27001 vs HIPAA & More";
const DESCRIPTION =
  "Compare SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, PCI DSS, CMMC, DORA, NIS2, SOX, and EU AI Act side-by-side. Audit log requirements, retention periods, and key facts. Free, no signup.";
const URL = "https://auditkit.dev/tools/compliance-comparison";

const FAQS = [
  {
    question: "Which compliance frameworks should I pursue first?",
    answer:
      "It depends on your buyer geography and industry. SOC 2 Type II is the default for US B2B SaaS. ISO 27001 dominates EU and APAC enterprise procurement. HIPAA is required for any product touching ePHI. GDPR follows EU data subjects regardless of company location. Most companies pursue 2-3 with shared audit logging infrastructure rather than 1 at a time.",
  },
  {
    question: "Why compare frameworks side-by-side?",
    answer:
      "Many requirements overlap. SOC 2 CC7.2 (system monitoring) and ISO 27001 A.8.16 (monitoring activities) both demand similar audit logging. Buyers in regulated industries often need 2-3 attestations. Comparing requirements lets you design audit infrastructure once that satisfies multiple frameworks instead of repeating implementation work per framework.",
  },
  {
    question: "Does this comparison cover audit log integrity specifically?",
    answer:
      "Yes. Each framework requires logs to be tamper-evident, but the specifics vary: PCI DSS v4.0 explicitly mentions hash-based mechanisms; SOC 2 evaluates integrity through assessor sampling; HIPAA's 164.312(c) requires 'mechanism to authenticate ePHI' — interpreted broadly. AuditKit's hash chains and Merkle proofs satisfy all of these mechanisms.",
  },
  {
    question: "How accurate is the data?",
    answer:
      "Compiled from primary sources — AICPA Trust Services Criteria, ISO/IEC 27001:2022, NIST SP 800-53, 45 CFR 164, PCI DSS v4.0, EU Regulation 2016/679 (GDPR), and others. Citations are linked in each framework's deep-dive page (e.g. /compliance/soc2). When primary sources have ambiguity (e.g. HIPAA log retention isn't explicit), we use the dominant industry interpretation.",
  },
  {
    question: "Can AuditKit produce evidence for multiple frameworks simultaneously?",
    answer:
      "Yes. A single AuditKit deployment produces tamper-evident audit logs that satisfy SOC 2 monitoring controls, ISO 27001 Annex A.8.15-A.8.18, HIPAA 164.312(b), PCI DSS Requirement 10, FedRAMP AU control family, and NIST SP 800-171 audit requirements. The cost of compliance-grade logging amortizes across every framework you pursue.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  keywords: [
    "SOC 2 vs ISO 27001",
    "HIPAA vs GDPR",
    "PCI DSS vs SOC 2",
    "FedRAMP vs SOC 2",
    "compliance framework comparison",
    "audit log requirements comparison",
    "compliance framework side by side",
    "SOC 2 vs HIPAA vs PCI DSS",
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
        { "@type": "ListItem", position: 3, name: "Compliance Comparison", item: URL },
      ],
    },
    {
      "@type": "WebApplication",
      name: "Free Compliance Framework Comparison",
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
  // Pass only the data the client needs (no functions, no heavy text)
  const frameworks = complianceFrameworks.map((f) => ({
    slug: f.slug,
    name: f.name,
    fullName: f.fullName,
    description: f.description,
    retentionPeriod: f.retentionPeriod,
    keyFacts: f.keyFacts,
    relatedFrameworks: f.relatedFrameworks,
    loggingRequirements: f.loggingRequirements.slice(0, 4).map((r) => ({
      requirement: r.requirement,
      details: r.details,
    })),
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ComplianceComparisonClient frameworks={frameworks} faqs={FAQS} />
    </>
  );
}
