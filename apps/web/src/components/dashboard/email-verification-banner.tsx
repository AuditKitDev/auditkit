'use client';

import { useState } from 'react';
import { Mail, X, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface EmailVerificationBannerProps {
  emailVerified: boolean;
}

export function EmailVerificationBanner({ emailVerified }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (emailVerified || dismissed) return null;

  async function handleSend() {
    setSending(true);
    setError('');

    try {
      await apiFetch('/auth/send-verification', { method: 'POST' });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 border border-amber-500/20 bg-amber-500/5 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
          {sent ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Mail className="h-4 w-4 text-amber-500" />
          )}
        </div>
        <div className="min-w-0">
          {sent ? (
            <p className="text-sm text-emerald-400 font-medium">Verification email sent! Check your inbox.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Verify your email address</p>
              <p className="text-xs text-muted-foreground">Please verify your email to unlock all features.</p>
            </>
          )}
          {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!sent && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {sending && <Loader2 className="h-3 w-3 animate-spin" />}
            {sending ? 'Sending...' : 'Send verification email'}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
