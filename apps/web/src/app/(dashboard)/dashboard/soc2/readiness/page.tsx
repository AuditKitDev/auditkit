'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  FileCheck,
  ScrollText,
  AlertTriangle,
  Users,
  ClipboardList,
  ArrowRight,
  Activity,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
}

interface CategoryReadiness {
  category: string;
  total: number;
  ready: number;
  in_progress: number;
  not_started: number;
  verified: number;
}

interface OverviewData {
  controls: {
    total: number;
    ready: number;
    in_progress: number;
    not_started: number;
    verified: number;
    byCategory: CategoryReadiness[];
  };
  evidence: { total: number };
  policies: { total: number; active: number };
  risks: { total: number; open: number };
  accessReviews: { total: number; pending: number };
  incidents: { total: number; open: number };
  personnel: { total: number; active: number };
}

interface ReadinessData {
  total: number;
  byStatus: Record<string, number>;
  percentReady: number;
  byCategory: CategoryReadiness[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SOC2_CATEGORIES: Record<string, string> = {
  CC1: 'Control Environment',
  CC2: 'Communication & Information',
  CC3: 'Risk Assessment',
  CC4: 'Monitoring Activities',
  CC5: 'Control Activities',
  CC6: 'Logical & Physical Access',
  CC7: 'System Operations',
  CC8: 'Change Management',
  CC9: 'Risk Mitigation',
  A1: 'Availability',
  PI1: 'Processing Integrity',
  C1: 'Confidentiality',
};

const quickActions = [
  { label: 'Evidence Vault', href: '/dashboard/soc2/evidence', icon: FileCheck, color: 'text-blue-400' },
  { label: 'Policies', href: '/dashboard/soc2/policies', icon: ScrollText, color: 'text-emerald-400' },
  { label: 'Access Reviews', href: '/dashboard/soc2/access-reviews', icon: Users, color: 'text-violet-400' },
  { label: 'Vendor Management', href: '/dashboard/soc2/vendors', icon: ClipboardList, color: 'text-amber-400' },
  { label: 'Risk Register', href: '/dashboard/soc2/risks', icon: AlertTriangle, color: 'text-rose-400' },
];

/* ------------------------------------------------------------------ */
/* Skeleton loaders                                                    */
/* ------------------------------------------------------------------ */

function StatCardSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16 mb-1" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

function CategoryBarSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="skeleton h-4 w-10" />
      <div className="skeleton h-3 w-28" />
      <div className="flex-1 skeleton h-5 rounded-full" />
      <div className="skeleton h-4 w-12" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Circular progress component                                         */
/* ------------------------------------------------------------------ */

function ReadinessRing({ percent, size = 160, strokeWidth = 12 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent >= 80 ? 'stroke-success' : percent >= 50 ? 'stroke-warning' : 'stroke-destructive';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-700`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tracking-tight">{percent}%</span>
        <span className="text-xs text-muted-foreground">Ready</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category bar chart row                                              */
/* ------------------------------------------------------------------ */

function CategoryBar({ cat }: { cat: CategoryReadiness }) {
  const readyPct = cat.total > 0 ? Math.round(((cat.ready + cat.verified) / cat.total) * 100) : 0;
  const inProgressPct = cat.total > 0 ? Math.round((cat.in_progress / cat.total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs font-mono font-medium w-8 text-muted-foreground">{cat.category}</span>
      <span className="text-xs text-muted-foreground/60 w-36 truncate hidden md:block">
        {SOC2_CATEGORIES[cat.category] || cat.category}
      </span>
      <div className="flex-1 h-5 bg-border/20 rounded-full overflow-hidden flex">
        {readyPct > 0 && (
          <div
            className="bg-success h-full transition-all duration-500"
            style={{ width: `${readyPct}%` }}
            title={`${readyPct}% ready/verified`}
          />
        )}
        {inProgressPct > 0 && (
          <div
            className="bg-warning h-full transition-all duration-500"
            style={{ width: `${inProgressPct}%` }}
            title={`${inProgressPct}% in progress`}
          />
        )}
      </div>
      <span className="text-xs font-medium w-12 text-right tabular-nums">
        {cat.ready + cat.verified}/{cat.total}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function SOC2ReadinessPage() {
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ data: Project[] }>('/dashboard/projects');
        const list = Array.isArray(res) ? res : res.data ?? [];
        setProjects(list);
        if (list.length > 0) {
          setProjectId(list[0].id);
        }
      } catch {
        setError('Failed to load projects');
        setLoading(false);
      }
    })();
  }, []);

  // Fetch SOC 2 data when project changes
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, readinessRes] = await Promise.all([
        apiFetch<{ data: OverviewData }>(`/dashboard/soc2/overview?project_id=${projectId}`),
        apiFetch<{ data: ReadinessData }>(`/dashboard/soc2/controls/readiness?project_id=${projectId}`),
      ]);
      const ov = (overviewRes as { data?: OverviewData }).data ?? (overviewRes as unknown as OverviewData);
      setOverview(ov);
      const rd = (readinessRes as { data?: ReadinessData }).data ?? (readinessRes as unknown as ReadinessData);
      setReadiness(rd);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load SOC 2 data';
      setError(msg);
      toast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const percentReady = readiness?.percentReady ?? (overview ? Math.round(((overview.controls.ready + overview.controls.verified) / Math.max(overview.controls.total, 1)) * 100) : 0);
  const categories = readiness?.byCategory ?? overview?.controls.byCategory ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOC 2 Readiness</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your SOC 2 compliance readiness across all Trust Services Criteria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value)}
              className="text-sm border border-border/60 rounded-xl bg-card px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Readiness score + stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Readiness ring */}
        <div className="border border-border/60 rounded-xl bg-card p-6 flex flex-col items-center justify-center lg:col-span-1">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="skeleton h-40 w-40 rounded-full" />
              <div className="skeleton h-4 w-24" />
            </div>
          ) : (
            <>
              <ReadinessRing percent={percentReady} />
              <p className="text-xs text-muted-foreground mt-3">Readiness Score</p>
            </>
          )}
        </div>

        {/* Stat cards */}
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : overview ? (
            <>
              <div className="border border-border/60 rounded-xl bg-card p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground font-medium">Controls Ready</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {overview.controls.ready + overview.controls.verified}
                  <span className="text-base font-normal text-muted-foreground">/{overview.controls.total}</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">{overview.controls.in_progress} in progress</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{overview.controls.not_started} not started</span>
                </div>
              </div>

              <div className="border border-border/60 rounded-xl bg-card p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground font-medium">Evidence Uploaded</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{overview.evidence.total}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">pieces of evidence</p>
              </div>

              <div className="border border-border/60 rounded-xl bg-card p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground font-medium">Policies Active</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {overview.policies.active}
                  <span className="text-base font-normal text-muted-foreground">/{overview.policies.total}</span>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">policies published</p>
              </div>

              <div className="border border-border/60 rounded-xl bg-card p-5 card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span className="text-xs text-muted-foreground font-medium">Open Risks</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{overview.risks.open}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">{overview.risks.total} total identified</p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Control readiness by category */}
      <div className="border border-border/60 rounded-xl bg-card p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm tracking-tight">Control Readiness by Category</h2>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              SOC 2 Trust Services Criteria coverage
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Ready/Verified
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-warning" /> In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-border/40" /> Not Started
            </span>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {loading ? (
            <>
              <CategoryBarSkeleton />
              <CategoryBarSkeleton />
              <CategoryBarSkeleton />
              <CategoryBarSkeleton />
              <CategoryBarSkeleton />
            </>
          ) : categories.length > 0 ? (
            categories.map((cat) => <CategoryBar key={cat.category} cat={cat} />)
          ) : (
            <div className="py-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No control data available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-semibold text-sm tracking-tight mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="border border-border/60 rounded-xl bg-card p-4 card-hover flex items-center gap-3 group"
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-sm font-medium flex-1">{action.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border border-border/60 rounded-xl bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm tracking-tight">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-48 mb-1" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : overview ? (
          <div className="space-y-1">
            {overview.controls.verified > 0 && (
              <ActivityRow
                icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                text={`${overview.controls.verified} controls verified by auditor`}
                badge="verified"
                badgeClass="bg-success/10 text-success"
              />
            )}
            {overview.controls.in_progress > 0 && (
              <ActivityRow
                icon={<Clock className="h-4 w-4 text-warning" />}
                text={`${overview.controls.in_progress} controls currently in progress`}
                badge="in progress"
                badgeClass="bg-warning/10 text-warning"
              />
            )}
            {overview.evidence.total > 0 && (
              <ActivityRow
                icon={<FileCheck className="h-4 w-4 text-blue-400" />}
                text={`${overview.evidence.total} evidence items uploaded`}
                badge="evidence"
                badgeClass="bg-blue-500/10 text-blue-400"
              />
            )}
            {overview.risks.open > 0 && (
              <ActivityRow
                icon={<AlertTriangle className="h-4 w-4 text-rose-400" />}
                text={`${overview.risks.open} open risks require attention`}
                badge="risk"
                badgeClass="bg-destructive/10 text-destructive"
              />
            )}
            {overview.accessReviews.pending > 0 && (
              <ActivityRow
                icon={<Users className="h-4 w-4 text-violet-400" />}
                text={`${overview.accessReviews.pending} access reviews pending`}
                badge="review"
                badgeClass="bg-violet-500/10 text-violet-400"
              />
            )}
            {overview.incidents.open > 0 && (
              <ActivityRow
                icon={<XCircle className="h-4 w-4 text-destructive" />}
                text={`${overview.incidents.open} open incidents`}
                badge="incident"
                badgeClass="bg-destructive/10 text-destructive"
              />
            )}
            {overview.controls.total === 0 && overview.evidence.total === 0 && (
              <div className="py-6 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet. Start by uploading evidence or configuring controls.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No data available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity row                                                        */
/* ------------------------------------------------------------------ */

function ActivityRow({
  icon,
  text,
  badge,
  badgeClass,
}: {
  icon: React.ReactNode;
  text: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-secondary/10 transition-colors">
      <div className="shrink-0">{icon}</div>
      <p className="text-sm flex-1">{text}</p>
      <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${badgeClass}`}>{badge}</span>
    </div>
  );
}
