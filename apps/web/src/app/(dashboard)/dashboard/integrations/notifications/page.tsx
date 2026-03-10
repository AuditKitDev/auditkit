'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Plus,
  Mail,
  MessageSquare,
  Hash,
  Webhook,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  value: string;
}

interface NotificationRule {
  id: string;
  name: string;
  conditions: Condition[];
  channel_type: 'slack' | 'discord' | 'email' | 'webhook';
  channel_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

const FIELDS = [
  { value: 'action', label: 'Action' },
  { value: 'severity', label: 'Severity' },
  { value: 'actor_id', label: 'Actor ID' },
  { value: 'is_failure', label: 'Is Failure' },
  { value: 'is_anomalous', label: 'Is Anomalous' },
  { value: 'target_type', label: 'Target Type' },
];

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
];

const channelIcons: Record<string, typeof Bell> = {
  slack: Hash,
  discord: MessageSquare,
  email: Mail,
  webhook: Webhook,
};

const channelColors: Record<string, string> = {
  slack: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  discord: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  email: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  webhook: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([
    { field: 'action', operator: 'eq', value: '' },
  ]);
  const [channelType, setChannelType] = useState<'slack' | 'discord' | 'email' | 'webhook'>('slack');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [webhookCustomUrl, setWebhookCustomUrl] = useState('');

  const fetchRules = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: NotificationRule[] }>('/dashboard/notifications');
      setRules(data.data ?? []);
    } catch {
      setError('Failed to load notification rules. Please try again.');
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

  async function toggleRule(id: string, currentlyActive: boolean) {
    const previousRules = [...rules];
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
    try {
      await apiFetch(`/dashboard/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentlyActive }),
      });
    } catch {
      setRules(previousRules);
      setError('Failed to toggle rule. Please try again.');
    }
  }

  async function deleteRule(id: string) {
    setDeleting(true);
    try {
      await apiFetch(`/dashboard/notifications/${id}`, {
        method: 'DELETE',
      });
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete rule. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function buildChannelConfig(): Record<string, unknown> {
    switch (channelType) {
      case 'slack':
        return { webhook_url: webhookUrl };
      case 'discord':
        return { webhook_url: webhookUrl };
      case 'email':
        return { email: emailAddress };
      case 'webhook':
        return { url: webhookCustomUrl };
      default:
        return {};
    }
  }

  async function createRule() {
    if (!newName.trim()) return;

    // BUG-030: Validate channel config
    if (channelType === 'email' && !emailAddress.trim()) {
      setError('Email address is required for email channel.');
      return;
    }
    if (channelType === 'slack' && !webhookUrl.trim()) {
      setError('Webhook URL is required for Slack channel.');
      return;
    }
    if (channelType === 'discord' && !webhookUrl.trim()) {
      setError('Webhook URL is required for Discord channel.');
      return;
    }
    if (channelType === 'webhook' && !webhookCustomUrl.trim()) {
      setError('Webhook URL is required for webhook channel.');
      return;
    }

    const validConditions = conditions.filter((c) => c.value.trim() !== '');

    setCreating(true);
    try {
      const created = await apiFetch<NotificationRule>('/dashboard/notifications', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          conditions: validConditions,
          channel_type: channelType,
          channel_config: buildChannelConfig(),
        }),
      });
      setRules((prev) => [created, ...prev]);
      resetForm();
      toast('success', 'Notification rule created');
    } catch {
      setError('Failed to create rule. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setNewName('');
    setConditions([{ field: 'action', operator: 'eq', value: '' }]);
    setChannelType('slack');
    setWebhookUrl('');
    setEmailAddress('');
    setWebhookCustomUrl('');
    setShowCreate(false);
  }

  function addCondition() {
    setConditions((prev) => [...prev, { field: 'action', operator: 'eq', value: '' }]);
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCondition(index: number, updates: Partial<Condition>) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 transition-all';
  const selectClass =
    'w-full px-3.5 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Rules</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Route audit events to Slack, Discord, email, or webhooks based on conditions.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all btn-shimmer"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Create Rule Form */}
      {showCreate && (
        <div className="border border-border/60 rounded-xl bg-card p-6 mb-6 shadow-lg shadow-black/10 gradient-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-lg">New Notification Rule</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition"
              aria-label="Close create form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-5">
            {/* Rule Name */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Rule Name</label>
              <input
                type="text"
                placeholder="e.g., Critical Security Alerts"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Conditions Builder */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block font-medium">
                Conditions <span className="text-muted-foreground/50 font-normal">(all must match)</span>
              </label>
              <div className="space-y-2">
                {conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(i, { field: e.target.value })}
                      className={`${selectClass} max-w-[160px]`}
                    >
                      {FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        updateCondition(i, { operator: e.target.value as Condition['operator'] })
                      }
                      className={`${selectClass} max-w-[140px]`}
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type={cond.operator === 'gt' || cond.operator === 'lt' ? 'number' : 'text'}
                      placeholder="value"
                      value={cond.value}
                      onChange={(e) => updateCondition(i, { value: e.target.value })}
                      className={`${inputClass} flex-1 font-mono`}
                    />
                    {conditions.length > 1 && (
                      <button
                        onClick={() => removeCondition(i)}
                        className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary shrink-0"
                        aria-label="Remove condition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addCondition}
                className="mt-2 text-xs text-primary hover:text-primary/80 transition font-medium"
              >
                + Add condition
              </button>
            </div>

            {/* Channel Config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Channel</label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as typeof channelType)}
                  className={selectClass}
                >
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block font-medium">
                  {channelType === 'email'
                    ? 'Email Address'
                    : channelType === 'webhook'
                      ? 'Webhook URL'
                      : 'Webhook URL'}
                </label>
                {channelType === 'email' ? (
                  <input
                    type="email"
                    placeholder="alerts@yourcompany.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className={inputClass}
                  />
                ) : channelType === 'webhook' ? (
                  <input
                    type="url"
                    placeholder="https://api.yourapp.com/webhook"
                    value={webhookCustomUrl}
                    onChange={(e) => setWebhookCustomUrl(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                ) : (
                  <input
                    type="url"
                    placeholder={
                      channelType === 'slack'
                        ? 'https://hooks.slack.com/services/...'
                        : 'https://discord.com/api/webhooks/...'
                    }
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={createRule}
                disabled={creating}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all btn-shimmer disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Rule
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border/60 rounded-xl bg-card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 skeleton" />
                    <div className="h-3 w-72 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && rules.length === 0 && (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No notification rules configured.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Create a rule to start routing audit events to your channels.
            </p>
          </div>
        )}

        {rules.map((rule) => {
          const ChannelIcon = channelIcons[rule.channel_type] ?? Bell;
          const conditionList = Array.isArray(rule.conditions) ? rule.conditions : [];
          return (
            <div
              key={rule.id}
              className="border border-border/60 rounded-xl bg-card p-5 hover:bg-secondary/10 transition-all shadow-sm shadow-black/5 group card-hover"
            >
              <div className="flex items-center gap-4">
                {/* Channel Icon */}
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${channelColors[rule.channel_type] ?? 'bg-secondary/50 text-muted-foreground border-border/60'}`}
                >
                  <ChannelIcon className="h-5 w-5" />
                </div>

                {/* Rule Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">{rule.name}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        rule.is_active
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {conditionList.length > 0
                      ? conditionList
                          .map((c) => `${c.field} ${c.operator} "${c.value}"`)
                          .join(' AND ')
                      : 'No conditions (matches all events)'}
                    {' '}&rarr; <span className="capitalize">{rule.channel_type}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleRule(rule.id, rule.is_active)}
                    className="p-2 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-secondary"
                    title={rule.is_active ? 'Deactivate' : 'Activate'}
                    aria-label={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
                  >
                    {rule.is_active ? (
                      <ToggleRight className="h-5 w-5 text-success" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  {deleteConfirm === rule.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        disabled={deleting}
                        className="px-2 py-1 text-xs bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs text-muted-foreground rounded-lg hover:bg-secondary transition"
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
