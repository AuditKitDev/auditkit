'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  XCircle,
  Loader2,
  Hash,
} from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  externalId: string;
}

interface VerificationResult {
  valid: boolean;
  eventsVerified: number;
  brokenLinks: { position: number; eventId: string; expected: string; actual: string }[];
  rootHash?: string;
  duration?: string;
}

export default function VerificationPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const res = await apiFetch<{ data: Tenant[] }>('/v1/tenants', {
        headers: apiHeaders(),
      });
      setTenants(res.data ?? (res as unknown as Tenant[]));
    } catch {
      setError('Failed to load tenants');
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  async function runVerification() {
    if (!selectedTenant) return;
    setRunning(true);
    setResult(null);
    setError(null);
    setProgress(0);

    // Animate progress while waiting for response
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 15;
      });
    }, 300);

    try {
      const res = await apiFetch<VerificationResult>(
        `/v1/verify?tenant_id=${encodeURIComponent(selectedTenant)}`,
        { headers: apiHeaders() }
      );
      setProgress(100);
      setTimeout(() => {
        setResult(res);
        setRunning(false);
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setRunning(false);
    } finally {
      clearInterval(progressInterval);
    }
  }

  const selectedTenantName =
    tenants.find((t) => t.externalId === selectedTenant)?.name || selectedTenant;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Chain Verification</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Verify the SHA-256 hash chain integrity for your tenants. Detects any tampered or missing
          events.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Verification Controls */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
        <h3 className="font-semibold mb-4">Run Verification</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground/60 mb-1 block">Select Tenant</label>
            {tenantsLoading ? (
              <div className="skeleton h-[42px] w-full rounded-xl" />
            ) : (
              <select
                value={selectedTenant}
                onChange={(e) => {
                  setSelectedTenant(e.target.value);
                  setResult(null);
                }}
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
              >
                <option value="">Choose a tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.externalId}>
                    {t.name} ({t.externalId})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={runVerification}
            disabled={!selectedTenant || running}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selectedTenant && !running
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            }`}
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Verify Chain
              </>
            )}
          </button>
        </div>
      </div>

      {/* Running Animation */}
      {running && (
        <div className="border border-border/60 rounded-xl bg-card p-8 mb-6 shadow-lg shadow-black/10">
          <div className="text-center mb-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Verifying hash chain for{' '}
              <span className="font-medium text-foreground">{selectedTenantName}</span>
              ...
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Checking each event's SHA-256 hash against the previous event.
            </p>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground/50 text-center mt-2">
            {Math.round(Math.min(progress, 100))}%
          </p>
        </div>
      )}

      {/* Results */}
      {result && !running && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div
            className={`border rounded-xl p-5 flex items-start gap-4 shadow-lg shadow-black/10 ${
              result.valid
                ? 'border-success/30 bg-success/5'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            {result.valid ? (
              <ShieldCheck className="h-8 w-8 text-success shrink-0" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
            )}
            <div>
              <h3
                className={`font-semibold text-lg ${result.valid ? 'text-success' : 'text-destructive'}`}
              >
                {result.valid ? 'Chain Verified' : 'Chain Integrity Broken'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {result.valid
                  ? `All ${result.eventsVerified.toLocaleString()} events verified successfully. No tampering detected.`
                  : `Found ${result.brokenLinks.length} broken link${result.brokenLinks.length !== 1 ? 's' : ''} in ${result.eventsVerified.toLocaleString()} events.`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border/60 rounded-xl p-4 bg-card shadow-lg shadow-black/10">
              <p className="text-xs text-muted-foreground/60 mb-1">Events Verified</p>
              <p className="text-xl font-bold font-mono">
                {result.eventsVerified.toLocaleString()}
              </p>
            </div>
            <div className="border border-border/60 rounded-xl p-4 bg-card shadow-lg shadow-black/10">
              <p className="text-xs text-muted-foreground/60 mb-1">Duration</p>
              <p className="text-xl font-bold font-mono">{result.duration || '--'}</p>
            </div>
            <div className="border border-border/60 rounded-xl p-4 bg-card shadow-lg shadow-black/10">
              <p className="text-xs text-muted-foreground/60 mb-1">Broken Links</p>
              <p
                className={`text-xl font-bold font-mono ${result.brokenLinks.length > 0 ? 'text-destructive' : 'text-success'}`}
              >
                {result.brokenLinks.length}
              </p>
            </div>
          </div>

          {/* Root Hash */}
          {result.rootHash && (
            <div className="border border-border/60 rounded-xl bg-card p-4 shadow-lg shadow-black/10">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Root Hash</p>
              </div>
              <p className="text-xs font-mono text-muted-foreground/60 break-all">
                {result.rootHash}
              </p>
            </div>
          )}

          {/* Broken Links Detail */}
          {result.brokenLinks.length > 0 && (
            <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
              <div className="px-5 py-4 border-b border-border/40">
                <h3 className="font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Broken Links
                </h3>
              </div>
              <div className="divide-y divide-border/30">
                {result.brokenLinks.map((link, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-mono bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                        Position #{link.position}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground/60">
                        {link.eventId}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground/60">Expected hash: </span>
                        <code className="font-mono text-success break-all">{link.expected}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground/60">Actual hash: </span>
                        <code className="font-mono text-destructive break-all">{link.actual}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !running && (
        <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a tenant and run verification to check hash chain integrity.
          </p>
        </div>
      )}
    </div>
  );
}
