'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Activity,
  ToggleLeft,
  ToggleRight,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { useToast } from '@/components/toast';

interface AnomalyAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  description: string;
  timestamp: string;
  affectedEvents?: string[];
  metadata?: Record<string, unknown>;
}

interface AnomalyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  threshold?: number;
}

const statusBadge: Record<string, string> = {
  open: 'bg-destructive/10 text-destructive border border-destructive/20',
  acknowledged: 'bg-warning/10 text-warning border border-warning/20',
  resolved: 'bg-success/20 text-success border border-success/30',
};

const statusIcon: Record<string, typeof XCircle> = {
  open: XCircle,
  acknowledged: Eye,
  resolved: CheckCircle2,
};

const severityColors: Record<string, string> = {
  low: 'bg-primary/10 text-primary border border-primary/20',
  medium: 'bg-warning/10 text-warning border border-warning/20',
  high: 'bg-destructive/10 text-destructive border border-destructive/20',
  critical: 'bg-destructive text-destructive-foreground',
};

function SkeletonCard() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-3 w-72" />
        </div>
        <div className="skeleton h-5 w-20 rounded" />
      </div>
    </div>
  );
}

export default function AnomaliesPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [rules, setRules] = useState<AnomalyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [detectionActive, setDetectionActive] = useState(true);
  const [togglingGlobal, setTogglingGlobal] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: AnomalyAlert[]; active?: boolean }>('/dashboard/anomalies');
      const data = Array.isArray(res) ? res : res.data ?? [];
      setAlerts(data);
      if (res.active !== undefined) setDetectionActive(res.active);
    } catch {
      setError('Failed to load anomaly alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await apiFetch<{ data: AnomalyRule[] }>('/dashboard/anomaly-settings');
      const rulesData = Array.isArray(res) ? res : res.data ?? [];
      setRules(rulesData);
    } catch {
      // Rules loading is non-critical
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchRules();
  }, [fetchAlerts, fetchRules]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function toggleGlobalDetection() {
    setTogglingGlobal(true);
    setError(null);
    try {
      await apiFetch('/dashboard/anomaly-settings/global', {
        method: 'PATCH',
        body: JSON.stringify({ active: !detectionActive }),
      });
      setDetectionActive((prev) => !prev);
      toast('success', detectionActive ? 'Anomaly detection disabled' : 'Anomaly detection enabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle detection');
    } finally {
      setTogglingGlobal(false);
    }
  }

  async function updateAlertStatus(alertId: string, status: 'acknowledged' | 'resolved') {
    setUpdating(alertId);
    setError(null);
    try {
      await apiFetch(`/dashboard/anomalies/${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status } : a))
      );
      toast('success', `Alert ${status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    } finally {
      setUpdating(null);
    }
  }

  async function toggleRule(rule: AnomalyRule) {
    setToggling(rule.id);
    setError(null);
    try {
      await apiFetch(`/dashboard/anomaly-settings/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle rule');
    } finally {
      setToggling(null);
    }
  }

  async function updateThreshold(ruleId: string, threshold: number) {
    setError(null);
    if (threshold < 1 || threshold > 10000) {
      setError('Threshold must be between 1 and 10,000.');
      return;
    }
    try {
      await apiFetch(`/dashboard/anomaly-settings/${ruleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ threshold }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, threshold } : r))
      );
      toast('info', 'Threshold saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update threshold');
    }
  }

  const openCount = alerts.filter((a) => a.status === 'open').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Anomaly Detection</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor unusual patterns and suspicious activity across your audit events.
            </p>
          </div>
          <button
            onClick={toggleGlobalDetection}
            disabled={togglingGlobal}
            className={`text-[11px] px-3 py-1 rounded-full font-medium cursor-pointer transition-all ${
              detectionActive
                ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30'
                : 'bg-secondary text-muted-foreground border border-border/60 hover:bg-secondary/80'
            }`}
            title={detectionActive ? 'Click to disable detection' : 'Click to enable detection'}
          >
            {togglingGlobal ? (
              <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
            ) : detectionActive ? (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
            ) : null}
            {detectionActive ? 'Active' : 'Inactive'}
          </button>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-border/60 rounded-xl bg-card p-4 shadow-lg shadow-black/10">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Open Alerts</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{openCount}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-4 shadow-lg shadow-black/10">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Acknowledged</p>
            <p className="text-2xl font-bold mt-1 text-warning">{alerts.filter((a) => a.status === 'acknowledged').length}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-4 shadow-lg shadow-black/10">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Resolved</p>
            <p className="text-2xl font-bold mt-1 text-success">{alerts.filter((a) => a.status === 'resolved').length}</p>
          </div>
        </div>
      )}

      {/* Alert Feed */}
      <div className="mb-4">
        <h2 className="font-semibold text-lg tracking-tight">Alert Feed</h2>
      </div>

      <div className="space-y-3 mb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : alerts.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10">
            <Activity className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No anomaly alerts detected. Your events are looking normal.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isExpanded = expandedAlert === alert.id;
            const StatusIcon = statusIcon[alert.status] || XCircle;
            return (
              <div
                key={alert.id}
                className="border border-border/60 rounded-xl bg-card shadow-lg shadow-black/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                  className="w-full text-left p-5 flex items-center gap-4 hover:bg-secondary/15 transition-all"
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    alert.status === 'open' ? 'bg-destructive/10' : alert.status === 'acknowledged' ? 'bg-warning/10' : 'bg-success/10'
                  }`}>
                    <StatusIcon className={`h-4 w-4 ${
                      alert.status === 'open' ? 'text-destructive' : alert.status === 'acknowledged' ? 'text-warning' : 'text-success'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${severityColors[alert.severity] || severityColors.low}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-muted-foreground/50 font-mono">{alert.type}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{alert.description}</p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">{formatRelative(alert.timestamp)}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-md font-medium shrink-0 ${statusBadge[alert.status]}`}>
                    {alert.status}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/40 p-5 bg-secondary/10">
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="mb-4">
                        <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-2 block">Metadata</label>
                        <div className="bg-card border border-border/30 rounded-lg p-3 font-mono text-xs">
                          <pre className="whitespace-pre-wrap text-muted-foreground">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {alert.affectedEvents && alert.affectedEvents.length > 0 && (
                      <div className="mb-4">
                        <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-2 block">
                          Affected Events ({alert.affectedEvents.length})
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {alert.affectedEvents.map((eventId) => (
                            <span key={eventId} className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border/30 text-muted-foreground">
                              {eventId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                          disabled={updating === alert.id}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all disabled:opacity-50"
                        >
                          {updating === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          Acknowledge
                        </button>
                      )}
                      {(alert.status === 'open' || alert.status === 'acknowledged') && (
                        <button
                          onClick={() => updateAlertStatus(alert.id, 'resolved')}
                          disabled={updating === alert.id}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-all disabled:opacity-50"
                        >
                          {updating === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detection Rules Settings */}
      <div className="mb-4 flex items-center gap-3">
        <Settings className="h-5 w-5 text-muted-foreground/50" />
        <div>
          <h2 className="font-semibold text-lg tracking-tight">Detection Rules</h2>
          <p className="text-sm text-muted-foreground/60">Configure which anomaly detection rules are active and their thresholds.</p>
        </div>
      </div>

      <div className="space-y-3">
        {rulesLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : rules.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-8 text-center shadow-lg shadow-black/10">
            <p className="text-sm text-muted-foreground">No detection rules configured.</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="border border-border/60 rounded-xl bg-card p-5 card-hover transition-all shadow-lg shadow-black/10"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleRule(rule)}
                  disabled={toggling === rule.id}
                  className="shrink-0"
                  title={rule.enabled ? 'Disable' : 'Enable'}
                  aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                >
                  {toggling === rule.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : rule.enabled ? (
                    <ToggleRight className="h-6 w-6 text-success" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{rule.name}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{rule.description}</p>
                </div>
                {rule.threshold !== undefined && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-muted-foreground/60">Threshold:</label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={rule.threshold}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, threshold: val } : r))
                          );
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) updateThreshold(rule.id, val);
                      }}
                      className="w-20 px-2 py-1.5 text-xs bg-secondary border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all text-center font-mono"
                      aria-label={`Threshold for ${rule.name}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
