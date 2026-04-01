'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';
import { formatDate } from '@/lib/utils';

/* ---------- types ---------- */

interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
  treatment: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  treatmentPlan: string;
  owner: string | null;
  relatedControls: string[];
  createdAt: string;
}

interface MatrixCell {
  likelihood: number;
  impact: number;
  count: number;
}

const CATEGORIES = [
  'Technical',
  'Operational',
  'Compliance',
  'Financial',
  'Reputational',
  'Third-party',
  'People',
];
const TREATMENTS: Risk['treatment'][] = ['accept', 'mitigate', 'transfer', 'avoid'];
const STATUSES: Risk['status'][] = ['open', 'mitigated', 'accepted', 'closed'];

const statusBadge: Record<string, string> = {
  open: 'bg-destructive/10 text-destructive border border-destructive/20',
  mitigated: 'bg-success/20 text-success border border-success/30',
  accepted: 'bg-warning/10 text-warning border border-warning/20',
  closed: 'bg-muted text-muted-foreground border border-border/40',
};

const treatmentBadge: Record<string, string> = {
  accept: 'bg-warning/10 text-warning',
  mitigate: 'bg-success/10 text-success',
  transfer: 'bg-primary/10 text-primary',
  avoid: 'bg-destructive/10 text-destructive',
};

function riskColor(score: number): string {
  if (score <= 4) return 'bg-success/60 text-success-foreground';
  if (score <= 9) return 'bg-warning/60 text-warning-foreground';
  if (score <= 15) return 'bg-orange-500/60 text-white';
  return 'bg-destructive/70 text-destructive-foreground';
}

function riskLabel(score: number): string {
  if (score <= 4) return 'Low';
  if (score <= 9) return 'Medium';
  if (score <= 15) return 'High';
  return 'Critical';
}

/* ---------- skeletons ---------- */

function StatSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="skeleton h-3 w-20 mb-2" />
      <div className="skeleton h-7 w-14" />
    </div>
  );
}

function RiskSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-3 w-72" />
        </div>
        <div className="skeleton h-5 w-16 rounded" />
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export default function RiskRegisterPage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [matrix, setMatrix] = useState<MatrixCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter] = useState<{ l: number; i: number } | null>(null);

  // inline edit state
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // modal form
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    likelihood: 3,
    impact: 3,
    treatment: 'mitigate' as Risk['treatment'],
    treatmentPlan: '',
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

  /* fetch risks + matrix */
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [risksRes, matrixRes] = await Promise.all([
        apiFetch<{ data: Risk[] }>(`/dashboard/soc2/risks?project_id=${projectId}`),
        apiFetch<{ data: MatrixCell[] }>(`/dashboard/soc2/risks/matrix?project_id=${projectId}`),
      ]);
      const risksData = Array.isArray(risksRes) ? risksRes : risksRes.data ?? [];
      const matrixRaw = Array.isArray(matrixRes) ? matrixRes : matrixRes.data ?? {};
      const matrixData = Array.isArray(matrixRaw) ? matrixRaw : (matrixRaw as { matrix?: MatrixCell[] }).matrix ?? [];
      setRisks(risksData);
      setMatrix(matrixData);
    } catch {
      setError('Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* add risk */
  async function handleAdd() {
    if (!projectId || !form.title.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/dashboard/soc2/risks', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, ...form }),
      });
      toast('success', 'Risk added');
      setShowModal(false);
      setForm({ title: '', description: '', category: CATEGORIES[0], likelihood: 3, impact: 3, treatment: 'mitigate', treatmentPlan: '' });
      fetchData();
    } catch {
      toast('error', 'Failed to add risk');
    } finally {
      setSaving(false);
    }
  }

  /* update risk */
  async function handleUpdate(id: string, patch: Partial<Risk>) {
    try {
      await apiFetch(`/dashboard/soc2/risks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      toast('success', 'Risk updated');
      setEditingField(null);
      fetchData();
    } catch {
      toast('error', 'Failed to update risk');
    }
  }

  /* delete risk */
  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/dashboard/soc2/risks/${id}`, { method: 'DELETE' });
      toast('success', 'Risk deleted');
      fetchData();
    } catch {
      toast('error', 'Failed to delete risk');
    } finally {
      setDeleting(null);
    }
  }

  /* helpers */
  function getMatrixCount(l: number, i: number): number {
    return matrix.find((c) => c.likelihood === l && c.impact === i)?.count ?? 0;
  }

  const filteredRisks = matrixFilter
    ? risks.filter((r) => r.likelihood === matrixFilter.l && r.impact === matrixFilter.i)
    : risks;

  const totalRisks = risks.length;
  const openRisks = risks.filter((r) => r.status === 'open').length;
  const mitigatedRisks = risks.filter((r) => r.status === 'mitigated').length;
  const highCritical = risks.filter((r) => r.likelihood * r.impact > 9).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Risk Register</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Risk
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

      {/* Risk Matrix */}
      <div className="border border-border/60 rounded-xl bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Risk Matrix</h2>
          {matrixFilter && (
            <button
              onClick={() => setMatrixFilter(null)}
              className="text-xs text-primary hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex gap-4">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180 tracking-wide">
              Likelihood
            </span>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-5 gap-1">
              {[5, 4, 3, 2, 1].map((l) =>
                [1, 2, 3, 4, 5].map((i) => {
                  const score = l * i;
                  const count = getMatrixCount(l, i);
                  const isActive = matrixFilter?.l === l && matrixFilter?.i === i;
                  return (
                    <button
                      key={`${l}-${i}`}
                      onClick={() => setMatrixFilter(count > 0 ? { l, i } : null)}
                      className={`h-12 rounded-md flex items-center justify-center text-xs font-semibold transition-all ${riskColor(score)} ${
                        isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                      } ${count > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-50 cursor-default'}`}
                    >
                      {count > 0 ? count : ''}
                    </button>
                  );
                }),
              )}
            </div>
            {/* X-axis label */}
            <p className="text-xs text-muted-foreground text-center mt-2 tracking-wide">Impact</p>
          </div>
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground mb-1">Total Risks</p>
            <p className="text-2xl font-bold">{totalRisks}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Open</p>
            <p className="text-2xl font-bold text-destructive">{openRisks}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Mitigated</p>
            <p className="text-2xl font-bold text-success">{mitigatedRisks}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">High / Critical</p>
            <p className="text-2xl font-bold text-warning">{highCritical}</p>
          </div>
        </div>
      )}

      {/* Risk List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <RiskSkeleton key={i} />
          ))}
        </div>
      ) : filteredRisks.length === 0 ? (
        <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {matrixFilter ? 'No risks match this matrix cell.' : 'No risks registered yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRisks.map((risk) => {
            const score = risk.likelihood * risk.impact;
            const isExpanded = expanded === risk.id;
            return (
              <div
                key={risk.id}
                className="border border-border/60 rounded-xl bg-card card-hover"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : risk.id)}
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
                        <span className="font-medium">{risk.title}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${riskColor(score)}`}>
                          {score} - {riskLabel(score)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {risk.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge[risk.status]}`}>
                          {risk.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${treatmentBadge[risk.treatment]}`}>
                          {risk.treatment}
                        </span>
                        {risk.owner && <span>Owner: {risk.owner}</span>}
                        <span>{formatDate(risk.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-border/40 mt-0 space-y-4">
                    {/* Description */}
                    <div className="pt-4">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
                      <p className="text-sm">{risk.description || 'No description'}</p>
                    </div>

                    {/* Treatment Plan */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Treatment Plan</p>
                      {editingField?.id === risk.id && editingField.field === 'treatmentPlan' ? (
                        <div className="space-y-2">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(risk.id, { treatmentPlan: editValue })}
                              className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingField(null)}
                              className="px-3 py-1 bg-muted text-muted-foreground rounded text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-sm cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                          onClick={() => {
                            setEditingField({ id: risk.id, field: 'treatmentPlan' });
                            setEditValue(risk.treatmentPlan || '');
                          }}
                        >
                          {risk.treatmentPlan || 'Click to add treatment plan'}
                        </p>
                      )}
                    </div>

                    {/* Related Controls */}
                    {risk.relatedControls && risk.relatedControls.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Related Controls</p>
                        <div className="flex flex-wrap gap-1">
                          {risk.relatedControls.map((ctrl) => (
                            <span key={ctrl} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                              {ctrl}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline edit: status + treatment */}
                    <div className="flex items-center gap-4 flex-wrap pt-2">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mr-2">Status:</label>
                        <select
                          value={risk.status}
                          onChange={(e) => handleUpdate(risk.id, { status: e.target.value as Risk['status'] })}
                          className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mr-2">Treatment:</label>
                        <select
                          value={risk.treatment}
                          onChange={(e) => handleUpdate(risk.id, { treatment: e.target.value as Risk['treatment'] })}
                          className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {TREATMENTS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleDelete(risk.id)}
                        disabled={deleting === risk.id}
                        className="ml-auto flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                      >
                        {deleting === risk.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
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

      {/* Add Risk Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h2 className="text-lg font-semibold">Add Risk</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Risk title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Describe the risk..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Treatment</label>
                  <select
                    value={form.treatment}
                    onChange={(e) => setForm({ ...form, treatment: e.target.value as Risk['treatment'] })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {TREATMENTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Likelihood (1-5)</label>
                  <select
                    value={form.likelihood}
                    onChange={(e) => setForm({ ...form, likelihood: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} - {['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'][n - 1]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Impact (1-5)</label>
                  <select
                    value={form.impact}
                    onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} - {['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'][n - 1]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Treatment Plan</label>
                <textarea
                  value={form.treatmentPlan}
                  onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="How will this risk be addressed?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border/40">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Risk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
