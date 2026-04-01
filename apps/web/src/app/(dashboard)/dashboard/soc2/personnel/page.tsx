'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  Pencil,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

/* ---------- types ---------- */

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'offboarding' | 'terminated';
  hireDate: string;
  terminationDate: string | null;
  backgroundCheckCompleted: boolean;
  backgroundCheckDate: string | null;
  trainingCompleted: boolean;
  trainingDate: string | null;
  policyAcknowledged: boolean;
  policyAckDate: string | null;
  createdAt: string;
}

interface PersonnelStats {
  total: number;
  active: number;
  backgroundChecksDone: number;
  trainingDone: number;
  policiesAcknowledged: number;
}

const STATUS_OPTIONS: Person['status'][] = ['active', 'offboarding', 'terminated'];

const statusBadge: Record<string, string> = {
  active: 'bg-success/20 text-success border border-success/30',
  offboarding: 'bg-warning/10 text-warning border border-warning/20',
  terminated: 'bg-destructive/10 text-destructive border border-destructive/20',
};

/* ---------- skeletons ---------- */

function StatSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="skeleton h-3 w-28 mb-2" />
      <div className="skeleton h-7 w-16" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-48" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-5 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export default function PersonnelPage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [stats, setStats] = useState<PersonnelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Person['status']>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // add form
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    hireDate: '',
    status: 'active' as Person['status'],
  });

  // edit form
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    hireDate: '',
    status: 'active' as Person['status'],
    terminationDate: '',
    backgroundCheckCompleted: false,
    backgroundCheckDate: '',
    trainingCompleted: false,
    trainingDate: '',
    policyAcknowledged: false,
    policyAckDate: '',
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

  /* fetch data */
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const filterParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const [personnelRes, statsRes] = await Promise.all([
        apiFetch<{ data: Person[] }>(`/dashboard/soc2/personnel?project_id=${projectId}${filterParam}`),
        apiFetch<{ data: PersonnelStats }>(`/dashboard/soc2/personnel/stats?project_id=${projectId}`),
      ]);
      const personnelData = Array.isArray(personnelRes) ? personnelRes : personnelRes.data ?? [];
      const statsData = (Array.isArray(statsRes) ? null : statsRes.data ?? null) as PersonnelStats | null;
      setPersonnel(personnelData);
      setStats(statsData);
    } catch {
      setError('Failed to load personnel data');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* add person */
  async function handleAdd() {
    if (!projectId || !addForm.name.trim() || !addForm.email.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/dashboard/soc2/personnel', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, ...addForm }),
      });
      toast('success', 'Person added');
      setShowAddModal(false);
      setAddForm({ name: '', email: '', role: '', department: '', hireDate: '', status: 'active' });
      fetchData();
    } catch {
      toast('error', 'Failed to add person');
    } finally {
      setSaving(false);
    }
  }

  /* edit person */
  async function handleEditSave() {
    if (!showEditModal) return;
    setSaving(true);
    try {
      await apiFetch(`/dashboard/soc2/personnel/${showEditModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editForm,
          terminationDate: editForm.terminationDate || null,
          backgroundCheckDate: editForm.backgroundCheckCompleted ? editForm.backgroundCheckDate || null : null,
          trainingDate: editForm.trainingCompleted ? editForm.trainingDate || null : null,
          policyAckDate: editForm.policyAcknowledged ? editForm.policyAckDate || null : null,
        }),
      });
      toast('success', 'Person updated');
      setShowEditModal(null);
      fetchData();
    } catch {
      toast('error', 'Failed to update person');
    } finally {
      setSaving(false);
    }
  }

  /* delete person */
  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/dashboard/soc2/personnel/${id}`, { method: 'DELETE' });
      toast('success', 'Person removed');
      fetchData();
    } catch {
      toast('error', 'Failed to delete person');
    } finally {
      setDeleting(null);
    }
  }

  function openEditModal(person: Person) {
    setEditForm({
      name: person.name,
      email: person.email,
      role: person.role,
      department: person.department,
      hireDate: person.hireDate ? person.hireDate.split('T')[0] : '',
      status: person.status,
      terminationDate: person.terminationDate ? person.terminationDate.split('T')[0] : '',
      backgroundCheckCompleted: person.backgroundCheckCompleted,
      backgroundCheckDate: person.backgroundCheckDate ? person.backgroundCheckDate.split('T')[0] : '',
      trainingCompleted: person.trainingCompleted,
      trainingDate: person.trainingDate ? person.trainingDate.split('T')[0] : '',
      policyAcknowledged: person.policyAcknowledged,
      policyAckDate: person.policyAckDate ? person.policyAckDate.split('T')[0] : '',
    });
    setShowEditModal(person);
  }

  function CheckIndicator({ checked }: { checked: boolean }) {
    return checked ? (
      <CheckCircle2 className="h-4 w-4 text-success" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive/60" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Personnel Tracker</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Person
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
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Active</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Background Checks</p>
            <p className="text-2xl font-bold">
              <span className="text-success">{stats.backgroundChecksDone}</span>
              <span className="text-muted-foreground text-base">/{stats.total}</span>
            </p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Training Completed</p>
            <p className="text-2xl font-bold">
              <span className="text-success">{stats.trainingDone}</span>
              <span className="text-muted-foreground text-base">/{stats.total}</span>
            </p>
          </div>
          <div className="border border-border/60 rounded-xl bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Policies Acknowledged</p>
            <p className="text-2xl font-bold">
              <span className="text-success">{stats.policiesAcknowledged}</span>
              <span className="text-muted-foreground text-base">/{stats.total}</span>
            </p>
          </div>
        </div>
      ) : null}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1">
          {(['all', ...STATUS_OPTIONS] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Personnel Table */}
      {loading ? (
        <TableSkeleton />
      ) : personnel.length === 0 ? (
        <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No personnel records found.</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl bg-card overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-border/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Department</span>
            <span>Status</span>
            <span className="text-center">BG Check</span>
            <span className="text-center">Training</span>
            <span className="text-center">Policy</span>
            <span>Actions</span>
          </div>
          {/* Rows */}
          {personnel.map((person) => (
            <div
              key={person.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div>
                <span className="font-medium text-sm">{person.name}</span>
                <p className="text-xs text-muted-foreground md:hidden">{person.email}</p>
              </div>
              <span className="hidden md:block text-sm text-muted-foreground truncate">{person.email}</span>
              <span className="hidden md:block text-sm text-muted-foreground">{person.role}</span>
              <span className="hidden md:block text-sm text-muted-foreground">{person.department}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${statusBadge[person.status]}`}>
                {person.status}
              </span>
              <div className="flex md:justify-center">
                <CheckIndicator checked={person.backgroundCheckCompleted} />
              </div>
              <div className="flex md:justify-center">
                <CheckIndicator checked={person.trainingCompleted} />
              </div>
              <div className="flex md:justify-center">
                <CheckIndicator checked={person.policyAcknowledged} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(person)}
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(person.id)}
                  disabled={deleting === person.id}
                  className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  {deleting === person.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h2 className="text-lg font-semibold">Add Person</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <input
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={addForm.hireDate}
                    onChange={(e) => setAddForm({ ...addForm, hireDate: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as Person['status'] })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border/40">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !addForm.name.trim() || !addForm.email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Person
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <h2 className="text-lg font-semibold">Edit Person</h2>
              <button onClick={() => setShowEditModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <input
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Person['status'] })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={editForm.hireDate}
                    onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              {editForm.status !== 'active' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Termination Date</label>
                  <input
                    type="date"
                    value={editForm.terminationDate}
                    onChange={(e) => setEditForm({ ...editForm, terminationDate: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              {/* Compliance checkboxes */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <p className="text-sm font-medium">Compliance Checks</p>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="bgCheck"
                    checked={editForm.backgroundCheckCompleted}
                    onChange={(e) => setEditForm({ ...editForm, backgroundCheckCompleted: e.target.checked })}
                    className="rounded border-border"
                  />
                  <label htmlFor="bgCheck" className="text-sm flex-1">Background check completed</label>
                  {editForm.backgroundCheckCompleted && (
                    <input
                      type="date"
                      value={editForm.backgroundCheckDate}
                      onChange={(e) => setEditForm({ ...editForm, backgroundCheckDate: e.target.value })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="training"
                    checked={editForm.trainingCompleted}
                    onChange={(e) => setEditForm({ ...editForm, trainingCompleted: e.target.checked })}
                    className="rounded border-border"
                  />
                  <label htmlFor="training" className="text-sm flex-1">Training completed</label>
                  {editForm.trainingCompleted && (
                    <input
                      type="date"
                      value={editForm.trainingDate}
                      onChange={(e) => setEditForm({ ...editForm, trainingDate: e.target.value })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="policyAck"
                    checked={editForm.policyAcknowledged}
                    onChange={(e) => setEditForm({ ...editForm, policyAcknowledged: e.target.checked })}
                    className="rounded border-border"
                  />
                  <label htmlFor="policyAck" className="text-sm flex-1">Policy acknowledged</label>
                  {editForm.policyAcknowledged && (
                    <input
                      type="date"
                      value={editForm.policyAckDate}
                      onChange={(e) => setEditForm({ ...editForm, policyAckDate: e.target.value })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>
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
