'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Shield,
  AlertTriangle,
  Loader2,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Lock,
  Globe,
  Heart,
} from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';
import { formatRelative } from '@/lib/utils';

interface ComplianceReport {
  id: string;
  framework: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string | null;
  findings?: ComplianceFinding[] | null;
  eventCount?: number;
  summary?: string | null;
}

interface ComplianceFinding {
  id: string;
  control: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  eventCount: number;
}

const frameworks = [
  {
    key: 'soc2',
    name: 'SOC 2',
    description: 'Service Organization Control 2 — Trust Services Criteria for security, availability, and confidentiality.',
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    key: 'hipaa',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act — PHI access logging and breach detection.',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    key: 'iso27001',
    name: 'ISO 27001',
    description: 'International standard for information security management systems (ISMS).',
    icon: Lock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    key: 'gdpr',
    name: 'GDPR',
    description: 'General Data Protection Regulation — Data processing, consent, and access audit trails.',
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

const statusBadge: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/20',
  completed: 'bg-success/20 text-success border border-success/30',
  failed: 'bg-destructive/10 text-destructive border border-destructive/20',
};

const findingStatusBadge: Record<string, string> = {
  pass: 'bg-success/20 text-success',
  fail: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
};

function ReportSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-16 rounded" />
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-5 w-20 rounded ml-auto" />
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: ComplianceReport[] }>('/dashboard/compliance-reports', {
        headers: apiHeaders(),
      });
      const data = Array.isArray(res) ? res : res.data ?? [];
      setReports(data);
    } catch {
      setError('Failed to load compliance reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Auto-refresh when any report is pending
  useEffect(() => {
    const hasPending = reports.some(r => r.status === 'pending');
    if (!hasPending) return;
    const interval = setInterval(() => fetchReports(), 5000);
    return () => clearInterval(interval);
  }, [reports, fetchReports]);

  async function generateReport(framework: string) {
    setGenerating(framework);
    setError(null);
    try {
      const res = await apiFetch<{ data: ComplianceReport }>('/dashboard/compliance-reports', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ framework }),
      });
      const created = (res as { data?: ComplianceReport }).data ?? (res as unknown as ComplianceReport);
      setReports((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate compliance reports against industry frameworks using your audit event data.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
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

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {frameworks.map((fw) => (
          <div
            key={fw.key}
            className={`border rounded-xl bg-card p-5 shadow-lg shadow-black/10 ${fw.bg}`}
          >
            <div className="flex items-start gap-4">
              <div className={`h-10 w-10 rounded-lg ${fw.bg} flex items-center justify-center shrink-0`}>
                <fw.icon className={`h-5 w-5 ${fw.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{fw.name}</h3>
                <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{fw.description}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => generateReport(fw.key)}
                disabled={generating === fw.key}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 w-full justify-center"
              >
                {generating === fw.key ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reports List */}
      <div className="mb-4">
        <h2 className="font-semibold text-lg tracking-tight">Generated Reports</h2>
        <p className="text-sm text-muted-foreground/60 mt-1">Previously generated compliance reports and their status.</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <ReportSkeleton />
            <ReportSkeleton />
            <ReportSkeleton />
          </>
        ) : reports.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center shadow-lg shadow-black/10">
            <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No reports generated yet. Select a framework above to get started.
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const fw = frameworks.find((f) => f.key === report.framework);
            const isExpanded = expandedReport === report.id;
            return (
              <div
                key={report.id}
                className="border border-border/60 rounded-xl bg-card shadow-lg shadow-black/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  className="w-full text-left p-5 flex items-center gap-4 hover:bg-secondary/15 transition-all"
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${fw?.bg || 'bg-primary/10 border-primary/20'}`}>
                    {fw ? <fw.icon className={`h-4 w-4 ${fw.color}`} /> : <FileText className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{fw?.name || report.framework} Report</p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      {formatRelative(report.createdAt)}
                      {report.eventCount !== undefined && ` \u00B7 ${report.eventCount.toLocaleString()} events analyzed`}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-md font-medium ${statusBadge[report.status] || statusBadge.pending}`}>
                    {report.status === 'pending' && <Clock className="h-3 w-3 inline mr-1" />}
                    {report.status === 'completed' && <Check className="h-3 w-3 inline mr-1" />}
                    {report.status}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/40 p-5 bg-secondary/10">
                    {report.summary && (
                      <div className="mb-4">
                        <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Summary</label>
                        <p className="text-sm mt-1 text-muted-foreground">{report.summary}</p>
                      </div>
                    )}

                    {report.findings && report.findings.length > 0 ? (
                      <div>
                        <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium mb-3 block">Findings</label>
                        <div className="space-y-2">
                          {report.findings.map((finding) => (
                            <div key={finding.id} className="flex items-start gap-3 bg-card border border-border/30 rounded-lg p-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium mt-0.5 ${findingStatusBadge[finding.status] || ''}`}>
                                {finding.status}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{finding.control}</p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">{finding.description}</p>
                              </div>
                              <span className="text-xs text-muted-foreground/50 font-mono shrink-0">
                                {finding.eventCount} events
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : report.status === 'pending' ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Report is being generated...
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/60">No findings data available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
