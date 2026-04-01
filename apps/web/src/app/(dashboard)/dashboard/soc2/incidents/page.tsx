'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Siren,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  FileSearch,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';
import { formatRelative } from '@/lib/utils';

/* ---------- types ---------- */

interface Incident {
  id: string;
  title: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  status: 'detected' | 'acknowledged' | 'mitigating' | 'resolved' | 'rca_complete';
  description: string;
  impactDescription: string | null;
  rootCause: string | null;
  rcaSummary: string | null;
  customersAffected: number | null;
  assignedTo: string | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  mitigatedAt: string | null;
  resolvedAt: string | null;
  rcaCompletedAt: string | null;
  createdAt: string;
}

const SEVERITIES: Incident['severity'][] = ['P0', 'P1', 'P2', 'P3', 'P4'];

const severityBadge: Record<string, string> = {
  P0: 'bg-destructive text-destructive-foreground',
  P1: 'bg-orange-500/80 text-white',
  P2: 'bg-warning/70 text-warning-foreground',
  P3: 'bg-primary/20 text-primary',
  P4: 'bg-muted text-muted-foreground',
};

const severityLabel: Record<string, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
  P4: 'Informational',
};

const statusBadge: Record<string, string> = {
  detected: 'bg-destructive/10 text-destructive border border-destructive/20',
  acknowledged: 'bg-warning/10 text-warning border border-warning/20',
  mitigating: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  resolved: 'bg-success/20 text-success border border-success/30',
  rca_complete: 'bg-primary/10 text-primary border border-primary/20',
};

const STATUS_ORDER: Incident['status'][] = ['detected', 'acknowledged', 'mitigating', 'resolved', 'rca_complete'];
const STATUS_LABELS: Record<string, string> = {
  detected: 'Detected',
  acknowledged: 'Acknowledged',
  mitigating: 'Mitigating',
  resolved: 'Resolved',
  rca_complete: 'RCA Complete',
};

const NEXT_STATUS: Record<string, Incident['status']> = {
  detected: 'acknowledged',
  acknowledged: 'mitigating',
  mitigating: 'resolved',
  resolved: 'rca_complete',
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  detected: 'Acknowledge',
  acknowledged: 'Start Mitigating',
  mitigating: 'Resolve',
  resolved: 'Complete RCA',
};

/* ---------- skeletons ---------- */

function StatSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="skeleton h-3 w-24 mb-2" />
      <div className="skeleton h-7 w-14" />
    </div>
  );
}

function IncidentSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-56" />
          <div className="skeleton h-3 w-80" />
        </div>
        <div className="skeleton h-5 w-16 rounded" />
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export default function IncidentsPage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Incident | null>(null);
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // report form
  const [reportForm, setReportForm] = useState({
    title: '',
    severity: 'P2' as Incident['severity'],
    description: '',
  });

  // edit form
  const [editForm, setEditForm] = useState({
    rootCause: '',
    rcaSummary: '',
    impactDescription: '',
    customersAffected: 0,
  });

  /* fetch project */
  useEffect(() => {
    apiFetch<{ data: { id: string }[] }>('/dashboard/projects')
      .then((res) => {
        const projectsData = Array.isArray(res) ? res : res.data ?? [];
        if (projectsData.length > 0) setProjectId(projectsData[0].id);
        else setError('No project found. Create a project first.');
      })
      .catch(() => setError('Failed to load projects'));
  }, []);

  /* fetch incidents */
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Incident[] }>(`/dashboard/soc2/incidents?project_id=${projectId}`);
      const incidentsData = Array.isArray(res) ? res : res.data ?? [];
      setIncidents(incidentsData);
    } catch {
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* report incident */
  async function handleReport() {
    if (!projectId || !reportForm.title.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/dashboard/soc2/incidents', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, ...reportForm }),
      });
      toast('success', 'Incident reported');
      setShowReportModal(false);
      setReportForm({ title: '', severity: 'P2', description: '' });
      fetchData();
    } catch {
      toast('error', 'Failed to report incident');
    } finally {
      setSaving(false);
    }
  }

  /* advance status */
  async function handleAdvance(incident: Incident) {
    const nextStatus = NEXT_STATUS[incident.status];
    if (!nextStatus) return;
    setAdvancing(incident.id);
    try {
      await apiFetch(`/dashboard/soc2/incidents/${incident.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast('success', `Status updated to ${STATUS_LABELS[nextStatus]}`);
      fetchData();
    } catch {
      toast('error', 'Failed to update status');
    } finally {
      setAdvancing(null);
    }
  }

  /* edit incident details */
  async function handleEditSave() {
    if (!showEditModal) return;
    setSaving(true);
    try {
      await apiFetch(`/dashboard/soc2/incidents/${showEditModal.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      toast('success', 'Incident updated');
      setShowEditModal(null);
      fetchData();
    } catch {
      toast('error', 'Failed to update incident');
    } finally {
      setSaving(false);
    }
  }

  /* delete */
  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/dashboard/soc2/incidents/${id}`, { method: 'DELETE' });
      toast('success', 'Incident deleted');
      fetchData();
    } catch {
      toast('error', 'Failed to delete incident');
    } finally {
      setDeleting(null);
    }
  }

  /* stats */
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter((i) => ['detected', 'acknowledged', 'mitigating'].includes(i.status)).length;
  const resolvedIncidents = incidents.filter((i) => ['resolved', 'rca_complete'].includes(i.status)).length;

  const avgResolution = (() => {
    const resolved = incidents.filter((i) => i.resolvedAt && i.detectedAt);
    if (resolved.length === 0) return 'N/A';
    const totalMs = resolved.reduce((sum, i) => {
      return sum + (new Date(i.resolvedAt!).getTime() - new Date(i.detectedAt).getTime());
    }, 0);
    const avgHours = totalMs / resolved.length / 3_600_000;
    if (avgHours < 1) return `${Math.round(avgHours * 60)}m`;
    if (avgHours < 24) return `${Math.round(avgHours)}h`;
    return `${Math.round(avgHours / 24)}d`;
  })();

  function getStatusIndex(status: string): number {
    return STATUS_ORDER.indexOf(status as Incident['status']);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Incident Tracker</h1>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Report Incident
        </button>
      </div>

      {error && (
        <div className="border border-destructive/30 rounded-xl bg-destructive/5 p-4 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Incidents</p>
            <p className="text-2xl font-bold">{totalIncidents}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Open</p>
            <p className="text-2xl font-bold text-destructive">{openIncidents}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Resolved</p>
            <p className="text-2xl font-bold text-success">{resolvedIncidents}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Avg Resolution</p>
            <p className="text-2xl font-bold">{avgResolution}</p>
          </div>
        </div>
      )}

      {/* Incident List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <IncidentSkeleton key={i} />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
          <Siren className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No incidents reported yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const isExpanded = expanded === incident.id;
            const currentIdx = getStatusIndex(incident.status);
            return (
              <div key={incident.id} className="border border-border/60 rounded-xl bg-card card-hover">
                <button
                  onClick={() => setExpanded(isExpanded ? null : incident.id)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{incident.title}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${severityBadge[incident.severity]}`}>
                          {incident.severity}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge[incident.status]}`}>
                          {STATUS_LABELS[incident.status]}
                        </span>
                      </div>
                      {/* Timeline preview */}
                      <div className="flex items-center gap-1 mt-2">
                        {STATUS_ORDER.map((s, idx) => (
                          <div key={s} className="flex items-center">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                idx <= currentIdx
                                  ? idx === currentIdx
                                    ? 'bg-primary ring-2 ring-primary/30'
                                    : 'bg-success'
                                  : 'bg-muted'
                              }`}
                            />
                            {idx < STATUS_ORDER.length - 1 && (
                              <div className={`h-0.5 w-6 ${idx < currentIdx ? 'bg-success' : 'bg-muted'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {incident.assignedTo && <span>Assigned: {incident.assignedTo}</span>}
                        {incident.customersAffected != null && (
                          <span>{incident.customersAffected} customer{incident.customersAffected !== 1 ? 's' : ''} affected</span>
                        )}
                        <span>{formatRelative(incident.detectedAt || incident.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-border/40 space-y-4">
                    {/* Timeline detail */}
                    <div className="pt-4">
                      <p className="text-xs text-muted-foreground font-medium mb-2">Timeline</p>
                      <div className="grid grid-cols-5 gap-2">
                        {STATUS_ORDER.map((s, idx) => {
                          const timestamps: Record<string, string | null> = {
                            detected: incident.detectedAt,
                            acknowledged: incident.acknowledgedAt,
                            mitigating: incident.mitigatedAt,
                            resolved: incident.resolvedAt,
                            rca_complete: incident.rcaCompletedAt,
                          };
                          const ts = timestamps[s];
                          const isReached = idx <= currentIdx;
                          return (
                            <div
                              key={s}
                              className={`text-center rounded-lg p-2 ${
                                isReached ? 'bg-success/10 border border-success/20' : 'bg-muted/30 border border-border/30'
                              }`}
                            >
                              <p className={`text-xs font-medium ${isReached ? 'text-success' : 'text-muted-foreground'}`}>
                                {STATUS_LABELS[s]}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ts ? formatRelative(ts) : '--'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
                      <p className="text-sm">{incident.description || 'No description'}</p>
                    </div>

                    {/* Impact */}
                    {incident.impactDescription && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Impact</p>
                        <p className="text-sm">{incident.impactDescription}</p>
                      </div>
                    )}

                    {/* Root Cause */}
                    {incident.rootCause && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Root Cause</p>
                        <p className="text-sm">{incident.rootCause}</p>
                      </div>
                    )}

                    {/* RCA Summary */}
                    {incident.rcaSummary && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">RCA Summary</p>
                        <p className="text-sm">{incident.rcaSummary}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      {NEXT_STATUS[incident.status] && (
                        <button
                          onClick={() => handleAdvance(incident)}
                          disabled={advancing === incident.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {advancing === incident.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowRight className="h-3 w-3" />
                          )}
                          {NEXT_ACTION_LABEL[incident.status]}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditForm({
                            rootCause: incident.rootCause || '',
                            rcaSummary: incident.rcaSummary || '',
                            impactDescription: incident.impactDescription || '',
                            customersAffected: incident.customersAffected ?? 0,
                          });
                          setShowEditModal(incident);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors"
                      >
                        <FileSearch className="h-3 w-3" />
                        Edit Details
                      </button>
                      <button
                        onClick={() => handleDelete(incident.id)}
                        disabled={deleting === incident.id}
                        className="ml-auto flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                      >
                        {deleting === incident.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h2 className="text-lg font-semibold">Report Incident</h2>
              <button onClick={() => setShowReportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Incident title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={reportForm.severity}
                  onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value as Incident['severity'] })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s} - {severityLabel[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Describe the incident..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border/40">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={saving || !reportForm.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Report Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Incident Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h2 className="text-lg font-semibold">Edit Incident Details</h2>
              <button onClick={() => setShowEditModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Root Cause</label>
                <textarea
                  value={editForm.rootCause}
                  onChange={(e) => setEditForm({ ...editForm, rootCause: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="What caused this incident?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RCA Summary</label>
                <textarea
                  value={editForm.rcaSummary}
                  onChange={(e) => setEditForm({ ...editForm, rcaSummary: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Root cause analysis summary..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Impact Description</label>
                <textarea
                  value={editForm.impactDescription}
                  onChange={(e) => setEditForm({ ...editForm, impactDescription: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="What was the impact?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Customers Affected</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.customersAffected}
                  onChange={(e) => setEditForm({ ...editForm, customersAffected: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border/40">
              <button
                onClick={() => setShowEditModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
