'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  AlertTriangle,
  Loader2,
  Check,
  RefreshCw,
  Copy,
  Clock,
  Info,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';
import { formatDate, formatRelative } from '@/lib/utils';

interface SigningKey {
  id: string;
  publicKey: string;
  algorithm: string;
  createdAt: string;
  revokedAt?: string | null;
  active: boolean;
}

function SkeletonCard() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-3 w-64" />
        </div>
      </div>
    </div>
  );
}

export default function SigningKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<SigningKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: SigningKey[] }>('/dashboard/signing-keys');
      setKeys(res.data ?? (res as unknown as SigningKey[]));
    } catch {
      setError('Failed to load signing keys');
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

  async function rotateKey() {
    setRotating(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: SigningKey }>('/dashboard/signing-keys/rotate', {
        method: 'POST',
      });
      const newKey = res.data ?? (res as unknown as SigningKey);
      // Mark old active key as revoked and add new one
      setKeys((prev) =>
        [newKey, ...prev.map((k) => (k.active ? { ...k, active: false, revokedAt: new Date().toISOString() } : k))]
      );
      setShowRotateConfirm(false);
      toast('success', 'Key rotated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
    } finally {
      setRotating(false);
    }
  }

  function copyPublicKey(key: string) {
    try {
      navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  const activeKey = keys.find((k) => k.active);
  const previousKeys = keys.filter((k) => !k.active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Signing Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage cryptographic keys used to sign audit events for tamper-proof verification.
          </p>
        </div>
        <button
          onClick={() => setShowRotateConfirm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Rotate Key
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

      {/* Rotate Confirmation Dialog */}
      {showRotateConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setShowRotateConfirm(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Rotate Signing Key</h3>
                <button
                  onClick={() => setShowRotateConfirm(false)}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition"
                  aria-label="Close rotation dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="border border-warning/30 bg-warning/10 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">This action cannot be undone</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The current active key will be revoked and replaced with a new key.
                    New events will be signed with the new key.
                    Existing events remain verifiable with the old public key.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={rotateKey}
                  disabled={rotating}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Confirm Rotation
                </button>
                <button
                  onClick={() => setShowRotateConfirm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Active Key */}
      {loading ? (
        <SkeletonCard />
      ) : activeKey ? (
        <div className="border border-primary/30 rounded-xl bg-card p-5 mb-6 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Active Signing Key</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/20 text-success">Active</span>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Created {formatDate(activeKey.createdAt)}
              </p>
            </div>
          </div>

          <div className="bg-secondary/20 border border-border/30 rounded-xl p-4 mb-4">
            <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-1.5 block">
              Public Key ({activeKey.algorithm || 'Ed25519'})
            </label>
            <div className="flex items-start gap-2">
              <code className="text-xs font-mono text-muted-foreground break-all flex-1 leading-relaxed">
                {activeKey.publicKey}
              </code>
              <button
                onClick={() => copyPublicKey(activeKey.publicKey)}
                className="p-1.5 rounded-lg hover:bg-secondary transition shrink-0"
                title="Copy public key"
                aria-label="Copy public key"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10 mb-6">
          <Key className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No active signing key found. Click &quot;Rotate Key&quot; to generate one.
          </p>
        </div>
      )}

      {/* Verification Info */}
      <div className="border border-border/60 rounded-xl bg-card p-4 mb-6 flex items-start gap-3 shadow-lg shadow-black/10">
        <Info className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Event Verification</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            All events are signed with Ed25519 digital signatures. You can verify any event&apos;s integrity
            via the <code className="text-xs bg-secondary/50 px-1 py-0.5 rounded font-mono">GET /v1/events/:id/verify</code> API
            endpoint or by using the public key above with a local Ed25519 verification library.
          </p>
        </div>
      </div>

      {/* Previous Keys */}
      {previousKeys.length > 0 && (
        <>
          <div className="mb-4">
            <h2 className="font-semibold text-lg tracking-tight">Previous Keys</h2>
            <p className="text-sm text-muted-foreground/60 mt-1">Revoked keys used for verifying historical events.</p>
          </div>

          <div className="space-y-3">
            {previousKeys.map((key) => (
              <div
                key={key.id}
                className="border border-border/60 rounded-xl bg-card p-5 card-hover transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Key className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-mono text-xs truncate">{key.publicKey.slice(0, 48)}...</p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/60">
                        Revoked
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {formatRelative(key.createdAt)}
                      </span>
                      {key.revokedAt && (
                        <span>Revoked {formatRelative(key.revokedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
