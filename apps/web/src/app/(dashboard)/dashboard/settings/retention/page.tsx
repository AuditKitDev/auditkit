'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Check, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';
import { useToast } from '@/components/toast';

const retentionOptions = [
  {
    days: 7,
    label: '7 days',
    tier: 'Free',
    description: 'Suitable for development and testing.',
  },
  {
    days: 30,
    label: '30 days',
    tier: 'Pro',
    description: 'Standard retention for most applications.',
  },
  {
    days: 60,
    label: '60 days',
    tier: 'Pro',
    description: 'Extended retention for compliance needs.',
  },
  {
    days: 90,
    label: '90 days',
    tier: 'Business',
    description: 'SOC 2 recommended minimum retention period.',
  },
  {
    days: 365,
    label: '1 year',
    tier: 'Business',
    description: 'Long-term retention for regulated industries.',
  },
  {
    days: 2555,
    label: '7 years',
    tier: 'Enterprise',
    description: 'Maximum retention for financial and healthcare compliance.',
  },
];

export default function RetentionPage() {
  const [currentRetention, setCurrentRetention] = useState<number | null>(null);
  const [selectedRetention, setSelectedRetention] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchRetention = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ retentionDays: number }>('/dashboard/retention', {
        headers: apiHeaders(),
      });
      const days = res.retentionDays ?? 30;
      setCurrentRetention(days);
      setSelectedRetention(days);
    } catch {
      setError('Failed to load retention policy');
      setCurrentRetention(30);
      setSelectedRetention(30);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRetention();
  }, [fetchRetention]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function handleSaveClick() {
    if (selectedRetention === null) return;
    const isReduction = currentRetention !== null && selectedRetention < currentRetention;
    if (isReduction) {
      setShowConfirmModal(true);
    } else {
      performSave();
    }
  }

  async function performSave() {
    if (selectedRetention === null) return;
    const previousRetention = currentRetention;
    setShowConfirmModal(false);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch('/dashboard/retention', {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ retentionDays: selectedRetention }),
      });
      setCurrentRetention(selectedRetention);
      setSaved(true);
      toast('success', 'Retention policy updated');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSelectedRetention(previousRetention);
      setError(err instanceof Error ? err.message : 'Failed to update retention policy');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = selectedRetention !== currentRetention;

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6">
          <div className="skeleton h-5 w-40 mb-3" />
          <div className="skeleton h-8 w-24 mb-1" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6">
          <div className="skeleton h-5 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-border/40 rounded-xl p-4 space-y-2">
                <div className="skeleton h-5 w-20" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Retention Policy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure how long audit events are stored before automatic deletion.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Current Policy */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold">Current Retention Period</h2>
        </div>
        <p className="text-2xl font-bold">
          {retentionOptions.find((o) => o.days === currentRetention)?.label ||
            `${currentRetention} days`}
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Events older than this will be permanently deleted.
        </p>
      </div>

      {/* Retention Options */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
        <h3 className="font-semibold mb-4">Select Retention Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {retentionOptions.map((option) => {
            const isSelected = selectedRetention === option.days;
            const isCurrent = currentRetention === option.days;
            return (
              <button
                key={option.days}
                onClick={() => setSelectedRetention(option.days)}
                className={`text-left border rounded-xl p-4 transition-all card-hover ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {option.tier}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60">{option.description}</p>
                {isCurrent && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                    <Check className="h-3 w-3" />
                    Current
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Warning for shorter retention */}
      {selectedRetention !== null &&
        currentRetention !== null &&
        selectedRetention < currentRetention && (
          <div className="border border-warning/30 bg-warning/10 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Reducing retention period</p>
              <p className="text-sm text-muted-foreground mt-1">
                Existing events older than the new retention period will be permanently deleted
                within 24 hours. This action cannot be undone.
              </p>
            </div>
          </div>
        )}

      {/* Info */}
      <div className="border border-border/60 rounded-xl bg-card p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-muted-foreground/60">
            Retention policies apply per-project. Events are soft-deleted first and permanently
            purged after a 24-hour grace period. Upgrade your plan to access longer retention
            periods.
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveClick}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            hasChanges && !saving
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-muted-foreground cursor-not-allowed'
          }`}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
        {saved && (
          <span className="text-sm text-success flex items-center gap-1">
            <Check className="h-4 w-4" />
            Retention policy updated
          </span>
        )}
      </div>

      {/* Confirmation Modal for Retention Reduction */}
      {showConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowConfirmModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/40 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <h3 className="font-bold text-lg">Confirm Retention Reduction</h3>
                </div>
                <button onClick={() => setShowConfirmModal(false)} className="p-1 hover:bg-secondary rounded-lg transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                You are reducing retention from{' '}
                <span className="font-semibold text-foreground">
                  {retentionOptions.find((o) => o.days === currentRetention)?.label || `${currentRetention} days`}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {retentionOptions.find((o) => o.days === selectedRetention)?.label || `${selectedRetention} days`}
                </span>.
              </p>
              <p className="text-sm text-destructive font-medium mb-6">
                Events older than the new retention period will be permanently deleted within 24 hours. This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={performSave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
                >
                  Yes, reduce retention
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
