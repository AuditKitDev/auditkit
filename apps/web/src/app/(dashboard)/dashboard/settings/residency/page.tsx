'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Loader2,
  Check,
  Info,
  MapPin,
  X,
} from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';
import { useToast } from '@/components/toast';

interface ResidencyConfig {
  region: string;
  updatedAt?: string;
}

const regions = [
  {
    key: 'us',
    name: 'United States',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    description: 'US East (Virginia). Default region for all new projects.',
    badge: 'Default',
  },
  {
    key: 'eu',
    name: 'European Union',
    flag: '\uD83C\uDDEA\uD83C\uDDFA',
    description: 'EU West (Frankfurt). GDPR-compliant data storage within the EU.',
    badge: 'GDPR',
  },
  {
    key: 'apac',
    name: 'Asia Pacific',
    flag: '\uD83C\uDDF8\uD83C\uDDEC',
    description: 'APAC (Singapore). Low-latency storage for Asia-Pacific workloads.',
    badge: null,
  },
];

export default function ResidencyPage() {
  const { toast } = useToast();
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchResidency = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ResidencyConfig>('/dashboard/data-residency', {
        headers: apiHeaders(),
      });
      const region = res.region ?? 'us';
      setCurrentRegion(region);
      setSelectedRegion(region);
    } catch {
      setError('Failed to load data residency settings');
      setCurrentRegion('us');
      setSelectedRegion('us');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResidency();
  }, [fetchResidency]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function handleSaveClick() {
    if (selectedRegion === null || !hasChanges) return;
    setShowConfirmModal(true);
  }

  async function handleSave() {
    if (selectedRegion === null) return;
    setShowConfirmModal(false);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch('/dashboard/data-residency', {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ region: selectedRegion }),
      });
      setCurrentRegion(selectedRegion);
      toast('success', 'Data residency updated');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data residency');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = selectedRegion !== currentRegion;
  const currentRegionInfo = regions.find((r) => r.key === currentRegion);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="skeleton h-7 w-40 mb-2" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="border border-border/60 rounded-xl bg-card p-5 mb-6">
          <div className="skeleton h-5 w-40 mb-3" />
          <div className="skeleton h-8 w-48 mb-1" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-border/40 rounded-xl p-5 space-y-2">
              <div className="skeleton h-8 w-8 rounded" />
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Data Residency</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose where your audit event data is stored to meet regional compliance requirements.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Current Region */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold">Current Region</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{currentRegionInfo?.flag || '\uD83C\uDF10'}</span>
          <div>
            <p className="text-lg font-bold">{currentRegionInfo?.name || currentRegion}</p>
            <p className="text-sm text-muted-foreground/60">{currentRegionInfo?.description || ''}</p>
          </div>
        </div>
      </div>

      {/* Region Selector */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
        <h3 className="font-semibold mb-4">Select Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {regions.map((region) => {
            const isSelected = selectedRegion === region.key;
            const isCurrent = currentRegion === region.key;
            return (
              <button
                key={region.key}
                onClick={() => setSelectedRegion(region.key)}
                className={`text-left border rounded-xl p-5 transition-all card-hover ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{region.flag}</span>
                  {region.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {region.badge}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm">{region.name}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{region.description}</p>
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

      {/* Region change warning */}
      {hasChanges && (
        <div className="border border-warning/30 bg-warning/10 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Changing data residency region</p>
            <p className="text-sm text-muted-foreground mt-1">
              Changing regions will affect where new events are stored. Existing events will remain
              in their current region. Data migration is not automatic and may require a support request
              for existing data.
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="border border-border/60 rounded-xl bg-card p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-muted-foreground/60">
            Data residency settings apply per-project. All new audit events will be stored in the
            selected region. For compliance requirements like GDPR, select the EU region to ensure
            all data remains within European data centers.
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
          Update Region
        </button>
        {saved && (
          <span className="text-sm text-success flex items-center gap-1">
            <Check className="h-4 w-4" />
            Data residency updated
          </span>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowConfirmModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/40 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <h3 className="font-bold text-lg">Confirm Region Change</h3>
                </div>
                <button onClick={() => setShowConfirmModal(false)} className="p-1 hover:bg-secondary rounded-lg transition" aria-label="Close confirmation dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                You are changing your data residency region from{' '}
                <span className="font-semibold text-foreground">
                  {regions.find((r) => r.key === currentRegion)?.name || currentRegion}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {regions.find((r) => r.key === selectedRegion)?.name || selectedRegion}
                </span>.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                New events will be stored in the selected region. Existing events will remain in their current region.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Yes, change region
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
