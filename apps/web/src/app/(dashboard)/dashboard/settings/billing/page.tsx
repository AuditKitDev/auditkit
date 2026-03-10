'use client';

import { useState, useEffect } from 'react';
import { Check, CreditCard, Zap, ArrowRight, Star, Loader2, ExternalLink, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface SubscriptionData {
  plan: string;
  plan_name: string;
  status: string;
  event_quota: number;
  project_quota: number;
  retention_days: number;
  event_count: number;
  project_count: number;
  current_period_start: string | null;
  current_period_end: string | null;
  has_stripe: boolean;
}

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    events: '1K events/mo',
    retention: '7-day retention',
    projectLimit: '1 project',
    features: [
      'Basic audit logging',
      '1 project',
      '7-day event retention',
      'Dashboard access',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$39',
    period: '/mo',
    events: '50K events/mo',
    retention: '90-day retention',
    projectLimit: '3 projects',
    cta: 'Upgrade to Pro',
    features: [
      'Everything in Free',
      '50K events per month',
      '3 projects',
      '90-day retention',
      'Embedded viewer UI',
      'CSV/JSON export',
      'Webhooks + notifications',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: '$99',
    period: '/mo',
    events: '500K events/mo',
    retention: '1-year retention',
    projectLimit: '10 projects',
    cta: 'Upgrade to Business',
    popular: true,
    features: [
      'Everything in Pro',
      '500K events per month',
      '10 projects',
      '1-year retention',
      'SIEM streaming',
      'Compliance evidence packs',
      'Data residency options',
    ],
  },
  {
    key: 'supersize',
    name: 'Supersize + Milkshake',
    price: '$349',
    period: '/mo',
    events: '5M events/mo',
    retention: '7-year retention',
    projectLimit: 'Unlimited projects',
    cta: 'Go Supersize',
    features: [
      'Everything in Business',
      '5M events/mo, unlimited projects',
      '7-year retention',
      'Merkle tree proofs',
      'Legal hold',
      'SSO/SCIM',
      '99.99% SLA',
      'Priority support',
    ],
  },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

function formatQuota(n: number): string {
  if (n >= 2147483647) return 'Unlimited';
  return formatNumber(n);
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  canceled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  past_due: 'bg-red-500/10 text-red-400 border-red-500/20',
  trialing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    apiFetch<SubscriptionData>('/billing/subscription')
      .then(setSubscription)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(plan: string) {
    setCheckoutLoading(plan);
    try {
      const baseUrl = window.location.origin;
      const result = await apiFetch<{ url: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          success_url: `${baseUrl}/dashboard/settings/billing?success=true`,
          cancel_url: `${baseUrl}/dashboard/settings/billing?canceled=true`,
        }),
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch {
      // Checkout failed
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const result = await apiFetch<{ url: string }>('/billing/portal', {
        method: 'POST',
        body: JSON.stringify({
          return_url: `${window.location.origin}/dashboard/settings/billing`,
        }),
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch {
      // Portal failed
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const eventQuota = subscription?.event_quota || 1000;
  const projectQuota = subscription?.project_quota || 1;
  const eventCount = subscription?.event_count || 0;
  const projectCount = subscription?.project_count || 0;
  const isUnlimitedEvents = eventQuota >= 2147483647;
  const isUnlimitedProjects = projectQuota >= 2147483647;
  const eventRawPct = isUnlimitedEvents ? 5 : eventQuota === 0 ? 0 : (eventCount / eventQuota) * 100;
  const eventPct = Math.min(eventRawPct, 100);
  const projectRawPct = isUnlimitedProjects ? 5 : (projectCount / projectQuota) * 100;
  const projectPct = Math.min(projectRawPct, 100);

  const isSysadmin = subscription?.plan_name === 'Sysadmin';
  const upgradePlans = isSysadmin
    ? plans.filter((p) => p.key !== 'free')
    : plans.filter((p) => p.key !== currentPlan && p.key !== 'free');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Billing &amp; Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your subscription, monitor usage, and upgrade your plan.
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="border border-border/60 rounded-xl bg-card p-6 mb-8 shadow-lg shadow-black/10 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="font-bold text-lg">{subscription?.plan_name || 'Free'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border ${statusColors[subscription?.status || 'active'] || statusColors.active}`}>
                {subscription?.status || 'Active'}
              </span>
              {subscription?.has_stripe && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                >
                  {portalLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  Manage Billing
                </button>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid sm:grid-cols-3 gap-5">
            {/* Events usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Events</p>
                <p className="text-sm font-mono">
                  <span className="text-foreground font-semibold">{formatNumber(eventCount)}</span>
                  <span className="text-muted-foreground/50"> / {formatQuota(eventQuota)}</span>
                  {!isUnlimitedEvents && eventRawPct > 100 && (
                    <span className="text-destructive font-semibold ml-1">({Math.round(eventRawPct)}%)</span>
                  )}
                </p>
              </div>
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    eventRawPct > 100
                      ? 'bg-gradient-to-r from-red-600 to-red-400'
                      : eventRawPct > 90
                        ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-400'
                  }`}
                  style={{ width: `${eventPct}%` }}
                />
              </div>
            </div>

            {/* Projects usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Projects</p>
                <p className="text-sm font-mono">
                  <span className="text-foreground font-semibold">{projectCount}</span>
                  <span className="text-muted-foreground/50"> / {formatQuota(projectQuota)}</span>
                  {!isUnlimitedProjects && projectRawPct > 100 && (
                    <span className="text-destructive font-semibold ml-1">({Math.round(projectRawPct)}%)</span>
                  )}
                </p>
              </div>
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    projectRawPct > 100
                      ? 'bg-gradient-to-r from-red-600 to-red-400'
                      : projectRawPct > 90
                        ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-400'
                  }`}
                  style={{ width: `${projectPct}%` }}
                />
              </div>
            </div>

            {/* Retention */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Retention</p>
                <p className="text-sm font-mono">
                  <span className="text-foreground font-semibold">
                    {(subscription?.retention_days || 7) >= 365
                      ? `${Math.round((subscription?.retention_days || 7) / 365)}yr`
                      : `${subscription?.retention_days || 7}d`}
                  </span>
                </p>
              </div>
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${Math.min(((subscription?.retention_days || 7) / 2555) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Billing period */}
          {subscription?.current_period_end && (
            <p className="text-xs text-muted-foreground/50 mt-4">
              Current period ends {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Free plan CTA */}
      {currentPlan === 'free' && (
        <div className="border border-indigo-500/20 rounded-xl bg-gradient-to-r from-indigo-500/[0.06] to-purple-500/[0.06] p-5 mb-8 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Unlock more with a paid plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get more events, projects, longer retention, and premium features like SIEM streaming and compliance evidence.
            </p>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <h2 className="text-lg font-bold mb-4">
        {currentPlan === 'free' ? 'Upgrade Your Plan' : 'Available Plans'}
      </h2>
      <div className={`grid gap-4 mb-8 ${upgradePlans.length === 3 ? 'md:grid-cols-3' : upgradePlans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md'}`}>
        {upgradePlans.map((plan) => {
          const isCurrent = !isSysadmin && plan.key === currentPlan;
          const isDowngrade = !isSysadmin && plans.findIndex((p) => p.key === currentPlan) > plans.findIndex((p) => p.key === plan.key);

          return (
            <div
              key={plan.key}
              className={`group relative rounded-xl p-6 flex flex-col transition-all duration-300 ${
                plan.popular
                  ? 'bg-card border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                  : 'border border-border/60 bg-card hover:border-border'
              }`}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/[0.04] to-purple-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 rounded-full shadow-lg shadow-indigo-500/25">
                    <Star className="h-3 w-3" />
                    Recommended
                  </span>
                </div>
              )}

              <div className="relative">
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <div className="mb-1">
                  <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-0.5">{plan.events}</p>
                <p className="text-sm text-muted-foreground/60 mb-1">{plan.projectLimit}</p>
                <p className="text-sm text-muted-foreground/40 mb-6">{plan.retention}</p>

                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 text-center bg-secondary/50 text-muted-foreground border border-border/60">
                    Current Plan
                  </div>
                ) : isDowngrade ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading || !subscription?.has_stripe}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all flex items-center justify-center gap-2 bg-secondary text-foreground hover:bg-muted border border-border/60 disabled:opacity-50"
                  >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage Plan'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={checkoutLoading === plan.key}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 shadow-lg shadow-indigo-500/20'
                        : 'bg-secondary text-foreground hover:bg-muted border border-border/60'
                    }`}
                  >
                    {checkoutLoading === plan.key ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        {plan.cta || `Upgrade to ${plan.name}`}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage billing section for paid users */}
      {subscription?.has_stripe && (
        <div className="border border-border/60 rounded-xl bg-card p-6 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-indigo-400" />
            </div>
            <h3 className="font-semibold">Billing Management</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Update your payment method, view invoices, or cancel your subscription through the Stripe billing portal.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-muted border border-border/60 transition-all disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Open Billing Portal
          </button>
        </div>
      )}
    </div>
  );
}
