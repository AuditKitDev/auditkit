'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Check, Trash2, Loader2, AlertTriangle, Mail } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  scopes?: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

const envColors: Record<string, string> = {
  live: 'bg-success/20 text-success',
  production: 'bg-success/20 text-success',
  test: 'bg-info/20 text-info',
};

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-5">
      <div className="skeleton h-5 w-5 rounded" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-3 w-56" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="flex gap-1">
        <div className="skeleton h-8 w-8 rounded-md" />
        <div className="skeleton h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'test' | 'live'>('test');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean>(true);

  useEffect(() => {
    apiFetch<{ user: { emailVerified: boolean } }>('/auth/me')
      .then((data) => setEmailVerified(data.user.emailVerified))
      .catch(() => {});
  }, []);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: ApiKey[] }>('/dashboard/api-keys');
      setKeys(res.data ?? (res as unknown as ApiKey[]));
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function createKey() {
    if (!newKeyName.trim()) {
      setNameError('Key name is required.');
      return;
    }
    setNameError(null);
    setCreating(true);
    try {
      const res = await apiFetch<{ key: string; apiKey: ApiKey }>('/dashboard/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName, environment: newKeyEnv }),
      });
      setCreatedKey(res.key);
      setKeys((prev) => [res.apiKey, ...prev]);
      setNewKeyName('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/dashboard/api-keys/${id}`, {
        method: 'DELETE',
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteConfirm(null);
      toast('success', 'API key deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key');
    } finally {
      setDeleting(null);
    }
  }

  function copyToClipboard(id: string, text: string) {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div>
      {!emailVerified && (
        <div className="mb-6 border border-amber-500/20 bg-amber-500/5 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-sm text-amber-400 font-medium">
            Please verify your email to create API keys.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage API keys for server-to-server authentication.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!emailVerified}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Create New Key
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

      {/* Created Key Banner */}
      {createdKey && (
        <div className="border border-warning/30 bg-warning/10 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Save this key now. It will never be shown again.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Have you copied this API key? It cannot be retrieved after dismissing.')) {
                  setCreatedKey(null);
                }
              }}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              I&apos;ve copied it
            </button>
          </div>
          <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border/60">
            <code className="text-sm font-mono flex-1 break-all">{createdKey}</code>
            <button
              onClick={() => copyToClipboard('created', createdKey)}
              className="text-muted-foreground hover:text-foreground transition p-1.5 rounded-lg hover:bg-secondary"
              aria-label="Copy API key"
            >
              {copiedId === 'created' ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      {showCreate && (
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
          <h3 className="font-semibold mb-4">Create new API key</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Key Name</label>
              <input
                type="text"
                placeholder="e.g., Production API Key"
                value={newKeyName}
                onChange={(e) => {
                  setNewKeyName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                className={`w-full px-3 py-2.5 text-sm bg-secondary border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all ${nameError ? 'border-destructive/60' : 'border-border/60'}`}
              />
              {nameError && (
                <p className="text-xs text-destructive mt-1">{nameError}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Environment</label>
              <select
                value={newKeyEnv}
                onChange={(e) => setNewKeyEnv(e.target.value as 'live' | 'test')}
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
              >
                <option value="test">Test</option>
                <option value="live">Production</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={createKey}
                disabled={creating || !newKeyName.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Key
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
        <div className="divide-y divide-border/40">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center">
              <Key className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-4 p-5 card-hover transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{key.name}</p>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${envColors[key.environment] || 'bg-secondary text-muted-foreground'}`}
                    >
                      {key.environment}
                    </span>
                    {key.scopes && key.scopes.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        {key.scopes.join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground/60">
                    {key.keyPrefix}...
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground/60">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Last used{' '}
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(key.id, key.keyPrefix)}
                    className="p-2 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-secondary"
                    title="Copy key prefix (full key only shown at creation)"
                    aria-label="Copy key prefix"
                  >
                    {copiedId === key.id ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  {deleteConfirm === key.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteKey(key.id)}
                        disabled={deleting === key.id}
                        className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition font-medium"
                      >
                        {deleting === key.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Confirm'
                        )}
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
                      onClick={() => setDeleteConfirm(key.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary"
                      title="Delete key"
                      aria-label="Delete key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
