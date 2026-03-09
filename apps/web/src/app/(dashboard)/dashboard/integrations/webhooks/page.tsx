'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastSuccess?: string | null;
  lastFailure?: string | null;
  createdAt: string;
}

const EVENT_OPTIONS = [
  { value: '*', label: 'All events' },
  { value: 'event.created', label: 'event.created' },
  { value: 'event.anomaly', label: 'event.anomaly' },
];

function SkeletonCard() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-64" />
          <div className="flex gap-2">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        </div>
        <div className="skeleton h-5 w-16 rounded" />
        <div className="flex gap-1">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['*']);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: WebhookEntry[] }>('/v1/webhooks', {
        headers: apiHeaders(),
      });
      setWebhooks(res.data ?? (res as unknown as WebhookEntry[]));
    } catch {
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  function toggleEvent(value: string) {
    if (value === '*') {
      setNewEvents(['*']);
      return;
    }
    setNewEvents((prev) => {
      const without = prev.filter((e) => e !== '*');
      if (without.includes(value)) {
        const result = without.filter((e) => e !== value);
        return result.length === 0 ? ['*'] : result;
      }
      return [...without, value];
    });
  }

  async function createWebhook() {
    if (!newUrl.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: WebhookEntry }>('/v1/webhooks', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ url: newUrl, events: newEvents }),
      });
      const created = res.data ?? (res as unknown as WebhookEntry);
      setWebhooks((prev) => [created, ...prev]);
      setNewUrl('');
      setNewEvents(['*']);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebhook(id: string) {
    setError(null);
    try {
      await apiFetch(`/v1/webhooks/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  }

  async function toggleActive(webhook: WebhookEntry) {
    setToggling(webhook.id);
    setError(null);
    try {
      await apiFetch(`/v1/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ active: !webhook.active }),
      });
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, active: !w.active } : w))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle webhook');
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Receive real-time notifications when audit events occur.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
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

      {/* Create Webhook Form */}
      {showCreate && (
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
          <h3 className="font-semibold mb-4">Add new webhook</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground/60 mb-1 block">Endpoint URL</label>
              <input
                type="url"
                placeholder="https://example.com/webhooks/auditkit"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground/60 mb-2 block">Event Filters</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_OPTIONS.map((opt) => {
                  const isActive = newEvents.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleEvent(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-mono transition-all border ${
                        isActive
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-secondary border-border/60 text-muted-foreground hover:border-primary/20'
                      }`}
                    >
                      {isActive && <Check className="h-3 w-3 inline mr-1" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={createWebhook}
                disabled={creating || !newUrl.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Webhook
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewUrl('');
                  setNewEvents(['*']);
                }}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : webhooks.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10">
            <Webhook className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No webhooks configured. Add one to receive event notifications.
            </p>
          </div>
        ) : (
          webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="border border-border/60 rounded-xl bg-card p-5 card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Webhook className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate mb-1">{webhook.url}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {webhook.events.map((evt) => (
                      <span
                        key={evt}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/60"
                      >
                        {evt}
                      </span>
                    ))}
                    {webhook.lastSuccess && (
                      <span className="text-[10px] text-success flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Last OK: {new Date(webhook.lastSuccess).toLocaleDateString()}
                      </span>
                    )}
                    {webhook.lastFailure && (
                      <span className="text-[10px] text-destructive flex items-center gap-0.5">
                        <XCircle className="h-3 w-3" />
                        Last fail: {new Date(webhook.lastFailure).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Active/Inactive Badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    webhook.active
                      ? 'bg-success/20 text-success'
                      : 'bg-secondary text-muted-foreground/60'
                  }`}
                >
                  {webhook.active ? 'Active' : 'Inactive'}
                </span>

                {/* Toggle / Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(webhook)}
                    disabled={toggling === webhook.id}
                    className="p-2 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-secondary"
                    title={webhook.active ? 'Deactivate' : 'Activate'}
                  >
                    {toggling === webhook.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : webhook.active ? (
                      <ToggleRight className="h-4 w-4 text-success" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>

                  {deleteConfirm === webhook.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition font-medium"
                      >
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
                      onClick={() => setDeleteConfirm(webhook.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary"
                      title="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
