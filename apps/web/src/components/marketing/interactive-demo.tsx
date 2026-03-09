'use client';

import { useState, useRef } from 'react';
import { Play, Copy, Check, Terminal, Hash, Clock, Shield, Sparkles } from 'lucide-react';

interface DemoEvent {
  id: string;
  action: string;
  actorName: string;
  targetType: string;
  targetId: string;
  tenantId: string;
  severity: 'info' | 'warn' | 'error';
  timestamp: string;
  hash: string;
  prevHash: string;
}

const severityColors: Record<string, string> = {
  info: 'bg-primary/15 text-primary border border-primary/20',
  warn: 'bg-warning/15 text-warning border border-warning/20',
  error: 'bg-destructive/15 text-destructive border border-destructive/20',
};

function generateHash(): string {
  const chars = 'abcdef0123456789';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function buildCodeString(fields: {
  action: string;
  actorName: string;
  targetType: string;
  targetId: string;
  tenantId: string;
}) {
  return `await audit.log('${fields.action}', {
  actor: { id: 'user_123', name: '${fields.actorName}' },
  target: { type: '${fields.targetType}', id: '${fields.targetId}' },
  tenantId: '${fields.tenantId}',
});`;
}

export function InteractiveDemo() {
  const [action, setAction] = useState('document.updated');
  const [actorName, setActorName] = useState('Jane Doe');
  const [targetType, setTargetType] = useState('document');
  const [targetId, setTargetId] = useState('doc_456');
  const [tenantId, setTenantId] = useState('org_acme');
  const [severity, setSeverity] = useState<'info' | 'warn' | 'error'>('info');
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [copied, setCopied] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const codeString = buildCodeString({ action, actorName, targetType, targetId, tenantId });

  function sendEvent() {
    setSending(true);
    setTimeout(() => {
      const prevHash = events.length > 0 ? events[0].hash : '0'.repeat(64);
      const newEvent: DemoEvent = {
        id: `evt_${Date.now()}`,
        action,
        actorName,
        targetType,
        targetId,
        tenantId,
        severity,
        timestamp: new Date().toISOString(),
        hash: generateHash(),
        prevHash,
      };
      setEvents((prev) => [newEvent, ...prev]);
      setSending(false);
      if (viewerRef.current) {
        viewerRef.current.scrollTop = 0;
      }
    }, 300);
  }

  function copyCode() {
    navigator.clipboard.writeText(
      `import { AuditKit } from '@auditkit/sdk';\n\nconst audit = new AuditKit({\n  apiKey: process.env.AUDITKIT_API_KEY!,\n});\n\n${codeString}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyInstall() {
    navigator.clipboard.writeText('npm install @auditkit/sdk');
    setInstallCopied(true);
    setTimeout(() => setInstallCopied(false), 2000);
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-28 relative">
      {/* Background glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Interactive playground
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">See it in action</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Edit the fields, hit Send Event, and watch the tamper-evident audit log build in real time.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* LEFT: Code Editor */}
          <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col shadow-xl shadow-black/20 card-hover">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">audit.log()</span>
              </div>
              <button
                onClick={copyCode}
                className="text-muted-foreground hover:text-foreground transition p-1.5 hover:bg-muted rounded-md"
                title="Copy code"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="p-5 space-y-3.5 flex-1">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5 block font-medium">
                  Action
                </label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5 block font-medium">
                  Actor Name
                </label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5 block font-medium">
                    Target Type
                  </label>
                  <input
                    type="text"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5 block font-medium">
                    Target ID
                  </label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5 block font-medium">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5 block font-medium">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as 'info' | 'warn' | 'error')}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none"
                  >
                    <option value="info">info</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </select>
                </div>
              </div>

              {/* Code Preview */}
              <div className="code-block rounded-lg p-4 mt-1">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {codeString}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-border">
              <button
                onClick={sendEvent}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all btn-shimmer glow-primary text-sm disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {sending ? 'Sending...' : 'Send Event'}
              </button>
            </div>
          </div>

          {/* RIGHT: Audit Log Viewer */}
          <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col shadow-xl shadow-black/20 card-hover">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Shield className="h-4 w-4 text-primary" />
                  <div className="absolute inset-0 blur-md bg-primary/40" />
                </div>
                <span className="text-sm font-semibold">Audit Log Viewer</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-secondary rounded-md">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div
              ref={viewerRef}
              className="flex-1 overflow-y-auto min-h-[440px] max-h-[520px]"
            >
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-sm text-center mb-1 font-medium">No events yet</p>
                  <p className="text-xs text-center text-muted-foreground/60">
                    Edit the fields and click Send Event to see the audit log populate.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {events.map((event, index) => (
                    <div
                      key={event.id}
                      className="p-4 hover:bg-secondary/20 transition-all duration-200"
                      style={{
                        animation: index === 0 ? 'fade-up 0.3s ease both' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2.5">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono font-medium ${severityColors[event.severity]}`}
                        >
                          {event.action}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 ml-auto flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        <span className="font-semibold">{event.actorName}</span>
                        <span className="text-muted-foreground/60 mx-1.5">&rarr;</span>
                        <span className="text-muted-foreground">
                          {event.targetType}:{event.targetId}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground/50">
                        <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded">{event.tenantId}</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Hash className="h-3 w-3 text-primary/40" />
                          {event.hash.substring(0, 16)}...
                        </span>
                      </div>
                      {index < events.length - 1 && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/30 font-mono">
                          <div className="w-3 h-px bg-muted-foreground/20" />
                          prev: {event.prevHash.substring(0, 12)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Install Command */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-4 glass rounded-xl px-6 py-4 shadow-lg shadow-black/20">
            <Terminal className="h-4 w-4 text-primary" />
            <code className="text-sm font-mono text-muted-foreground">
              npm install <span className="text-foreground font-semibold">@auditkit/sdk</span>
            </code>
            <button
              onClick={copyInstall}
              className="text-muted-foreground hover:text-foreground transition p-1.5 hover:bg-muted rounded-md"
              title="Copy install command"
            >
              {installCopied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
