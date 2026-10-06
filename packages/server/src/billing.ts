// Stripe over plain fetch: Checkout Sessions, Customer Portal, and the webhook that sets project.plan.
// Everything is a stub until STRIPE_SECRET_KEY and the price ids are set.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Plan } from "./plans.js";

export interface BillingConfig {
  secretKey?: string | undefined;
  webhookSecret?: string | undefined;
  prices: Partial<Record<Exclude<Plan, "free">, string | undefined>>;
  siteUrl: string;
}

export function billingFromEnv(siteUrl: string): BillingConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: { pro: process.env.STRIPE_PRICE_PRO, business: process.env.STRIPE_PRICE_BUSINESS },
    siteUrl,
  };
}

export class BillingNotConfigured extends Error {
  constructor(what: string) { super(`billing not configured: ${what}`); }
}

export function migrateBilling(reg: DatabaseSync): void {
  reg.exec(`
    CREATE TABLE IF NOT EXISTS billing (
      project_id TEXT PRIMARY KEY REFERENCES project(id), customer_id TEXT, subscription_id TEXT, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stripe_event (id TEXT PRIMARY KEY, received_at TEXT NOT NULL);
  `);
}

async function stripe(cfg: BillingConfig, path: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  if (!cfg.secretKey) throw new BillingNotConfigured("STRIPE_SECRET_KEY");
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.secretKey}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  const json = (await r.json()) as Record<string, unknown>;
  if (!r.ok) throw new Error(`stripe ${r.status}: ${JSON.stringify((json as { error?: unknown }).error)}`);
  return json;
}

export async function checkoutUrl(cfg: BillingConfig, reg: DatabaseSync, projectId: string, plan: Exclude<Plan, "free">, email: string): Promise<string> {
  const price = cfg.prices[plan];
  if (!price) throw new BillingNotConfigured(`STRIPE_PRICE_${plan.toUpperCase()}`);
  const existing = reg.prepare("SELECT customer_id FROM billing WHERE project_id = ?").get(projectId) as { customer_id: string | null } | undefined;
  const form: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${cfg.siteUrl}/app/projects/${projectId}?upgraded=1`,
    cancel_url: `${cfg.siteUrl}/app/projects/${projectId}`,
    client_reference_id: projectId,
    "metadata[project_id]": projectId,
    "subscription_data[metadata][project_id]": projectId,
  };
  if (existing?.customer_id) form.customer = existing.customer_id; else form.customer_email = email;
  const s = await stripe(cfg, "checkout/sessions", form);
  return s.url as string;
}

export async function portalUrl(cfg: BillingConfig, reg: DatabaseSync, projectId: string): Promise<string> {
  const b = reg.prepare("SELECT customer_id FROM billing WHERE project_id = ?").get(projectId) as { customer_id: string | null } | undefined;
  if (!b?.customer_id) throw new BillingNotConfigured("no customer for project");
  const s = await stripe(cfg, "billing_portal/sessions", { customer: b.customer_id, return_url: `${cfg.siteUrl}/app/projects/${projectId}` });
  return s.url as string;
}

/** Stripe-Signature: t=...,v1=... ; HMAC-SHA256 over `${t}.${payload}`. */
export function verifyStripeSignature(secret: string, header: string | undefined, payload: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

/** Applies a verified Stripe event. Idempotent by event id. */
export function applyStripeEvent(cfg: BillingConfig, reg: DatabaseSync, ev: { id: string; type: string; data: { object: Record<string, unknown> } }): void {
  if (reg.prepare("SELECT 1 FROM stripe_event WHERE id = ?").get(ev.id)) return;
  reg.prepare("INSERT INTO stripe_event (id, received_at) VALUES (?, ?)").run(ev.id, new Date().toISOString());
  const o = ev.data.object;
  const meta = (o.metadata as Record<string, string> | undefined) ?? {};
  const projectId = meta.project_id ?? (o.client_reference_id as string | undefined);
  if (!projectId) return;
  const upsert = (customer?: unknown, subscription?: unknown) =>
    reg.prepare("INSERT INTO billing (project_id, customer_id, subscription_id, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET customer_id = COALESCE(excluded.customer_id, customer_id), subscription_id = COALESCE(excluded.subscription_id, subscription_id), updated_at = excluded.updated_at")
      .run(projectId, (customer as string) ?? null, (subscription as string) ?? null, new Date().toISOString());
  if (ev.type === "checkout.session.completed") {
    upsert(o.customer, o.subscription);
  } else if (ev.type === "customer.subscription.created" || ev.type === "customer.subscription.updated") {
    upsert(o.customer, o.id);
    const items = (o.items as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data ?? [];
    const priceId = items[0]?.price?.id;
    const plan = (Object.entries(cfg.prices).find(([, p]) => p === priceId)?.[0] as Plan | undefined) ?? null;
    const status = o.status as string;
    if (plan && (status === "active" || status === "trialing")) reg.prepare("UPDATE project SET plan = ? WHERE id = ?").run(plan, projectId);
    if (status === "canceled" || status === "unpaid") reg.prepare("UPDATE project SET plan = 'free' WHERE id = ?").run(projectId);
  } else if (ev.type === "customer.subscription.deleted") {
    reg.prepare("UPDATE project SET plan = 'free' WHERE id = ?").run(projectId);
  }
}
