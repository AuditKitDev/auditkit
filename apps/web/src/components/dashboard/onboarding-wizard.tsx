'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Key,
  Webhook,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const ONBOARDING_KEY = 'auditkit_onboarding_complete';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyIsPrefix, setKeyIsPrefix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [sendingEvent, setSendingEvent] = useState(false);
  const [eventSent, setEventSent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function fetchOrCreateKey() {
      try {
        const res = await apiFetch<{ data: { id: string; keyPrefix: string; name: string }[] }>(
          '/dashboard/api-keys'
        );
        if (res.data.length > 0) {
          // Key already exists - show prefix and direct user to API Keys page
          setApiKey(res.data[0].keyPrefix + '...');
          setKeyIsPrefix(true);
        } else {
          // Create a fresh key so the user gets the full value
          const created = await apiFetch<{ key: string }>('/dashboard/api-keys', {
            method: 'POST',
            body: JSON.stringify({ name: 'Default API Key', environment: 'live' }),
          });
          setApiKey(created.key);
          setKeyIsPrefix(false);
        }
      } catch {
        setApiKey(null);
        setKeyIsPrefix(true);
      }
    }
    fetchOrCreateKey();
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    setTimeout(onComplete, 300);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const handleCopyKey = useCallback(async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [apiKey]);

  const handleCopyInstall = useCallback(async () => {
    await navigator.clipboard.writeText('npm install @auditkit/sdk').catch(() => {});
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  }, []);

  const handleSendTestEvent = useCallback(async () => {
    setSendingEvent(true);
    setEventError(null);
    try {
      await apiFetch('/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          action: 'user.login',
          actor: { id: 'user_onboarding', name: 'Onboarding Test' },
          tenant_id: 'onboarding',
          severity: 'info',
        }),
      });
      setEventSent(true);
    } catch {
      setEventError('Failed to send test event. You can try again or continue.');
    } finally {
      setSendingEvent(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/40 animate-fade-up overflow-hidden">
        {/* Glow effect at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/10 blur-[80px] pointer-events-none" />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="relative p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center animate-fade-up">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2 gradient-text">Welcome to AuditKit!</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                Let&apos;s get you set up in under 2 minutes. You&apos;ll have tamper-evident audit
                logs flowing in no time.
              </p>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all btn-shimmer"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Copy API Key */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold mb-1">Copy Your API Key</h2>
              <p className="text-muted-foreground text-sm mb-6">
                You&apos;ll need this to authenticate with AuditKit.
              </p>

              <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-foreground truncate flex-1 mr-3">
                    {apiKey || 'Loading...'}
                  </code>
                  {!keyIsPrefix && apiKey && (
                    <button
                      onClick={handleCopyKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                {keyIsPrefix && (
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Your key was shown when created. Find it in{' '}
                    <a href="/dashboard/settings/api-keys" className="text-primary hover:underline">
                      Settings &rarr; API Keys
                    </a>{' '}
                    or create a new one.
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground/60 mb-3 font-medium uppercase tracking-wider">
                Install the SDK
              </p>
              <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-foreground">
                    <span className="text-muted-foreground">$</span> npm install @auditkit/sdk
                  </code>
                  <button
                    onClick={handleCopyInstall}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0"
                  >
                    {copiedInstall ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all btn-shimmer"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Send First Event */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold mb-1">Send Your First Event</h2>
              <p className="text-muted-foreground text-sm mb-5">
                Add this to your app to start logging audit events.
              </p>

              <div className="code-block rounded-xl p-4 mb-5 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                  <span className="code-keyword">import</span>
                  <span className="text-foreground"> {'{'} </span>
                  <span className="code-function">AuditKit</span>
                  <span className="text-foreground"> {'}'} </span>
                  <span className="code-keyword">from</span>
                  <span className="code-string"> &apos;@auditkit/sdk&apos;</span>
                  <span className="text-foreground">;</span>
                  {'\n\n'}
                  <span className="code-keyword">const</span>
                  <span className="text-foreground"> auditkit = </span>
                  <span className="code-keyword">new</span>
                  <span className="code-function"> AuditKit</span>
                  <span className="text-foreground">({'{'} </span>
                  <span className="code-property">apiKey</span>
                  <span className="text-foreground">: </span>
                  <span className="code-string">&apos;your-key&apos;</span>
                  <span className="text-foreground"> {'}'});</span>
                  {'\n\n'}
                  <span className="code-keyword">await</span>
                  <span className="text-foreground"> auditkit.</span>
                  <span className="code-function">log</span>
                  <span className="text-foreground">({'{'}</span>
                  {'\n'}
                  <span className="text-foreground">  </span>
                  <span className="code-property">action</span>
                  <span className="text-foreground">: </span>
                  <span className="code-string">&apos;user.login&apos;</span>
                  <span className="text-foreground">,</span>
                  {'\n'}
                  <span className="text-foreground">  </span>
                  <span className="code-property">actor</span>
                  <span className="text-foreground">: {'{'} </span>
                  <span className="code-property">id</span>
                  <span className="text-foreground">: </span>
                  <span className="code-string">&apos;user_123&apos;</span>
                  <span className="text-foreground">, </span>
                  <span className="code-property">name</span>
                  <span className="text-foreground">: </span>
                  <span className="code-string">&apos;John&apos;</span>
                  <span className="text-foreground"> {'}'},</span>
                  {'\n'}
                  <span className="text-foreground">  </span>
                  <span className="code-property">tenant_id</span>
                  <span className="text-foreground">: </span>
                  <span className="code-string">&apos;acme-corp&apos;</span>
                  <span className="text-foreground">,</span>
                  {'\n'}
                  <span className="text-foreground">{'}'});</span>
                </pre>
              </div>

              {eventError && (
                <div className="mb-3 p-3 border border-destructive/30 bg-destructive/5 rounded-lg text-xs text-destructive">
                  {eventError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSendTestEvent}
                  disabled={sendingEvent || eventSent}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all text-sm ${
                    eventSent
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-secondary/50 border border-border/50 text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {sendingEvent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : eventSent ? (
                    <>
                      <Check className="h-4 w-4" />
                      Event Sent!
                    </>
                  ) : (
                    'Try it now'
                  )}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all btn-shimmer text-sm"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: All Set */}
          {step === 3 && (
            <div className="text-center animate-fade-up">
              {/* Success animation */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="relative w-20 h-20 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center">
                  <Check className="h-10 w-10 text-success" strokeWidth={3} />
                </div>
                {/* Confetti particles */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: ['#818cf8', '#34d399', '#fbbf24', '#c084fc', '#f472b6', '#818cf8', '#34d399', '#fbbf24'][i],
                      top: '50%',
                      left: '50%',
                      animation: `confetti-burst 0.8s ease-out ${i * 0.05}s forwards`,
                      transform: `rotate(${i * 45}deg)`,
                    }}
                  />
                ))}
              </div>

              <h2 className="text-2xl font-bold mb-2 gradient-text">You&apos;re All Set!</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                Your audit trail is live. Explore your dashboard or dive into the docs.
              </p>

              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all btn-shimmer mb-6"
              >
                Explore Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center justify-center gap-6 text-sm">
                <a
                  href="/docs"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Docs
                </a>
                <a
                  href="/dashboard/settings/api-keys"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
                >
                  <Key className="h-3.5 w-3.5" />
                  API Keys
                </a>
                <a
                  href="/dashboard/integrations/webhooks"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
                >
                  <Webhook className="h-3.5 w-3.5" />
                  Webhooks
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-primary'
                  : i < step
                  ? 'w-1.5 bg-primary/40'
                  : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
