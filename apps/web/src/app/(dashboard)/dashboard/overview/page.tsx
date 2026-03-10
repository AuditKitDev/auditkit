'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Hash,
  BarChart3,
  Zap,
  User,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';
import { Sparkline, HorizontalBar } from '@/components/dashboard/sparkline';

class OnboardingErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface AuditEvent {
  id: string;
  action: string;
  actor: { name: string; email?: string | null };
  target?: { type: string; name: string } | null;
  tenant: string;
  severity: string;
  is_anomalous?: boolean;
  anomalous?: boolean;
  occurred_at: string;
}

interface EventsResponse { data: AuditEvent[]; total?: number; }
interface TenantsResponse {
  data: { id: string; name: string; external_id: string }[];
  total?: number;
}
interface VerifyResponse { status: string; verified_count?: number; last_verified?: string; root_hash?: string; }

interface AnalyticsData {
  events_per_day: { date: string; count: number }[];
  events_by_severity: Record<string, number>;
  events_by_action: { action: string; count: number }[];
  anomaly_count: number;
  top_actors: { actor_id: string; actor_name: string; count: number }[];
}

const severityColors: Record<string, string> = {
  info: 'bg-primary/10 text-primary border border-primary/20',
  warn: 'bg-warning/10 text-warning border border-warning/20',
  error: 'bg-destructive/10 text-destructive border border-destructive/20',
  critical: 'bg-destructive text-destructive-foreground',
};

const severityChartColors: Record<string, string> = {
  info: '#818cf8',
  warning: '#fbbf24',
  error: '#ef4444',
  critical: '#dc2626',
};

function StatSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl p-5 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-4" />
      </div>
      <div className="skeleton h-8 w-16" />
    </div>
  );
}

function EventRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="skeleton h-6 w-32" />
      <div className="flex-1">
        <div className="skeleton h-4 w-40 mb-1.5" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton h-3 w-16" />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl p-5 bg-card">
      <div className="skeleton h-4 w-28 mb-3" />
      <div className="skeleton h-10 w-20 mb-3" />
      <div className="skeleton h-10 w-full" />
    </div>
  );
}

export default function OverviewPage() {
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [chainStatus, setChainStatus] = useState<VerifyResponse | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check onboarding status
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem('auditkit_onboarding_complete');
      if (done !== 'true') {
        setShowOnboarding(true);
      }
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [eventsRes, tenantsRes] = await Promise.allSettled([
          apiFetch<EventsResponse>('/v1/events?limit=5'),
          apiFetch<TenantsResponse>('/v1/tenants'),
        ]);
        if (eventsRes.status === 'fulfilled') {
          setRecentEvents(eventsRes.value.data);
          setEventCount(eventsRes.value.total ?? eventsRes.value.data.length);
        }
        let tenants: { id: string; name: string; external_id: string }[] = [];
        if (tenantsRes.status === 'fulfilled') {
          tenants = tenantsRes.value.data;
          setTenantCount(tenantsRes.value.total ?? tenants.length);
        }
        const verifyPromise = tenants.length > 0
          ? apiFetch<VerifyResponse>(`/v1/verify?tenant_id=${encodeURIComponent(tenants[0].external_id)}`)
          : Promise.resolve<VerifyResponse | null>(null);
        const [verifyRes, analyticsRes] = await Promise.allSettled([
          verifyPromise,
          apiFetch<AnalyticsData>('/dashboard/analytics'),
        ]);
        if (verifyRes.status === 'fulfilled' && verifyRes.value) {
          setChainStatus(verifyRes.value);
        } else if (tenants.length === 0) {
          setChainStatus(null);
        }
        if (analyticsRes.status === 'fulfilled') {
          setAnalytics(analyticsRes.value);
          setAnomalyCount(analyticsRes.value.anomaly_count);
        } else if (eventsRes.status === 'fulfilled') {
          // Fallback: count anomalies from recent events if analytics unavailable
          setAnomalyCount(eventsRes.value.data.filter((e) => e.is_anomalous || e.anomalous).length);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshKey]);

  const chainHealthy = chainStatus?.status === 'verified' || chainStatus?.status === 'healthy';

  const stats = [
    {
      name: 'Events Today',
      value: eventCount !== null ? eventCount.toLocaleString() : '--',
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      extra: eventCount !== null ? (
        <span className="text-xs text-success flex items-center gap-0.5 status-dot status-dot-success">Live</span>
      ) : null,
    },
    {
      name: 'Active Tenants',
      value: tenantCount !== null ? tenantCount.toLocaleString() : '--',
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      extra: null,
    },
    {
      name: 'Chain Status',
      value: chainStatus ? (chainHealthy ? 'Verified' : chainStatus.status) : '--',
      icon: ShieldCheck,
      color: chainHealthy ? 'text-success' : 'text-warning',
      bgColor: chainHealthy ? 'bg-success/10' : 'bg-warning/10',
      extra: chainStatus ? (
        chainHealthy ? (
          <span className="text-xs text-success status-dot status-dot-success">All chains intact</span>
        ) : (
          <span className="text-xs text-warning status-dot status-dot-warning">Check required</span>
        )
      ) : null,
    },
    {
      name: 'Anomalies',
      value: anomalyCount.toString(),
      icon: AlertTriangle,
      color: anomalyCount > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: anomalyCount > 0 ? 'bg-warning/10' : 'bg-muted/10',
      extra: anomalyCount > 0 ? (
        <span className="text-xs text-warning status-dot status-dot-warning">Review</span>
      ) : (
        <span className="text-xs text-success status-dot status-dot-success">None</span>
      ),
    },
  ];

  const totalSeverity = analytics
    ? Object.values(analytics.events_by_severity).reduce((a, b) => a + b, 0)
    : 0;

  const maxActionCount = analytics
    ? Math.max(...analytics.events_by_action.map((a) => a.count), 1)
    : 1;

  const totalEvents = analytics
    ? analytics.events_per_day.reduce((a, b) => a + b.count, 0)
    : 0;

  const anomalyRate = totalEvents > 0 && analytics
    ? ((analytics.anomaly_count / totalEvents) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingErrorBoundary>
          <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
        </OnboardingErrorBoundary>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your audit log activity at a glance.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
        ) : (
          stats.map((stat, i) => (
            <div
              key={stat.name}
              className="border border-border/60 rounded-xl p-5 bg-card card-hover animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">{stat.name}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                {stat.extra}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Analytics Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg tracking-tight">Analytics</h2>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs border border-border/60 rounded-lg hover:bg-secondary transition-all font-medium text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {loading ? (
          <>
            <AnalyticsSkeleton />
            <AnalyticsSkeleton />
            <AnalyticsSkeleton />
            <div className="space-y-4">
              <AnalyticsSkeleton />
              <div className="border border-border/60 rounded-xl p-5 bg-card">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="flex items-end justify-between">
                  <div>
                    <div className="skeleton h-8 w-16 mb-2" />
                    <div className="skeleton h-3 w-32" />
                  </div>
                  <div className="skeleton h-8 w-20" />
                </div>
              </div>
            </div>
          </>
        ) : analytics ? (
          <>
            {/* Events Over Time */}
            <div className="border border-border/60 rounded-xl p-5 bg-card card-hover animate-fade-up" style={{ animationDelay: '320ms' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Events Over Time</span>
              </div>
              <div className="flex items-end justify-between mb-4">
                <span className="text-2xl font-bold tracking-tight">{totalEvents.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground/60">Last 7 days</span>
              </div>
              <Sparkline
                data={analytics.events_per_day.map((d) => d.count)}
                color="#818cf8"
                width={400}
                height={60}
                showArea
                className="w-full"
              />
              <div className="flex justify-between mt-2">
                {analytics.events_per_day.length > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {analytics.events_per_day[0].date.slice(5)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {analytics.events_per_day[analytics.events_per_day.length - 1].date.slice(5)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="border border-border/60 rounded-xl p-5 bg-card card-hover animate-fade-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Severity Breakdown</span>
              </div>
              <div className="flex items-end justify-between mb-5">
                <span className="text-2xl font-bold tracking-tight">{totalSeverity.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground/60">Total events</span>
              </div>
              <div className="space-y-3">
                {Object.entries(analytics.events_by_severity).map(([severity, count]) => (
                  <div key={severity}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize">{severity}</span>
                      <span className="text-xs text-muted-foreground font-mono">{count}</span>
                    </div>
                    <HorizontalBar
                      value={count}
                      max={totalSeverity || 1}
                      color={severityChartColors[severity] || '#818cf8'}
                      height={6}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Top Actions */}
            <div className="border border-border/60 rounded-xl p-5 bg-card card-hover animate-fade-up" style={{ animationDelay: '480ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Top Actions</span>
              </div>
              {analytics.events_by_action.length === 0 ? (
                <p className="text-xs text-muted-foreground/50">No actions recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.events_by_action.map((item) => (
                    <div key={item.action}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-medium truncate mr-2">{item.action}</span>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{item.count}</span>
                      </div>
                      <HorizontalBar
                        value={item.count}
                        max={maxActionCount}
                        color="#818cf8"
                        height={5}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Actors + Anomaly Rate */}
            <div className="space-y-4">
              {/* Top Actors */}
              <div className="border border-border/60 rounded-xl p-5 bg-card card-hover animate-fade-up" style={{ animationDelay: '560ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Top Actors</span>
                </div>
                {analytics.top_actors.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50">No actors recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {analytics.top_actors.map((actor, i) => (
                      <div key={actor.actor_id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm truncate flex-1">{actor.actor_name}</span>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{actor.count} events</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Anomaly Rate */}
              <div className="border border-border/60 rounded-xl p-5 bg-card card-hover animate-fade-up" style={{ animationDelay: '640ms' }}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-muted-foreground">Anomaly Rate</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-bold tracking-tight">{anomalyRate}%</span>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {analytics.anomaly_count} anomalies / {totalEvents} events
                    </p>
                  </div>
                  <Sparkline
                    data={analytics.events_per_day.map((d) => d.count > 0 ? (analytics.anomaly_count / analytics.events_per_day.length) : 0)}
                    color="#fbbf24"
                    width={80}
                    height={32}
                    showArea={false}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Recent Events */}
      <div className="border border-border/60 rounded-xl bg-card shadow-lg shadow-black/10">
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <h2 className="font-semibold">Recent Events</h2>
          <a href="/dashboard/events" className="text-sm text-primary hover:text-primary/80 transition font-medium">
            View all &rarr;
          </a>
        </div>
        <div className="divide-y divide-border/30">
          {loading ? (
            <><EventRowSkeleton /><EventRowSkeleton /><EventRowSkeleton /><EventRowSkeleton /><EventRowSkeleton /></>
          ) : recentEvents.length === 0 ? (
            <div className="p-10 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No recent events found.</p>
            </div>
          ) : (
            recentEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-all">
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-medium ${severityColors[event.severity] || severityColors.info}`}
                >
                  {event.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-semibold">{event.actor.name}</span>
                    {event.target && (
                      <>
                        <span className="text-muted-foreground/50 mx-1.5">&rarr;</span>
                        <span className="text-muted-foreground">{event.target.type}: {event.target.name}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{event.tenant}</p>
                </div>
                {(event.is_anomalous || event.anomalous) && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-warning/10 border border-warning/20 rounded-md">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground/50 shrink-0 font-mono">
                  {formatRelative(event.occurred_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chain Health */}
      <div className="border border-border/60 rounded-xl bg-card mt-6 p-6 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Chain Integrity</h2>
            <p className="text-xs text-muted-foreground/60">SHA-256 hash chain verification</p>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><div className="skeleton h-3 w-20 mb-2" /><div className="skeleton h-5 w-28" /></div>
            <div><div className="skeleton h-3 w-24 mb-2" /><div className="skeleton h-5 w-16" /></div>
            <div><div className="skeleton h-3 w-24 mb-2" /><div className="skeleton h-5 w-48" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground/60 mb-1.5 uppercase tracking-wider font-medium">Last Verified</p>
              <p className="text-sm font-mono font-medium">
                {chainStatus?.last_verified ? formatRelative(chainStatus.last_verified) : '--'}
              </p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground/60 mb-1.5 uppercase tracking-wider font-medium">Events Verified</p>
              <p className="text-sm font-mono font-medium">
                {chainStatus?.verified_count?.toLocaleString() ?? '--'}
              </p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
              <p className="text-xs text-muted-foreground/60 mb-1.5 uppercase tracking-wider font-medium">Root Hash</p>
              <p className="text-sm font-mono text-muted-foreground truncate">
                {chainStatus?.root_hash ?? '--'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
