'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Zap,
  EyeOff,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface RedactionRule {
  id: string;
  fieldPath: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  createdAt: string;
}

const presets = [
  {
    name: 'Email addresses',
    fieldPath: '**',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    replacement: '[REDACTED_EMAIL]',
  },
  {
    name: 'IP addresses',
    fieldPath: '**',
    pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '[REDACTED_IP]',
  },
  {
    name: 'Credit cards',
    fieldPath: '**',
    pattern: '\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b',
    replacement: '[REDACTED_CC]',
  },
  {
    name: 'Phone numbers',
    fieldPath: '**',
    pattern: '\\+?1?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}',
    replacement: '[REDACTED_PHONE]',
  },
  {
    name: 'SSN',
    fieldPath: '**',
    pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    replacement: '[REDACTED_SSN]',
  },
];

function SkeletonRow() {
  return (
    <tr>
      <td className="p-3.5"><div className="skeleton h-4 w-24" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-40" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-28" /></td>
      <td className="p-3.5"><div className="skeleton h-5 w-12" /></td>
      <td className="p-3.5"><div className="skeleton h-8 w-8 rounded-lg" /></td>
    </tr>
  );
}

export default function RedactionPage() {
  const [rules, setRules] = useState<RedactionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newFieldPath, setNewFieldPath] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [patternError, setPatternError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: RedactionRule[] }>('/dashboard/redaction-rules');
      setRules(res.data ?? (res as unknown as RedactionRule[]));
    } catch {
      setError('Failed to load redaction rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function createRule(fieldPath: string, pattern: string, replacement: string) {
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: RedactionRule }>('/dashboard/redaction-rules', {
        method: 'POST',
        body: JSON.stringify({ fieldPath, pattern, replacement }),
      });
      const created = res.data ?? (res as unknown as RedactionRule);
      setRules((prev) => [created, ...prev]);
      setNewFieldPath('');
      setNewPattern('');
      setNewReplacement('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setCreating(false);
    }
  }

  async function toggleRule(rule: RedactionRule) {
    setToggling(rule.id);
    setError(null);
    try {
      await apiFetch(`/dashboard/redaction-rules/${rule.id}`, {
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

  async function deleteRule(id: string) {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/dashboard/redaction-rules/${id}`, {
        method: 'DELETE',
      });
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    } finally {
      setDeleting(false);
    }
  }

  async function addPreset(preset: typeof presets[number]) {
    await createRule(preset.fieldPath, preset.pattern, preset.replacement);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PII Redaction Rules</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automatically redact sensitive data from audit events before storage.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Rule
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

      {/* Presets */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Quick Presets</h3>
            <p className="text-xs text-muted-foreground/60">Add common PII redaction rules with one click.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => addPreset(preset)}
              disabled={creating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all border border-border/60 bg-secondary hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Create Rule Form */}
      {showCreate && (
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
          <h3 className="font-semibold mb-4">Add new redaction rule</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground/60 mb-1 block">Field Path</label>
              <input
                type="text"
                placeholder="e.g., metadata.email or ** for all fields"
                value={newFieldPath}
                onChange={(e) => setNewFieldPath(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground/60 mb-1 block">Pattern (regex)</label>
              <input
                type="text"
                placeholder="e.g., [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                value={newPattern}
                onChange={(e) => {
                  setNewPattern(e.target.value);
                  setPatternError(null);
                  if (e.target.value.trim()) {
                    try {
                      new RegExp(e.target.value);
                    } catch {
                      setPatternError('Invalid regex pattern');
                    }
                  }
                }}
                className={`w-full px-3 py-2.5 text-sm bg-secondary border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all font-mono ${
                  patternError ? 'border-destructive/60' : 'border-border/60'
                }`}
              />
              {patternError && (
                <p className="text-xs text-destructive mt-1">{patternError}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground/60 mb-1 block">Replacement</label>
              <input
                type="text"
                placeholder="e.g., [REDACTED_EMAIL]"
                value={newReplacement}
                onChange={(e) => setNewReplacement(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => createRule(newFieldPath, newPattern, newReplacement)}
                disabled={creating || !newFieldPath.trim() || !newPattern.trim() || !newReplacement.trim() || !!patternError}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Rule
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewFieldPath('');
                  setNewPattern('');
                  setNewReplacement('');
                }}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/20">
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Field Path</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Pattern</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Replacement</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <EyeOff className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No redaction rules configured. Add a rule or use a preset above.
                  </p>
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-secondary/15 transition-all">
                  <td className="p-3.5">
                    <span className="font-mono text-xs bg-secondary/50 px-2 py-0.5 rounded">{rule.fieldPath}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono text-xs text-muted-foreground truncate block max-w-[200px]" title={rule.pattern}>
                      {rule.pattern}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono text-xs">{rule.replacement}</span>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => toggleRule(rule)}
                      disabled={toggling === rule.id}
                      className="p-1 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-secondary"
                      title={rule.enabled ? 'Disable' : 'Enable'}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {toggling === rule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : rule.enabled ? (
                        <ToggleRight className="h-5 w-5 text-success" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="p-3.5">
                    {deleteConfirm === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteRule(rule.id)}
                          disabled={deleting}
                          className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(rule.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary"
                        title="Delete rule"
                        aria-label="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
