'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  FileText,
  User,
  Link2,
  Search,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
}

interface Control {
  id: string;
  criteriaId: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  implementationStatus: 'not_started' | 'in_progress' | 'ready' | 'verified';
  auditorGuidance: string;
  evidenceGuidance: string;
  notes: string;
  ownerId: string | null;
  ownerName: string | null;
  evidenceCount: number;
}

interface ReadinessData {
  overall: number;
  byStatus: {
    not_started: number;
    in_progress: number;
    ready: number;
    verified: number;
  };
  total: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { key: 'CC1', label: 'Control Environment' },
  { key: 'CC2', label: 'Communication & Information' },
  { key: 'CC3', label: 'Risk Assessment' },
  { key: 'CC4', label: 'Monitoring Activities' },
  { key: 'CC5', label: 'Control Activities' },
  { key: 'CC6', label: 'Logical & Physical Access' },
  { key: 'CC7', label: 'System Operations' },
  { key: 'CC8', label: 'Change Management' },
  { key: 'CC9', label: 'Risk Mitigation' },
  { key: 'A1', label: 'Availability' },
  { key: 'PI1', label: 'Processing Integrity' },
  { key: 'C1', label: 'Confidentiality' },
] as const;

const STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses' },
  { key: 'not_started', label: 'Not Started' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready', label: 'Ready' },
  { key: 'verified', label: 'Verified' },
] as const;

const statusConfig: Record<string, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'In Progress', className: 'bg-warning/10 text-warning' },
  ready: { label: 'Ready', className: 'bg-blue-500/10 text-blue-400' },
  verified: { label: 'Verified', className: 'bg-success/10 text-success' },
};

const statusBarColors: Record<string, string> = {
  not_started: 'bg-destructive/60',
  in_progress: 'bg-warning/60',
  ready: 'bg-blue-400/60',
  verified: 'bg-success/60',
};

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function ControlSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-14 rounded" />
        <div className="skeleton h-5 w-64" />
        <div className="skeleton h-5 w-20 rounded ml-auto" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ControlsPage() {
  const { toast } = useToast();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Inline editing
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* ---- Load project ---- */
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await apiFetch<{ data: Project[] }>('/dashboard/projects');
        if (res.data?.length > 0) {
          setProjectId(res.data[0].id);
        }
      } catch {
        setError('Failed to load projects');
        setLoading(false);
      }
    }
    loadProject();
  }, []);

  /* ---- Load controls + readiness ---- */
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [controlsRes, readinessRes] = await Promise.allSettled([
        apiFetch<{ data: Control[] }>(
          `/dashboard/soc2/controls?project_id=${projectId}&framework=soc2`,
        ),
        apiFetch<{ data: ReadinessData }>(
          `/dashboard/soc2/controls/readiness?project_id=${projectId}`,
        ),
      ]);

      if (controlsRes.status === 'fulfilled') {
        const data = Array.isArray(controlsRes.value)
          ? controlsRes.value
          : controlsRes.value.data ?? [];
        setControls(data);
      } else {
        setError('Failed to load controls');
      }

      if (readinessRes.status === 'fulfilled') {
        const rd = (readinessRes.value as { data?: ReadinessData }).data ?? (readinessRes.value as unknown as ReadinessData);
        setReadiness(rd);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Update control ---- */
  async function updateControl(
    id: string,
    updates: { implementationStatus?: string; notes?: string; ownerId?: string },
  ) {
    setUpdatingId(id);
    try {
      await apiFetch(`/dashboard/soc2/controls/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setControls((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(updates.implementationStatus
                  ? { implementationStatus: updates.implementationStatus as Control['implementationStatus'] }
                  : {}),
                ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
              }
            : c,
        ),
      );
      toast('success', 'Control updated');
      // Refresh readiness
      if (updates.implementationStatus) {
        try {
          const r = await apiFetch<{ data: ReadinessData }>(
            `/dashboard/soc2/controls/readiness?project_id=${projectId}`,
          );
          const rd = (r as { data?: ReadinessData }).data ?? (r as unknown as ReadinessData);
          setReadiness(rd);
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update control');
    } finally {
      setUpdatingId(null);
    }
  }

  /* ---- Filtering ---- */
  const filtered = controls.filter((c) => {
    if (categoryFilter !== 'all' && !c.criteriaId.startsWith(categoryFilter)) return false;
    if (statusFilter !== 'all' && c.implementationStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.criteriaId.toLowerCase().includes(q) &&
        !c.title.toLowerCase().includes(q) &&
        !c.description.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, Control[]>>((acc, c) => {
    const catKey = CATEGORIES.find((cat) => c.criteriaId.startsWith(cat.key))?.key || 'Other';
    if (!acc[catKey]) acc[catKey] = [];
    acc[catKey].push(c);
    return acc;
  }, {});

  const orderedGroups = CATEGORIES.filter((cat) => grouped[cat.key]?.length).map(
    (cat) => ({
      key: cat.key,
      label: cat.label,
      controls: grouped[cat.key],
    }),
  );

  /* ---- Render ---- */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOC 2 Controls</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track implementation status across all SOC 2 Trust Services Criteria.
          </p>
        </div>
        {readiness && (
          <div className="text-right">
            <p className="text-3xl font-bold">{readiness.overall}%</p>
            <p className="text-xs text-muted-foreground/60">Readiness</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Readiness progress bar */}
      {readiness && (
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Overall Readiness</h2>
            <span className="text-xs text-muted-foreground/60">
              {readiness.total} controls
            </span>
          </div>

          {/* Stacked bar */}
          <div className="h-3 rounded-full bg-secondary/30 overflow-hidden flex">
            {(['verified', 'ready', 'in_progress', 'not_started'] as const).map((status) => {
              const count = readiness.byStatus[status];
              const pct = readiness.total > 0 ? (count / readiness.total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={status}
                  className={`${statusBarColors[status]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 flex-wrap">
            {(['verified', 'ready', 'in_progress', 'not_started'] as const).map((status) => {
              const cfg = statusConfig[status];
              const count = readiness.byStatus[status];
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <div className={`h-2.5 w-2.5 rounded-full ${statusBarColors[status]}`} />
                  <span className="text-muted-foreground/60">
                    {cfg.label}: {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search controls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border/60 rounded-xl bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-border/60 rounded-xl bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.key} - {cat.label}
              </option>
            ))}
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-border/60 rounded-xl bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
        </div>
      </div>

      {/* Controls list */}
      {loading ? (
        <div className="space-y-3">
          <ControlSkeleton />
          <ControlSkeleton />
          <ControlSkeleton />
          <ControlSkeleton />
          <ControlSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10">
          <Shield className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {controls.length === 0
              ? 'No controls found. Controls are generated when you set up a SOC 2 project.'
              : 'No controls match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedGroups.map((group) => (
            <div key={group.key}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-medium">
                  {group.key}
                </span>
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {group.label}
                </h2>
                <span className="text-xs text-muted-foreground/40 ml-auto">
                  {group.controls.length} control{group.controls.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Controls in category */}
              <div className="space-y-2">
                {group.controls.map((control) => {
                  const isExpanded = expandedId === control.id;
                  const cfg = statusConfig[control.implementationStatus] || statusConfig.not_started;
                  const isUpdating = updatingId === control.id;

                  return (
                    <div
                      key={control.id}
                      className="border border-border/60 rounded-xl bg-card shadow-lg shadow-black/10 overflow-hidden"
                    >
                      {/* Control row */}
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : control.id)
                        }
                        className="w-full text-left p-4 flex items-center gap-3 hover:bg-secondary/15 transition-all"
                      >
                        <span className="text-[11px] font-mono bg-secondary/40 px-2 py-0.5 rounded font-medium shrink-0">
                          {control.criteriaId}
                        </span>
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">
                          {control.title}
                        </span>
                        {control.evidenceCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/50 shrink-0">
                            <Link2 className="h-3 w-3" />
                            {control.evidenceCount}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${cfg.className}`}
                        >
                          {cfg.label}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        )}
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-border/40 p-5 bg-secondary/10 space-y-5">
                          {/* Description */}
                          <div>
                            <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                              Description
                            </label>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {control.description}
                            </p>
                          </div>

                          {/* Auditor guidance */}
                          {control.auditorGuidance && (
                            <div>
                              <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                                What Auditors Want
                              </label>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {control.auditorGuidance}
                              </p>
                            </div>
                          )}

                          {/* Evidence guidance */}
                          {control.evidenceGuidance && (
                            <div>
                              <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                                Evidence Guidance
                              </label>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {control.evidenceGuidance}
                              </p>
                            </div>
                          )}

                          {/* Status + Owner + Evidence row */}
                          <div className="flex items-start gap-4 flex-wrap">
                            {/* Status dropdown */}
                            <div className="min-w-[180px]">
                              <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium block mb-1.5">
                                Implementation Status
                              </label>
                              <div className="relative">
                                <select
                                  value={control.implementationStatus}
                                  onChange={(e) =>
                                    updateControl(control.id, {
                                      implementationStatus: e.target.value,
                                    })
                                  }
                                  disabled={isUpdating}
                                  className="appearance-none w-full pl-3 pr-8 py-2 border border-border/60 rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50"
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="ready">Ready</option>
                                  <option value="verified">Verified</option>
                                </select>
                                {isUpdating ? (
                                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 animate-spin" />
                                ) : (
                                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                                )}
                              </div>
                            </div>

                            {/* Owner */}
                            <div>
                              <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium block mb-1.5">
                                Owner
                              </label>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4 text-muted-foreground/40" />
                                {control.ownerName || 'Unassigned'}
                              </div>
                            </div>

                            {/* Evidence count */}
                            <div>
                              <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium block mb-1.5">
                                Linked Evidence
                              </label>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4 text-muted-foreground/40" />
                                {control.evidenceCount} item{control.evidenceCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium block mb-1.5">
                              Notes
                            </label>
                            <textarea
                              defaultValue={control.notes}
                              placeholder="Add implementation notes..."
                              rows={3}
                              onBlur={(e) => {
                                if (e.target.value !== control.notes) {
                                  updateControl(control.id, {
                                    notes: e.target.value,
                                  });
                                }
                              }}
                              className="w-full px-3 py-2 border border-border/60 rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
