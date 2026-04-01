'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Building2,
  ShieldAlert,
  FileCheck,
  Clock,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Edit2,
  Globe,
  Mail,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

interface VendorDocument {
  id: string;
  type: 'soc2_report' | 'dpa' | 'baa' | 'contract' | 'assessment';
  title: string;
  fileUrl: string;
  expiresAt?: string | null;
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  dataAccessLevel: string;
  status: 'active' | 'inactive' | 'under_review';
  website?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  nextReviewDate?: string | null;
  documents: VendorDocument[];
  createdAt: string;
}

const criticalityBadge: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border border-destructive/20',
  high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  medium: 'bg-warning/10 text-warning border border-warning/20',
  low: 'bg-success/10 text-success border border-success/20',
};

const statusBadge: Record<string, string> = {
  active: 'bg-success/10 text-success border border-success/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
  under_review: 'bg-warning/10 text-warning border border-warning/20',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_review: 'Under Review',
};

const docTypeLabel: Record<string, string> = {
  soc2_report: 'SOC 2 Report',
  dpa: 'DPA',
  baa: 'BAA',
  contract: 'Contract',
  assessment: 'Assessment',
};

const categories = [
  'Cloud Infrastructure',
  'SaaS',
  'Payment Processing',
  'Email & Communications',
  'Analytics',
  'Security',
  'HR & Payroll',
  'Legal',
  'Other',
];

const criticalityOptions = ['critical', 'high', 'medium', 'low'];
const dataAccessLevels = ['None', 'Metadata Only', 'Limited PII', 'Full PII', 'Financial Data', 'PHI'];
const docTypes = ['soc2_report', 'dpa', 'baa', 'contract', 'assessment'] as const;

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpiringSoon(date: string) {
  const d = new Date(date);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return d.getTime() - now.getTime() < thirtyDays && d.getTime() > now.getTime();
}

function isExpired(date: string) {
  return new Date(date) < new Date();
}

function SkeletonCard() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-36" />
            <div className="skeleton h-5 w-16 rounded" />
            <div className="skeleton h-5 w-16 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Building2; label: string; value: number; color: string }) {
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

export default function VendorsPage() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddDoc, setShowAddDoc] = useState<string | null>(null);
  const [addingDoc, setAddingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Vendor form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]);
  const [formCriticality, setFormCriticality] = useState('medium');
  const [formDataAccess, setFormDataAccess] = useState(dataAccessLevels[0]);
  const [formWebsite, setFormWebsite] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Document form state
  const [docType, setDocType] = useState<(typeof docTypes)[number]>('soc2_report');
  const [docTitle, setDocTitle] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docExpiresAt, setDocExpiresAt] = useState('');

  function resetForm() {
    setFormName('');
    setFormCategory(categories[0]);
    setFormCriticality('medium');
    setFormDataAccess(dataAccessLevels[0]);
    setFormWebsite('');
    setFormContactEmail('');
    setFormNotes('');
  }

  function populateForm(vendor: Vendor) {
    setFormName(vendor.name);
    setFormCategory(vendor.category);
    setFormCriticality(vendor.criticality);
    setFormDataAccess(vendor.dataAccessLevel);
    setFormWebsite(vendor.website ?? '');
    setFormContactEmail(vendor.contactEmail ?? '');
    setFormNotes(vendor.notes ?? '');
  }

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

  const fetchVendors = useCallback(async (pid?: string) => {
    const id = pid || projectId;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Vendor[] }>(`/dashboard/soc2/vendors?project_id=${id}`);
      const data = Array.isArray(res) ? res : res.data ?? [];
      setVendors(data);
    } catch {
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchVendorDetail = useCallback(async (vendorId: string) => {
    setDetailLoading(vendorId);
    try {
      const res = await apiFetch<{ data: Vendor }>(`/dashboard/soc2/vendors/${vendorId}`);
      const detail = (res as { data?: Vendor }).data ?? (res as unknown as Vendor);
      setVendors((prev) => prev.map((v) => (v.id === vendorId ? detail : v)));
    } catch {
      toast('error', 'Failed to load vendor details');
    } finally {
      setDetailLoading(null);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjectId().then((pid) => {
      if (pid) fetchVendors(pid);
      else setLoading(false);
    });
  }, [fetchProjectId, fetchVendors]);

  async function handleCreate() {
    if (!projectId || !formName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Vendor }>('/dashboard/soc2/vendors', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          name: formName,
          category: formCategory,
          criticality: formCriticality,
          dataAccessLevel: formDataAccess,
          website: formWebsite || undefined,
          contactEmail: formContactEmail || undefined,
          notes: formNotes || undefined,
        }),
      });
      const created = (res as { data?: Vendor }).data ?? (res as unknown as Vendor);
      setVendors((prev) => [created, ...prev]);
      setShowAddModal(false);
      resetForm();
      toast('success', 'Vendor added');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to add vendor');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!showEditModal || !formName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Vendor }>(`/dashboard/soc2/vendors/${showEditModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          criticality: formCriticality,
          dataAccessLevel: formDataAccess,
          website: formWebsite || undefined,
          contactEmail: formContactEmail || undefined,
          notes: formNotes || undefined,
        }),
      });
      const updated = (res as { data?: Vendor }).data ?? (res as unknown as Vendor);
      setVendors((prev) => prev.map((v) => (v.id === showEditModal.id ? { ...v, ...updated } : v)));
      setShowEditModal(null);
      resetForm();
      toast('success', 'Vendor updated');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(vendorId: string) {
    setDeletingId(vendorId);
    try {
      await apiFetch(`/dashboard/soc2/vendors/${vendorId}`, { method: 'DELETE' });
      setVendors((prev) => prev.filter((v) => v.id !== vendorId));
      setDeleteConfirm(null);
      if (expandedVendor === vendorId) setExpandedVendor(null);
      toast('success', 'Vendor deleted');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete vendor');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddDocument(vendorId: string) {
    if (!docTitle.trim() || !docFileUrl.trim()) return;
    setAddingDoc(true);
    try {
      await apiFetch(`/dashboard/soc2/vendors/${vendorId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          type: docType,
          title: docTitle,
          fileUrl: docFileUrl,
          expiresAt: docExpiresAt || undefined,
        }),
      });
      setDocType('soc2_report');
      setDocTitle('');
      setDocFileUrl('');
      setDocExpiresAt('');
      setShowAddDoc(null);
      await fetchVendorDetail(vendorId);
      toast('success', 'Document added');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setAddingDoc(false);
    }
  }

  async function handleDeleteDocument(vendorId: string, docId: string) {
    setDeletingDocId(docId);
    try {
      await apiFetch(`/dashboard/soc2/vendors/${vendorId}/documents/${docId}`, { method: 'DELETE' });
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId ? { ...v, documents: v.documents.filter((d) => d.id !== docId) } : v
        )
      );
      toast('success', 'Document deleted');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  }

  function toggleExpand(vendorId: string) {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null);
    } else {
      setExpandedVendor(vendorId);
      const vendor = vendors.find((v) => v.id === vendorId);
      if (vendor && !vendor.documents?.length) {
        fetchVendorDetail(vendorId);
      }
    }
  }

  // Stats
  const totalVendors = vendors.length;
  const criticalHigh = vendors.filter((v) => v.criticality === 'critical' || v.criticality === 'high').length;
  const soc2OnFile = vendors.filter((v) =>
    v.documents?.some((d) => d.type === 'soc2_report' && (!d.expiresAt || !isExpired(d.expiresAt)))
  ).length;
  const expiringSoon = vendors.filter((v) =>
    v.documents?.some((d) => d.expiresAt && isExpiringSoon(d.expiresAt))
  ).length;

  function getSoc2Status(vendor: Vendor) {
    const soc2Docs = vendor.documents?.filter((d) => d.type === 'soc2_report') ?? [];
    if (soc2Docs.length === 0) return { label: 'Missing', color: 'text-destructive' };
    const valid = soc2Docs.some((d) => !d.expiresAt || !isExpired(d.expiresAt));
    if (!valid) return { label: 'Expired', color: 'text-warning' };
    return { label: 'On File', color: 'text-success' };
  }

  function getDpaStatus(vendor: Vendor) {
    const dpaDocs = vendor.documents?.filter((d) => d.type === 'dpa') ?? [];
    if (dpaDocs.length === 0) return { label: 'Missing', color: 'text-destructive' };
    return { label: 'On File', color: 'text-success' };
  }

  // Vendor form modal content
  function renderVendorForm(mode: 'create' | 'edit') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border/60 rounded-2xl w-full max-w-lg p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">{mode === 'create' ? 'Add Vendor' : 'Edit Vendor'}</h2>
            <button
              onClick={() => { if (mode === 'create') { setShowAddModal(false); } else { setShowEditModal(null); } resetForm(); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Vendor Name</label>
              <input
                type="text"
                placeholder="e.g. AWS, Stripe, Datadog"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Criticality</label>
                <select
                  value={formCriticality}
                  onChange={(e) => setFormCriticality(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {criticalityOptions.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Data Access Level</label>
              <select
                value={formDataAccess}
                onChange={(e) => setFormDataAccess(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {dataAccessLevels.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Website</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Contact Email</label>
                <input
                  type="email"
                  placeholder="security@vendor.com"
                  value={formContactEmail}
                  onChange={(e) => setFormContactEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">Notes</label>
              <textarea
                placeholder="Additional notes about this vendor..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { if (mode === 'create') { setShowAddModal(false); } else { setShowEditModal(null); } resetForm(); }}
              className="px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={mode === 'create' ? handleCreate : handleUpdate}
              disabled={saving || !formName.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Add Vendor' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track third-party vendors, risk levels, and compliance documentation.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Building2} label="Total vendors" value={totalVendors} color="bg-primary/10 text-primary" />
          <StatCard icon={ShieldAlert} label="Critical / High risk" value={criticalHigh} color="bg-destructive/10 text-destructive" />
          <StatCard icon={FileCheck} label="SOC 2 on file" value={soc2OnFile} color="bg-success/10 text-success" />
          <StatCard icon={Clock} label="Expiring soon" value={expiringSoon} color="bg-warning/10 text-warning" />
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

      {/* Vendor List */}
      <div className="space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : vendors.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No vendors added yet. Add your first vendor to begin tracking.
            </p>
          </div>
        ) : (
          vendors.map((vendor) => {
            const isExpanded = expandedVendor === vendor.id;
            const soc2Status = getSoc2Status(vendor);
            const dpaStatus = getDpaStatus(vendor);

            return (
              <div key={vendor.id} className="border border-border/60 rounded-xl bg-card overflow-hidden">
                {/* Summary row */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleExpand(vendor.id)} className="mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(vendor.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{vendor.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground border border-border/40">
                          {vendor.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${criticalityBadge[vendor.criticality]}`}>
                          {vendor.criticality}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[vendor.status]}`}>
                          {statusLabel[vendor.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground/60 flex-wrap">
                        <span>Data: {vendor.dataAccessLevel}</span>
                        <span>SOC 2: <span className={soc2Status.color}>{soc2Status.label}</span></span>
                        <span>DPA: <span className={dpaStatus.color}>{dpaStatus.label}</span></span>
                        {vendor.nextReviewDate && (
                          <span>Next review: {formatShortDate(vendor.nextReviewDate)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { populateForm(vendor); setShowEditModal(vendor); }}
                        className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {deleteConfirm === vendor.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            disabled={deletingId === vendor.id}
                            className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded-lg font-medium disabled:opacity-50"
                          >
                            {deletingId === vendor.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs px-2 py-1 border border-border/60 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(vendor.id)}
                          className="p-1.5 text-muted-foreground/60 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border/60 p-5">
                    {detailLoading === vendor.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* Vendor info */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                          {vendor.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="h-4 w-4 text-muted-foreground/60" />
                              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                Website <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {vendor.contactEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground/60" />
                              <a href={`mailto:${vendor.contactEmail}`} className="text-primary hover:underline">
                                {vendor.contactEmail}
                              </a>
                            </div>
                          )}
                          {vendor.notes && (
                            <div className="col-span-full text-sm text-muted-foreground/80">
                              {vendor.notes}
                            </div>
                          )}
                        </div>

                        {/* Documents */}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold">Documents</h4>
                          <button
                            onClick={() => setShowAddDoc(vendor.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border/60 rounded-lg hover:bg-secondary transition-all font-medium"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Document
                          </button>
                        </div>

                        {/* Add document form */}
                        {showAddDoc === vendor.id && (
                          <div className="border border-border/60 rounded-xl bg-secondary/30 p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold">Add Document</h4>
                              <button onClick={() => setShowAddDoc(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground/80 mb-1 block">Type</label>
                                <select
                                  value={docType}
                                  onChange={(e) => setDocType(e.target.value as (typeof docTypes)[number])}
                                  className="w-full px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                  {docTypes.map((t) => (
                                    <option key={t} value={t}>{docTypeLabel[t]}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground/80 mb-1 block">Title</label>
                                <input
                                  type="text"
                                  placeholder="SOC 2 Type II 2025"
                                  value={docTitle}
                                  onChange={(e) => setDocTitle(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground/80 mb-1 block">File URL</label>
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  value={docFileUrl}
                                  onChange={(e) => setDocFileUrl(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground/80 mb-1 block">Expires At</label>
                                <input
                                  type="date"
                                  value={docExpiresAt}
                                  onChange={(e) => setDocExpiresAt(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-card border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => handleAddDocument(vendor.id)}
                                disabled={addingDoc || !docTitle.trim() || !docFileUrl.trim()}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                              >
                                {addingDoc && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {vendor.documents?.length > 0 ? (
                          <div className="space-y-2">
                            {vendor.documents.map((doc) => {
                              const expired = doc.expiresAt && isExpired(doc.expiresAt);
                              const expiring = doc.expiresAt && !expired && isExpiringSoon(doc.expiresAt);
                              return (
                                <div key={doc.id} className="flex items-center gap-3 p-3 border border-border/40 rounded-lg bg-secondary/20">
                                  <FileText className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">{doc.title}</span>
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/80">
                                        {docTypeLabel[doc.type]}
                                      </span>
                                      {expired && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                                          Expired
                                        </span>
                                      )}
                                      {expiring && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                                          Expiring Soon
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                                      {doc.expiresAt && `Expires: ${formatShortDate(doc.expiresAt)}`}
                                      {!doc.expiresAt && `Added: ${formatShortDate(doc.createdAt)}`}
                                    </div>
                                  </div>
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-muted-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                                    title="View document"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteDocument(vendor.id, doc.id)}
                                    disabled={deletingDocId === doc.id}
                                    className="p-1.5 text-muted-foreground/60 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                                    title="Delete document"
                                  >
                                    {deletingDocId === doc.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-muted-foreground/60">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                            No documents uploaded yet.
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

      {/* Add Vendor Modal */}
      {showAddModal && renderVendorForm('create')}

      {/* Edit Vendor Modal */}
      {showEditModal && renderVendorForm('edit')}

      {/* Delete confirmation handled inline */}
    </div>
  );
}
