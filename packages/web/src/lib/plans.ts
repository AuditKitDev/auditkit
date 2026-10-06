// Mirrors spec §6 and packages/server/src/plans.ts. One story everywhere.
// Spec lists "embedded viewer", "auditor viewer tokens" and "SLA" as extras; they are not on the site until
// the viewer ships in packages/server (docs/web-api.md) and the owner defines an SLA. See OWNER-TODO.md.
import { REPO_URL } from "./site";
export interface Plan {
  id: "selfhost" | "free" | "pro" | "business";
  name: string;
  price: string;
  period: string;
  events: string;
  retention: string;
  anchor: string;
  extras: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { id: "selfhost", name: "Self-host", price: "Free", period: "AGPL", events: "Unlimited", retention: "Your disk", anchor: "You run it", extras: ["Full source, one container", "SQLite, no external services", "Same verifier"], cta: { label: "Read the source", href: REPO_URL } },
  { id: "free", name: "Free", price: "$0", period: "forever", events: "10k / month", retention: "30 days", anchor: "Daily", extras: ["1 project", "Rekor + OpenTimestamps anchors", "Offline verifier", "MCP connector"], cta: { label: "Start free", href: "/login" } },
  { id: "pro", name: "Pro", price: "$49", period: "per month", events: "500k / month", retention: "1 year", anchor: "Every 5 min", extras: ["Signed receipts", "Client-side signing", "Crypto-shredding erasure"], cta: { label: "Start with Pro", href: "/login?plan=pro" }, highlight: true },
  { id: "business", name: "Business", price: "$199", period: "per month", events: "5M / month", retention: "3 years", anchor: "Every minute", extras: ["Everything in Pro", "Export API", "Priority support"], cta: { label: "Start with Business", href: "/login?plan=business" } },
];

export const LIMITS: Record<"free" | "pro" | "business", { events: number; retention_days: number; anchor_interval_seconds: number; price: number }> = {
  free: { events: 10_000, retention_days: 30, anchor_interval_seconds: 86_400, price: 0 },
  pro: { events: 500_000, retention_days: 365, anchor_interval_seconds: 300, price: 49 },
  business: { events: 5_000_000, retention_days: 1_095, anchor_interval_seconds: 60, price: 199 },
};
