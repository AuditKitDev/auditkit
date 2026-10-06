export type Plan = "free" | "pro" | "business";

export interface PlanLimits {
  events_per_month: number;
  retention_days: number;
  anchor_interval_seconds: number;
  price_usd: number;
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: { events_per_month: 10_000, retention_days: 30, anchor_interval_seconds: 86_400, price_usd: 0 },
  pro: { events_per_month: 500_000, retention_days: 365, anchor_interval_seconds: 300, price_usd: 49 },
  business: { events_per_month: 5_000_000, retention_days: 1_095, anchor_interval_seconds: 60, price_usd: 199 },
};

export function planOf(name: string): PlanLimits {
  return PLANS[(name in PLANS ? name : "free") as Plan];
}
