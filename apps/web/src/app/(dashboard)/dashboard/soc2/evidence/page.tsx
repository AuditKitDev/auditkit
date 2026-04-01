'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Search,
  FileCheck,
  FileText,
  Image,
  Link2,
  Table2,
  Trash2,
  Eye,
  X,
  Loader2,
  AlertTriangle,
  Tag,
  RefreshCw,
  Plus,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { useToast } from '@/components/toast';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
}

interface EvidenceItem {
  id: string;
  title: string;
  description: string | null;
  type: 'screenshot' | 'document' | 'csv' | 'link';
  fileUrl: string | null;
  externalUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  tags?: EvidenceTag[];
}

interface EvidenceTag {
  id: string;
  framework: string;
  criteriaId: string;
  controlId?: string | null;
}

interface EvidenceStats {
  total: number;
  byType: Record<string, number>;
  byFramework: Record<string, number>;
  gaps: { id: string; criteriaId: string; title: string; framework: string }[];
}

interface EvidenceListResponse {
  data: EvidenceItem[];
  pagination?: {
    has_more: boolean;
    cursor: string | null;
    total?: number;
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const typeConfig: Record<string, { icon: typeof FileText; label: string; color: string; bg: string }> = {
  screenshot: { icon: Image, label: 'Screenshot', color: 'text-blue-400', bg: 'bg-blue-500/10 text-blue-400' },
  document: { icon: FileText, label: 'Document', color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400' },
  csv: { icon: Table2, label: 'CSV', color: 'text-amber-400', bg: 'bg-amber-500/10 text-amber-400' },
  link: { icon: Link2, label: 'Link', color: 'text-violet-400', bg: 'bg-violet-500/10 text-violet-400' },
};

const typeFilters = [
  { value: '', label: 'All Types' },
  { value: 'screenshot', label: 'Screenshots' },
  { value: 'document', label: 'Documents' },
  { value: 'csv', label: 'CSV Files' },
  { value: 'link', label: 'Links' },
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function EvidenceCardSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton h-5 w-48 mb-2" />
          <div className="skeleton h-3 w-64 mb-3" />
          <div className="flex gap-2">
            <div className="skeleton h-5 w-14 rounded" />
            <div className="skeleton h-5 w-14 rounded" />
          </div>
        </div>
        <div className="skeleton h-4 w-20" />
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-4">
      <div className="skeleton h-3 w-20 mb-2" />
      <div className="skeleton h-7 w-12" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload Modal                                                        */
/* ------------------------------------------------------------------ */

function UploadModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (item: EvidenceItem) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'document' as EvidenceItem['type'],
    fileUrl: '',
    externalUrl: '',
    fileName: '',
    fileSize: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast('warning', 'Title is required');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
      };
      if (form.fileUrl) body.fileUrl = form.fileUrl;
      if (form.externalUrl) body.externalUrl = form.externalUrl;
      if (form.fileName) body.fileName = form.fileName;
      if (form.fileSize) body.fileSize = parseInt(form.fileSize, 10) || null;

      const res = await apiFetch<{ data: EvidenceItem }>('/dashboard/soc2/evidence', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const created = (res as { data?: EvidenceItem }).data ?? (res as unknown as EvidenceItem);
      toast('success', 'Evidence uploaded successfully');
      onCreated(created);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to create evidence');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 border border-border/60 rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <h3 className="font-semibold text-lg">Upload Evidence</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Access control policy screenshot"
              className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              placeholder="Brief description of what this evidence demonstrates..."
              className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="document">Document</option>
              <option value="screenshot">Screenshot</option>
              <option value="csv">CSV</option>
              <option value="link">Link</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">File URL</label>
              <input
                type="url"
                value={form.fileUrl}
                onChange={(e) => update('fileUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">External URL</label>
              <input
                type="url"
                value={form.externalUrl}
                onChange={(e) => update('externalUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">File Name</label>
              <input
                type="text"
                value={form.fileName}
                onChange={(e) => update('fileName', e.target.value)}
                placeholder="report.pdf"
                className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">File Size (bytes)</label>
              <input
                type="number"
                value={form.fileSize}
                onChange={(e) => update('fileSize', e.target.value)}
                placeholder="1024"
                className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {saving ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tag Modal                                                           */
/* ------------------------------------------------------------------ */

function TagModal({
  evidence,
  onClose,
  onTagged,
}: {
  evidence: EvidenceItem;
  onClose: () => void;
  onTagged: (tag: EvidenceTag) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [framework, setFramework] = useState('soc2');
  const [criteriaId, setCriteriaId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!criteriaId.trim()) {
      toast('warning', 'Criteria ID is required (e.g., CC6.1)');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ data: EvidenceTag }>(`/dashboard/soc2/evidence/${evidence.id}/tags`, {
        method: 'POST',
        body: JSON.stringify({ framework, criteriaId: criteriaId.trim() }),
      });
      const tag = (res as { data?: EvidenceTag }).data ?? (res as unknown as EvidenceTag);
      toast('success', `Tagged with ${criteriaId}`);
      onTagged(tag);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 border border-border/60 rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div>
            <h3 className="font-semibold text-sm">Tag Evidence</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{evidence.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Framework</label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="soc2">SOC 2</option>
              <option value="iso27001">ISO 27001</option>
              <option value="hipaa">HIPAA</option>
              <option value="gdpr">GDPR</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Criteria ID *</label>
            <input
              type="text"
              value={criteriaId}
              onChange={(e) => setCriteriaId(e.target.value)}
              placeholder="e.g. CC6.1, CC7.2, A1.1"
              className="w-full px-3 py-2.5 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Enter the control criteria this evidence supports.
            </p>
          </div>

          {/* Existing tags */}
          {evidence.tags && evidence.tags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {evidence.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                  >
                    {tag.criteriaId}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Add Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function EvidenceVaultPage() {
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [tagTarget, setTagTarget] = useState<EvidenceItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ data: Project[] }>('/dashboard/projects');
        const list = Array.isArray(res) ? res : res.data ?? [];
        setProjects(list);
        if (list.length > 0) {
          setProjectId(list[0].id);
        }
      } catch {
        setError('Failed to load projects');
        setLoading(false);
      }
    })();
  }, []);

  // Fetch evidence + stats
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ project_id: projectId });
      if (typeFilter) params.set('type', typeFilter);

      const [listRes, statsRes] = await Promise.all([
        apiFetch<EvidenceListResponse>(`/dashboard/soc2/evidence?${params.toString()}`),
        apiFetch<{ data: EvidenceStats }>(`/dashboard/soc2/evidence/stats?project_id=${projectId}`),
      ]);
      const items = Array.isArray(listRes) ? listRes : listRes.data ?? [];
      setEvidence(items);
      const statsObj = (statsRes as { data?: EvidenceStats }).data ?? (statsRes as unknown as EvidenceStats);
      setStats(statsObj);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load evidence';
      setError(msg);
      toast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, typeFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Delete evidence
  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this evidence?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/dashboard/soc2/evidence/${id}`, { method: 'DELETE' });
      setEvidence((prev) => prev.filter((e) => e.id !== id));
      if (stats) {
        setStats({ ...stats, total: Math.max(0, stats.total - 1) });
      }
      toast('success', 'Evidence deleted');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete evidence');
    } finally {
      setDeleting(null);
    }
  }

  // Client-side search filter
  const filtered = searchQuery
    ? evidence.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : evidence;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, organize, and tag evidence for SOC 2 compliance controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value)}
              className="text-sm border border-border/60 rounded-xl bg-card px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Upload Evidence
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : stats ? (
          <>
            <div className="border border-border/60 rounded-xl bg-card p-4 card-hover">
              <p className="text-xs text-muted-foreground font-medium mb-1">Total Evidence</p>
              <p className="text-2xl font-bold tracking-tight">{stats.total}</p>
            </div>
            <div className="border border-border/60 rounded-xl bg-card p-4 card-hover">
              <p className="text-xs text-muted-foreground font-medium mb-1">By Type</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(stats.byType).map(([type, count]) => {
                  const cfg = typeConfig[type];
                  return (
                    <span key={type} className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${cfg?.bg || 'bg-primary/10 text-primary'}`}>
                      {cfg?.label || type}: {count}
                    </span>
                  );
                })}
                {Object.keys(stats.byType).length === 0 && (
                  <span className="text-xs text-muted-foreground/60">None yet</span>
                )}
              </div>
            </div>
            <div className="border border-border/60 rounded-xl bg-card p-4 card-hover">
              <p className="text-xs text-muted-foreground font-medium mb-1">Evidence Gaps</p>
              <p className="text-2xl font-bold tracking-tight text-destructive">{stats.gaps.length}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">controls missing evidence</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence by title or description..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-border/60 rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground/50" />
          {typeFilters.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTypeFilter(tf.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                typeFilter === tf.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence list */}
      <div className="space-y-3">
        {loading ? (
          <>
            <EvidenceCardSkeleton />
            <EvidenceCardSkeleton />
            <EvidenceCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
            <FileCheck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || typeFilter
                ? 'No evidence matches your filters.'
                : 'No evidence uploaded yet. Click "Upload Evidence" to get started.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const cfg = typeConfig[item.type] || typeConfig.document;
            const TypeIcon = cfg.icon;
            return (
              <div
                key={item.id}
                className="border border-border/60 rounded-xl bg-card p-5 card-hover"
              >
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg.split(' ')[0]}/20`}>
                    <TypeIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/50">
                      <span>{formatRelative(item.createdAt)}</span>
                      {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                      {item.fileName && <span className="truncate max-w-[200px]">{item.fileName}</span>}
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                          >
                            {tag.criteriaId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(item.fileUrl || item.externalUrl) && (
                      <a
                        href={item.fileUrl || item.externalUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setTagTarget(item)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title="Tag controls"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload modal */}
      {showUpload && projectId && (
        <UploadModal
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onCreated={(item) => {
            setEvidence((prev) => [item, ...prev]);
            if (stats) setStats({ ...stats, total: stats.total + 1 });
            setShowUpload(false);
          }}
        />
      )}

      {/* Tag modal */}
      {tagTarget && (
        <TagModal
          evidence={tagTarget}
          onClose={() => setTagTarget(null)}
          onTagged={(tag) => {
            setEvidence((prev) =>
              prev.map((e) =>
                e.id === tagTarget.id
                  ? { ...e, tags: [...(e.tags || []), tag] }
                  : e
              )
            );
            setTagTarget(null);
          }}
        />
      )}
    </div>
  );
}
