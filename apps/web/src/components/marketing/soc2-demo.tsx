'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ArrowRight,
  Camera,
  FileText,
  Table,
  Link2,
  Hash,
  ChevronRight,
  Check,
  Lock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */

interface Control {
  id: string;
  label: string;
  category: string;
  basePercent: number;
  ready: boolean;
}

interface EvidenceItem {
  icon: typeof Camera;
  title: string;
  control: string;
  time: string;
  hash: string;
  prevHash: string | null;
}

const INITIAL_CONTROLS: Control[] = [
  { id: 'CC6.1', label: 'Logical Access', category: 'CC6 — Access Controls', basePercent: 75, ready: false },
  { id: 'CC6.2', label: 'Access Reviews', category: 'CC6 — Access Controls', basePercent: 75, ready: false },
  { id: 'CC7.3', label: 'Incident Response', category: 'CC7 — System Operations', basePercent: 80, ready: false },
  { id: 'CC7.4', label: 'Recovery Procedures', category: 'CC7 — System Operations', basePercent: 80, ready: false },
  { id: 'CC8.1', label: 'Change Management', category: 'CC8 — Change Management', basePercent: 60, ready: false },
  { id: 'CC3.1', label: 'Risk Assessment', category: 'CC3 — Risk Assessment', basePercent: 20, ready: false },
  { id: 'CC1.1', label: 'Control Environment', category: 'CC1 — Control Environment', basePercent: 10, ready: false },
];

const CATEGORIES: { key: string; label: string; percent: number }[] = [
  { key: 'CC6', label: 'CC6 — Access Controls', percent: 75 },
  { key: 'CC7', label: 'CC7 — System Operations', percent: 80 },
  { key: 'CC8', label: 'CC8 — Change Management', percent: 60 },
  { key: 'CC3', label: 'CC3 — Risk Assessment', percent: 20 },
  { key: 'CC1', label: 'CC1 — Control Environment', percent: 10 },
];

const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    icon: Camera,
    title: 'AWS IAM user list',
    control: 'CC6.1',
    time: '2 days ago',
    hash: 'a3f7c1d8e92b4506f1de8a3b7c9204e51f6b8a2d3c4e5f6a7b8c9d0e1f2a3b4',
    prevHash: null,
  },
  {
    icon: FileText,
    title: 'Incident Response Plan v2.1',
    control: 'CC7.3',
    time: '1 week ago',
    hash: 'b8d2e4f6a1c3d5e7f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3',
    prevHash: 'a3f7c1d8e92b4506f1de8a3b7c9204e51f6b8a2d3c4e5f6a7b8c9d0e1f2a3b4',
  },
  {
    icon: Table,
    title: 'Q1 Access Review',
    control: 'CC6.2',
    time: '3 weeks ago',
    hash: 'c4e6f8a0b2d4e6f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4',
    prevHash: 'b8d2e4f6a1c3d5e7f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3',
  },
  {
    icon: Link2,
    title: 'GitHub branch protection config',
    control: 'CC8.1',
    time: '1 month ago',
    hash: 'd5f7a9b1c3e5f7a9b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5',
    prevHash: 'c4e6f8a0b2d4e6f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function barColor(pct: number) {
  if (pct >= 80) return 'bg-success';
  if (pct >= 50) return 'bg-warning';
  return 'bg-destructive';
}

function barBgColor(pct: number) {
  if (pct >= 80) return 'bg-success/10';
  if (pct >= 50) return 'bg-warning/10';
  return 'bg-destructive/10';
}

function ringColor(pct: number) {
  if (pct >= 80) return 'stroke-success';
  if (pct >= 50) return 'stroke-warning';
  return 'stroke-destructive';
}

function ringGlow(pct: number) {
  if (pct >= 80) return 'drop-shadow(0 0 8px rgba(52,211,153,0.4))';
  if (pct >= 50) return 'drop-shadow(0 0 8px rgba(251,191,36,0.4))';
  return 'drop-shadow(0 0 8px rgba(239,68,68,0.4))';
}

function textColor(pct: number) {
  if (pct >= 80) return 'text-success';
  if (pct >= 50) return 'text-warning';
  return 'text-destructive';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Soc2Demo() {
  const [controls, setControls] = useState<Control[]>(INITIAL_CONTROLS);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // Compute overall readiness
  const computeReadiness = useCallback((ctrls: Control[]) => {
    const total = ctrls.length;
    const readyCount = ctrls.filter((c) => c.ready).length;
    // Base readiness from category percentages + bonus for each toggled control
    const baseReadiness = 47;
    const perControlBonus = (100 - baseReadiness) / total;
    return Math.min(100, Math.round(baseReadiness + readyCount * perControlBonus));
  }, []);

  const readiness = computeReadiness(controls);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Animate the ring percentage (animatedPercent intentionally excluded — captures start value per cycle)
  useEffect(() => {
    if (!mounted) return;
    const target = readiness;
    const start = animatedPercent;
    const diff = target - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercent(Math.round(start + diff * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted, readiness]);

  // Category readiness (boost when controls toggled)
  const getCategoryPercent = useCallback(
    (key: string) => {
      const base = CATEGORIES.find((c) => c.key === key)!.percent;
      const catControls = controls.filter((c) => c.category.startsWith(key));
      const readyCount = catControls.filter((c) => c.ready).length;
      if (catControls.length === 0) return base;
      const boost = readyCount * ((100 - base) / catControls.length);
      return Math.min(100, Math.round(base + boost));
    },
    [controls]
  );

  function toggleControl(id: string) {
    setControls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ready: !c.ready } : c))
    );
    const ctrl = controls.find((c) => c.id === id)!;
    const willBeReady = !ctrl.ready;

    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(
      willBeReady
        ? `${ctrl.id} — ${ctrl.label}: Ready \u2713`
        : `${ctrl.id} — ${ctrl.label}: Reverted`
    );
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // SVG ring constants
  const RING_SIZE = 160;
  const STROKE_WIDTH = 10;
  const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (animatedPercent / 100) * CIRCUMFERENCE;

  return (
    <section className="max-w-6xl mx-auto px-6 py-28 relative">
      {/* Background glow */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-4">
            <Shield className="h-3.5 w-3.5" />
            Try it now
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            See your SOC 2 readiness in real time
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            This is a live preview of AuditKit&apos;s SOC 2 dashboard. Click controls to mark them
            ready and watch your readiness score update.
          </p>
        </div>

        {/* Toast */}
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
            toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-2xl shadow-black/40 flex items-center gap-3 text-sm font-medium">
            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-success" />
            </div>
            {toast}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* LEFT — Readiness Ring + Controls */}
          <div className="lg:col-span-1 space-y-5">
            {/* Ring Card */}
            <div className="border border-border/60 rounded-xl bg-card p-6 shadow-xl shadow-black/20 card-hover">
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
                  <svg
                    width={RING_SIZE}
                    height={RING_SIZE}
                    className="transform -rotate-90"
                    style={{ filter: ringGlow(animatedPercent) }}
                  >
                    {/* Background track */}
                    <circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      strokeWidth={STROKE_WIDTH}
                      className="stroke-border/30"
                    />
                    {/* Progress */}
                    <circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      strokeWidth={STROKE_WIDTH}
                      strokeLinecap="round"
                      className={`${ringColor(animatedPercent)} transition-colors duration-500`}
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={offset}
                      style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-extrabold tabular-nums ${textColor(animatedPercent)} transition-colors duration-500`}>
                      {animatedPercent}%
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">Readiness</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Click controls below to mark them as ready
                </p>
              </div>
            </div>

            {/* Interactive controls list */}
            <div className="border border-border/60 rounded-xl bg-card p-5 shadow-xl shadow-black/20 card-hover">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Controls
              </h3>
              <div className="space-y-1.5">
                {controls.map((ctrl) => (
                  <button
                    key={ctrl.id}
                    onClick={() => toggleControl(ctrl.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                      ctrl.ready
                        ? 'bg-success/10 border border-success/20'
                        : 'hover:bg-secondary/40 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        ctrl.ready
                          ? 'bg-success text-white'
                          : 'border border-border group-hover:border-primary/40'
                      }`}
                    >
                      {ctrl.ready && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{ctrl.label}</div>
                      <div className="text-[11px] text-muted-foreground/60 font-mono">{ctrl.id}</div>
                    </div>
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground/30 transition-all ${
                        ctrl.ready ? 'text-success/60' : 'group-hover:text-muted-foreground/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER — Category bars + Evidence vault */}
          <div className="lg:col-span-2 space-y-5">
            {/* Category readiness bars */}
            <div className="border border-border/60 rounded-xl bg-card p-5 shadow-xl shadow-black/20 card-hover">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Category Readiness
              </h3>
              <div className="space-y-4">
                {CATEGORIES.map((cat, i) => {
                  const pct = getCategoryPercent(cat.key);
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{cat.label}</span>
                        <span className={`text-sm font-semibold tabular-nums ${textColor(pct)}`}>
                          {mounted ? pct : 0}%
                        </span>
                      </div>
                      <div className={`h-2.5 rounded-full ${barBgColor(pct)} overflow-hidden`}>
                        <div
                          className={`h-full rounded-full ${barColor(pct)} transition-all duration-700 ease-out`}
                          style={{
                            width: mounted ? `${pct}%` : '0%',
                            transitionDelay: `${i * 120}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidence vault */}
            <div className="border border-border/60 rounded-xl bg-card p-5 shadow-xl shadow-black/20 card-hover">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Evidence Vault
              </h3>
              <div className="space-y-2">
                {EVIDENCE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.hash}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/30 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground/60">{item.time}</div>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                        {item.control}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hash chain visualization */}
            <div className="border border-border/60 rounded-xl bg-card p-5 shadow-xl shadow-black/20 card-hover">
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Tamper-Proof Hash Chain
              </h3>
              <p className="text-[11px] text-muted-foreground/60 mb-4">
                Each evidence item&apos;s SHA-256 hash incorporates the previous hash, creating an
                immutable chain.
              </p>

              <div className="space-y-0">
                {EVIDENCE_ITEMS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.hash}>
                      {/* Chain connector */}
                      {idx > 0 && (
                        <div className="flex items-center gap-3 pl-[18px] py-1">
                          <div className="w-px h-6 bg-gradient-to-b from-primary/40 to-primary/10" />
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
                            <span className="text-primary/50">prev:</span>
                            {EVIDENCE_ITEMS[idx - 1].hash.substring(0, 16)}...
                          </div>
                        </div>
                      )}

                      {/* Evidence node */}
                      <div className="flex items-start gap-3">
                        {/* Node dot */}
                        <div className="flex flex-col items-center pt-2.5">
                          <div className="w-[9px] h-[9px] rounded-full bg-primary border-2 border-primary/60 shadow-[0_0_6px_rgba(129,140,248,0.4)] flex-shrink-0" />
                        </div>

                        {/* Content */}
                        <div className="code-block rounded-lg px-3.5 py-2.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-xs font-medium truncate">{item.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-px rounded bg-primary/10 text-primary/80 flex-shrink-0">
                              {item.control}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50">
                            <span className="text-primary/60">sha256:</span>
                            <span className="truncate">{item.hash.substring(0, 32)}...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-all btn-shimmer glow-primary"
          >
            Start Your SOC 2 Journey
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
