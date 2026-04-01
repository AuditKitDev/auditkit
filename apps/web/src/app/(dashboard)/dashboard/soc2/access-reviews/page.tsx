'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Users,
  UserCheck,
  UserX,
  Timer,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

interface AccessReview {
  id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  completedAt?: string | null;
  entries: AccessReviewEntry[];
  createdAt: string;
}

interface AccessReviewEntry {
  id: string;
  userEmail: string;
  userName: string;
  system: string;
  role: string;
  lastActive?: string | null;
  decision: 'pending' | 'approve' | 'revoke';
  notes?: string | null;
}

const statusBadge: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border border-border',
  in_progress: 'bg-warning/10 text-warning border border-warning/20',
  completed: 'bg-success/10 text-success border border-success/20',
};

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const decisionBadge: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  approve: 'bg-success/10 text-success',
  revoke: 'bg-destructive/10 text-destructive',
};

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPastDue(date: string) {
  return new Date(date) < new Date();
}

function SkeletonCard() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-5 w-20 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="skeleton h-3 w-40" />
            <div className="skeleton h-3 w-28" />
          </div>
          <div className="skeleton h-2 w-full rounded-full mt-2" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: number; color: string }) {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground/60">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AccessReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<AccessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [updatingEntry, setUpdatingEntry] = useState<string | null>(null);
  const [completingReview, setCompletingReview] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);

  // Create form state
  const [createTitle, setCreateTitle] = useState('');
  const [createPeriodStart, setCreatePeriodStart] = useState('');
  const [createPeriodEnd, setCreatePeriodEnd] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');

  // Add entry form state
  const [entryEmail, setEntryEmail] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entrySystem, setEntrySystem] = useState('');
  const [entryRole, setEntryRole] = useState('');

  const fetchProjectId = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: { id: string; name: string }[] }>('/dashboard/projects');
      const projects = res.data ?? [];
      if (projects.length > 0) {
        setProjectId(projects[0].id);
        return projects[0].id;
      }
    } catch {
      // handled by caller
    }
    return null;
  }, []);

  const fetchReviews = useCallback(async (pid?: string) => {
    const id = pid || projectId;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: AccessReview[] }>(`/dashboard/soc2/access-reviews?project_id=${id}`);
      const data = Array.isArray(res) ? res : res.data ?? [];
      setReviews(data);
    } catch {
      setError('Failed to load access reviews');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchReviewDetail = useCallback(async (reviewId: string) => {
    setDetailLoading(reviewId);
    try {
      const res = await apiFetch<{ data: AccessReview }>(`/dashboard/soc2/access-reviews/${reviewId}`);
      const detail = (res as { data?: AccessReview }).data ?? (res as unknown as AccessReview);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? detail : r)));
    } catch {
      toast('error', 'Failed to load review details');
    } finally {
      setDetailLoading(null);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjectId().then((pid) => {
      if (pid) fetchReviews(pid);
      else setLoading(false);
    });
  }, [fetchProjectId, fetchReviews]);

  async function handleCreate() {
    if (!projectId || !createTitle.trim() || !createPeriodStart || !createPeriodEnd || !createDueDate) return;
    setCreating(true);
    try {
      const res = await apiFetch<{ data: AccessReview }>('/dashboard/soc2/access-reviews', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          title: createTitle,
          periodStart: createPeriodStart,
          periodEnd: createPeriodEnd,
          dueDate: createDueDate,
        }),
      });
      const created = (res as { data?: AccessReview }).data ?? (res as unknown as AccessReview);
      setReviews((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setCreateTitle('');
      setCreatePeriodStart('');
      setCreatePeriodEnd('');
      setCreateDueDate('');
      toast('success', 'Access review created');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddEntry(reviewId: string) {
    if (!entryEmail.trim() || !entryName.trim() || !entrySystem.trim() || !entryRole.trim()) return;
    setAddingEntry(true);
    try {
      await apiFetch(`/dashboard/soc2/access-reviews/${reviewId}/entries`, {
        method: 'POST',
        body: JSON.stringify({
          userEmail: entryEmail,
          userName: entryName,
          system: entrySystem,
          role: entryRole,
        }),
      });
      setEntryEmail('');
      setEntryName('');
      setEntrySystem('');
      setEntryRole('');
      setShowAddEntry(false);
      await fetchReviewDetail(reviewId);
      toast('success', 'Entry added');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setAddingEntry(false);
    }
  }

  async function handleUpdateEntry(reviewId: string, entryId: string, decision: string, notes?: string) {
    setUpdatingEntry(entryId);
    try {
      await apiFetch(`/dashboard/soc2/access-reviews/${reviewId}/entries/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify({ decision, notes }),
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                entries: r.entries.map((e) =>
                  e.id === entryId ? { ...e, decision: decision as 'pending' | 'approve' | 'revoke', notes: notes ?? e.notes } : e
                ),
              }
            : r
        )
      );
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
      setUpdatingEntry(null);
    }
  }

  async function handleApproveAll(reviewId: string) {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;
    setApprovingAll(true);
    try {
      const pending = review.entries.filter((e) => e.decision === 'pending');
      await Promise.all(
        pending.map((e) =>
          apiFetch(`/dashboard/soc2/access-reviews/${reviewId}/entries/${e.id}`, {
            method: 'PUT',
            body: JSON.stringify({ decision: 'approve' }),
          })
        )
      );
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, entries: r.entries.map((e) => (e.decision === 'pending' ? { ...e, decision: 'approve' } : e)) }
            : r
        )
      );
      toast('success', `Approved ${pending.length} pending entries`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to approve all');
    } finally {
      setApprovingAll(false);
    }
  }

  async function handleCompleteReview(reviewId: string) {
    setCompletingReview(true);
    try {
      await apiFetch(`/dashboard/soc2/access-reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: 'completed', completedAt: new Date().toISOString() } : r))
      );
      toast('success', 'Review marked as complete');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to complete review');
    } finally {
      setCompletingReview(false);
    }
  }

  function toggleExpand(reviewId: string) {
    if (expandedReview === reviewId) {
      setExpandedReview(null);
    } else {
      setExpandedReview(reviewId);
      const review = reviews.find((r) => r.id === reviewId);
      if (!review?.entries?.length) {
        fetchReviewDetail(reviewId);
      }
    }
  }

  // Stats
  const totalReviews = reviews.length;
  const inProgress = reviews.filter((r) => r.status === 'in_progress').length;
  const completed = reviews.filter((r) => r.status === 'completed').length;
  const overdue = reviews.filter((r) => r.status !== 'completed' && isPastDue(r.dueDate)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Access Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quarterly access review campaigns for SOC 2 compliance.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Review
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={ClipboardCheck} label="Total reviews" value={totalReviews} color="bg-primary/10 text-primary" />
          <StatCard icon={Clock} label="In progress" value={inProgress} color="bg-warning/10 text-warning" />
          <StatCard icon={CheckCircle2} label="Completed" value={completed} color="bg-success/10 text-success" />
          <StatCard icon={AlertTriangle} label="Overdue" value={overdue} color="bg-destructive/10 text-destructive" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Review List */}
      <div className="space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : reviews.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No access reviews yet. Create one to get started.
            </p>
          </div>
        ) : (
          reviews.map((review) => {
            const isExpanded = expandedReview === review.id;
            const entries = review.entries ?? [];
            const approved = entries.filter((e) => e.decision === 'approve').length;
            const revoked = entries.filter((e) => e.decision === 'revoke').length;
            const pending = entries.filter((e) => e.decision === 'pending').length;
            const decided = approved + revoked;
            const progress = entries.length > 0 ? Math.round((decided / entries.length) * 100) : 0;
            const pastDue = review.status !== 'completed' && isPastDue(review.dueDate);

            return (
              <div key={review.id} className="border border-border/60 rounded-xl bg-card overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(review.id)}
                  className="w-full p-5 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{review.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[review.status]}`}>
                          {statusLabel[review.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground/60">
                        <span>Period: {formatShortDate(review.periodStart)} — {formatShortDate(review.periodEnd)}</span>
                        <span className={pastDue ? 'text-destructive font-medium' : ''}>
                          {pastDue ? 'Overdue — ' : 'Due: '}{formatShortDate(review.dueDate)}
                        </span>
                      </div>
                      {entries.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground/60 mt-1.5">
                            {entries.length} entries — {approved} approved, {revoked} revoked, {pending} pending
                          </p>
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border/60 p-5">
                    {detailLoading === review.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                          <div className="flex items-center gap-2 text-sm">
                            <UserCheck className="h-4 w-4 text-success" />
                            <span className="text-muted-foreground">Approved:</span>
                            <span className="font-semibold">{approved}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <UserX className="h-4 w-4 text-destructive" />
                            <span className="text-muted-foreground">Revoked:</span>
                            <span className="font-semibold">{revoked}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Timer className="h-4 w-4 text-warning" />
                            <span className="text-muted-foreground">Pending:</span>
                            <span className="font-semibold">{pending}</span>
                          </div>
                        </div>

                        {/* Actions bar */}
                        <div className="flex items-center gap-2 mb-4">
                          <button
                            onClick={() => setShowAddEntry(true)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border/60 rounded-lg hover:bg-secondary transition-all font-medium"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Entry
                          </button>
                          {pending > 0 && review.status !== 'completed' && (
                            <button
                              onClick={() => handleApproveAll(review.id)}
                              disabled={approvingAll}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg hover:bg-success/20 transition-all font-medium disabled:opacity-50"
                            >
                              {approvingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Approve All
                            </button>
                          )}
                          {review.status !== 'completed' && (
                            <button
                              onClick={() => handleCompleteReview(review.id)}
                              disabled={completingReview}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50 ml-auto"
                            >
                              {completingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Mark Complete
                            </button>
                          )}
                        </div>

                        {/* Add entry form */}
                        {showAddEntry && (
                          <div className="border border-border/60 rounded-xl bg-secondary/30 p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold">Add Entry</h4>
                              <button onClick={() => setShowAddEntry(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="email"
                                placeholder="User email"
                                value={entryEmail}
                                onChange={(e) => setEntryEmail(e.target.value)}
                                className="px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                              />
                              <input
                                type="text"
                                placeholder="User name"
                                value={entryName}
                                onChange={(e) => setEntryName(e.target.value)}
                                className="px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                              />
                              <input
                                type="text"
                                placeholder="System (e.g. GitHub)"
                                value={entrySystem}
                                onChange={(e) => setEntrySystem(e.target.value)}
                                className="px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                              />
                              <input
                                type="text"
                                placeholder="Role (e.g. Admin)"
                                value={entryRole}
                                onChange={(e) => setEntryRole(e.target.value)}
                                className="px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                              />
                            </div>
                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => handleAddEntry(review.id)}
                                disabled={addingEntry || !entryEmail.trim() || !entryName.trim() || !entrySystem.trim() || !entryRole.trim()}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                              >
                                {addingEntry && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Entries table */}
                        {entries.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/60 text-left">
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">Email</th>
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">Name</th>
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">System</th>
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">Role</th>
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">Last Active</th>
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">Decision</th>
                                  <th className="pb-2 font-medium text-muted-foreground/60 text-xs">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((entry) => (
                                  <tr key={entry.id} className="border-b border-border/30 last:border-0">
                                    <td className="py-2.5 pr-3 text-xs truncate max-w-[180px]">{entry.userEmail}</td>
                                    <td className="py-2.5 pr-3 text-xs">{entry.userName}</td>
                                    <td className="py-2.5 pr-3 text-xs">{entry.system}</td>
                                    <td className="py-2.5 pr-3 text-xs">{entry.role}</td>
                                    <td className="py-2.5 pr-3 text-xs text-muted-foreground/60">
                                      {entry.lastActive ? formatShortDate(entry.lastActive) : '—'}
                                    </td>
                                    <td className="py-2.5 pr-3">
                                      {review.status === 'completed' ? (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${decisionBadge[entry.decision]}`}>
                                          {entry.decision}
                                        </span>
                                      ) : (
                                        <select
                                          value={entry.decision}
                                          onChange={(e) => handleUpdateEntry(review.id, entry.id, e.target.value)}
                                          disabled={updatingEntry === entry.id}
                                          className="text-xs px-2 py-1 bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="approve">Approve</option>
                                          <option value="revoke">Revoke</option>
                                        </select>
                                      )}
                                    </td>
                                    <td className="py-2.5">
                                      {review.status === 'completed' ? (
                                        <span className="text-xs text-muted-foreground/60">{entry.notes || '—'}</span>
                                      ) : (
                                        <input
                                          type="text"
                                          placeholder="Add note..."
                                          defaultValue={entry.notes ?? ''}
                                          onBlur={(e) => {
                                            if (e.target.value !== (entry.notes ?? '')) {
                                              handleUpdateEntry(review.id, entry.id, entry.decision, e.target.value);
                                            }
                                          }}
                                          className="text-xs px-2 py-1 bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 w-full max-w-[160px] placeholder:text-muted-foreground/40"
                                        />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-muted-foreground/60">
                            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                            No entries yet. Add users to review.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Review Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New Access Review</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Title</label>
                <input
                  type="text"
                  placeholder="Q1 2026 Access Review"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Period Start</label>
                  <input
                    type="date"
                    value={createPeriodStart}
                    onChange={(e) => setCreatePeriodStart(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Period End</label>
                  <input
                    type="date"
                    value={createPeriodEnd}
                    onChange={(e) => setCreatePeriodEnd(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  value={createDueDate}
                  onChange={(e) => setCreateDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createTitle.trim() || !createPeriodStart || !createPeriodEnd || !createDueDate}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
