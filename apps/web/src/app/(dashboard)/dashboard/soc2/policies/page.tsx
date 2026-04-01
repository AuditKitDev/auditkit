'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Shield,
  Check,
  Clock,
  Archive,

  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
  Users,
  History,
  Search,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatRelative, formatDate } from '@/lib/utils';
import { useToast } from '@/components/toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
}

interface Policy {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  category: string;
  status: 'draft' | 'active' | 'archived';
  version: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  nextReviewAt: string | null;
  acknowledgmentCount: number;
  totalMembers: number;
  versions?: PolicyVersion[];
}

interface PolicyVersion {
  version: number;
  updatedAt: string;
  changedBy: string;
}

interface Acknowledgment {
  id: string;
  userId: string;
  userName: string;
  acknowledgedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Policy template data                                               */
/* ------------------------------------------------------------------ */

// Import real policy templates with full content from shared package
import { POLICY_TEMPLATES as SHARED_TEMPLATES } from '@auditkit/shared';

const categoryMap: Record<string, string> = {
  security: 'Security',
  access: 'Security',
  'change-mgmt': 'Operations',
  incident: 'Security',
  vendor: 'Governance',
  hr: 'Operations',
  data: 'Privacy',
  bcp: 'Availability',
  privacy: 'Privacy',
};

const POLICY_TEMPLATES = SHARED_TEMPLATES.map((t) => ({
  ...t,
  categoryLabel: categoryMap[t.category] || t.category,
}));

const categoryColors: Record<string, string> = {
  Security: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Operations: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Governance: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  Privacy: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Availability: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-warning/10 text-warning' },
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  archived: { label: 'Archived', className: 'bg-destructive/10 text-destructive' },
};

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function StatSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="skeleton h-3 w-20 mb-2" />
      <div className="skeleton h-7 w-12" />
    </div>
  );
}

function PolicySkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-48" />
        <div className="skeleton h-5 w-16 rounded ml-auto" />
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-32" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PoliciesPage() {
  const { toast } = useToast();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [creatingSlug, setCreatingSlug] = useState<string | null>(null);

  // Detail / expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acknowledgments, setAcknowledgments] = useState<Record<string, Acknowledgment[]>>({});
  const [loadingAcks, setLoadingAcks] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  // Actions
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

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

  /* ---- Load policies ---- */
  const fetchPolicies = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Policy[] }>(
        `/dashboard/soc2/policies?project_id=${projectId}`,
      );
      const data = Array.isArray(res) ? res : res.data ?? [];
      setPolicies(data);
    } catch {
      setError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  /* ---- Actions ---- */
  async function createFromTemplate(template: typeof POLICY_TEMPLATES[number]) {
    if (!projectId) return;
    setCreatingSlug(template.slug);
    try {
      const res = await apiFetch<{ data: Policy }>('/dashboard/soc2/policies', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          title: template.title,
          slug: template.slug,
          category: template.category,
          content: template.content,
        }),
      });
      const created = (res as { data?: Policy }).data ?? (res as unknown as Policy);
      setPolicies((prev) => [created, ...prev]);
      setShowTemplateModal(false);
      setTemplateSearch('');
      toast('success', `Policy "${template.title}" created`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setCreatingSlug(null);
    }
  }

  async function approvePolicy(id: string) {
    setApprovingId(id);
    try {
      await apiFetch(`/dashboard/soc2/policies/${id}/approve`, {
        method: 'POST',
      });
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'active' as const } : p)),
      );
      toast('success', 'Policy approved and activated');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to approve policy');
    } finally {
      setApprovingId(null);
    }
  }

  async function archivePolicy(id: string) {
    setArchivingId(id);
    try {
      await apiFetch(`/dashboard/soc2/policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' }),
      });
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'archived' as const } : p)),
      );
      toast('success', 'Policy archived');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to archive policy');
    } finally {
      setArchivingId(null);
    }
  }

  async function acknowledgePolicy(id: string) {
    setAcknowledging(id);
    try {
      await apiFetch(`/dashboard/soc2/policies/${id}/acknowledge`, {
        method: 'POST',
      });
      toast('success', 'Policy acknowledged');
      // Refresh acknowledgments
      loadAcknowledgments(id);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to acknowledge policy');
    } finally {
      setAcknowledging(null);
    }
  }

  async function loadAcknowledgments(id: string) {
    setLoadingAcks(id);
    try {
      const res = await apiFetch<{ data: Acknowledgment[] }>(
        `/dashboard/soc2/policies/${id}/acknowledgments`,
      );
      const data = Array.isArray(res) ? res : res.data ?? [];
      setAcknowledgments((prev) => ({ ...prev, [id]: data }));
    } catch {
      // Non-critical
    } finally {
      setLoadingAcks(null);
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!acknowledgments[id]) {
        loadAcknowledgments(id);
      }
    }
  }

  /* ---- Derived ---- */
  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.status === 'active').length,
    draft: policies.filter((p) => p.status === 'draft').length,
    needsReview: policies.filter(
      (p) => p.nextReviewAt && new Date(p.nextReviewAt) <= new Date(),
    ).length,
  };

  const filteredTemplates = POLICY_TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.categoryLabel.toLowerCase().includes(templateSearch.toLowerCase()),
  );

  function isOverdue(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) <= new Date();
  }

  /* ---- Render ---- */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage security and compliance policies for your organization.
          </p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Create from Template
        </button>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="border border-border/60 rounded-xl bg-card p-5">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">Total</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="border border-border/60 rounded-xl bg-card p-5">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">Active</p>
              <p className="text-2xl font-bold mt-1 text-success">{stats.active}</p>
            </div>
            <div className="border border-border/60 rounded-xl bg-card p-5">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">Draft</p>
              <p className="text-2xl font-bold mt-1 text-warning">{stats.draft}</p>
            </div>
            <div className="border border-border/60 rounded-xl bg-card p-5">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">Needs Review</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{stats.needsReview}</p>
            </div>
          </>
        )}
      </div>

      {/* Policy List */}
      <div className="space-y-3">
        {loading ? (
          <>
            <PolicySkeleton />
            <PolicySkeleton />
            <PolicySkeleton />
          </>
        ) : policies.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10">
            <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No policies yet. Create one from a template to get started.
            </p>
          </div>
        ) : (
          policies.map((policy) => {
            const isExpanded = expandedId === policy.id;
            const statusCfg = statusConfig[policy.status] || statusConfig.draft;
            const catColor = categoryColors[policy.category] || categoryColors.Security;
            const overdue = isOverdue(policy.nextReviewAt);

            return (
              <div
                key={policy.id}
                className="border border-border/60 rounded-xl bg-card shadow-lg shadow-black/10 overflow-hidden"
              >
                {/* Policy row */}
                <button
                  onClick={() => toggleExpand(policy.id)}
                  className="w-full text-left p-5 flex items-start gap-4 hover:bg-secondary/15 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{policy.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${catColor}`}>
                        {policy.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/60 flex-wrap">
                      <span className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        v{policy.version}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {formatRelative(policy.updatedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {policy.acknowledgmentCount}/{policy.totalMembers} acknowledged
                      </span>
                      {policy.nextReviewAt && (
                        <span
                          className={`flex items-center gap-1 ${
                            overdue ? 'text-destructive font-medium' : ''
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {overdue ? 'Overdue' : `Review ${formatDate(policy.nextReviewAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {policy.status === 'draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          approvePolicy(policy.id);
                        }}
                        disabled={approvingId === policy.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-success/10 text-success rounded-lg hover:bg-success/20 transition-all disabled:opacity-50"
                      >
                        {approvingId === policy.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Approve
                      </button>
                    )}
                    {policy.status !== 'archived' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archivePolicy(policy.id);
                        }}
                        disabled={archivingId === policy.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary transition-all disabled:opacity-50"
                      >
                        {archivingId === policy.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        Archive
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border/40 p-5 bg-secondary/10">
                    {/* Content preview */}
                    {policy.content && (
                      <div className="mb-5">
                        <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                          Content Preview
                        </label>
                        <div className="mt-2 text-sm text-muted-foreground bg-card border border-border/30 rounded-lg p-4 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                          {policy.content}
                        </div>
                      </div>
                    )}

                    {/* Version history */}
                    {policy.versions && policy.versions.length > 0 && (
                      <div className="mb-5">
                        <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-2 block">
                          Version History
                        </label>
                        <div className="space-y-1.5">
                          {policy.versions.map((v) => (
                            <div
                              key={v.version}
                              className="flex items-center gap-3 text-xs text-muted-foreground/60"
                            >
                              <span className="font-mono bg-secondary/30 px-1.5 py-0.5 rounded">
                                v{v.version}
                              </span>
                              <span>{formatRelative(v.updatedAt)}</span>
                              <span>by {v.changedBy}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acknowledge */}
                    {policy.status === 'active' && (
                      <div className="mb-5">
                        <button
                          onClick={() => acknowledgePolicy(policy.id)}
                          disabled={acknowledging === policy.id}
                          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {acknowledging === policy.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Acknowledge Policy
                        </button>
                      </div>
                    )}

                    {/* Acknowledgments list */}
                    <div>
                      <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-2 block">
                        Acknowledgments
                      </label>
                      {loadingAcks === policy.id ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      ) : (acknowledgments[policy.id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground/50">
                          No acknowledgments yet.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {(acknowledgments[policy.id] ?? []).map((ack) => (
                            <div
                              key={ack.id}
                              className="flex items-center gap-3 bg-card border border-border/30 rounded-lg p-2.5"
                            >
                              <Check className="h-3.5 w-3.5 text-success shrink-0" />
                              <span className="text-sm font-medium">{ack.userName}</span>
                              <span className="text-xs text-muted-foreground/50 ml-auto">
                                {formatRelative(ack.acknowledgedAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowTemplateModal(false);
              setTemplateSearch('');
            }}
          />
          <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div>
                <h2 className="text-lg font-semibold">Create from Template</h2>
                <p className="text-sm text-muted-foreground/60 mt-0.5">
                  Choose a policy template to get started quickly.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateSearch('');
                }}
                className="p-2 hover:bg-secondary rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-border/60 rounded-xl bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Template grid */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((template) => {
                  const catColor =
                    categoryColors[template.categoryLabel] || categoryColors.Security;
                  const isCreating = creatingSlug === template.slug;
                  const alreadyExists = policies.some(
                    (p) => p.slug === template.slug,
                  );

                  return (
                    <button
                      key={template.slug}
                      onClick={() => createFromTemplate(template)}
                      disabled={isCreating || alreadyExists}
                      className="text-left border border-border/60 rounded-xl bg-card p-4 card-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Shield className="h-4 w-4 text-muted-foreground/40" />
                        <h3 className="text-sm font-medium">{template.title}</h3>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium inline-block mb-2 ${catColor}`}
                      >
                        {template.categoryLabel}
                      </span>
                      <p className="text-xs text-muted-foreground/60 leading-relaxed">
                        {template.description}
                      </p>
                      {isCreating && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Creating...
                        </div>
                      )}
                      {alreadyExists && (
                        <p className="text-[10px] text-muted-foreground/40 mt-2">
                          Already created
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              {filteredTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground/50 text-center py-8">
                  No templates match your search.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
