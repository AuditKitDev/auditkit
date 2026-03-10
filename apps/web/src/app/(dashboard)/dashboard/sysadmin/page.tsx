'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  FolderKanban,
  Activity,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalEvents: number;
  signupsLast30d: number;
  activeSessions: number;
  eventsLast24h: number;
}

interface LogEntry {
  id: number;
  actorEmail: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface UserEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

type Tab = 'logs' | 'users';

const actionColors: Record<string, string> = {
  'user.signup': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'user.login': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'user.logout': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'api_key.created': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'project.created': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'webhook.created': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'billing.checkout': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function SysadminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userList, setUserList] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('logs');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [usersOffset, setUsersOffset] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 50;

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<Stats>('/dashboard/sysadmin/stats');
      setStats(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('403')) {
        setError('Access denied. Sysadmin privileges required.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (newOffset = 0, action = '') => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(newOffset) });
      if (action) params.set('action', action);
      const data = await apiFetch<{ data: LogEntry[]; total: number }>(`/dashboard/sysadmin/logs?${params}`);
      setLogs(data.data);
      setTotal(data.total);
      setOffset(newOffset);
    } catch {
      // Stats error already shown
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (newOffset = 0) => {
    setUsersLoading(true);
    try {
      const data = await apiFetch<{ data: UserEntry[]; total: number }>(
        `/dashboard/sysadmin/users?limit=${limit}&offset=${newOffset}`
      );
      setUserList(data.data);
      setUsersTotal(data.total);
      setUsersOffset(newOffset);
    } catch {
      // Non-critical
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchActions = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: string[] }>('/dashboard/sysadmin/actions');
      setActionOptions(data.data);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchActions();
  }, [fetchStats, fetchLogs, fetchActions]);

  useEffect(() => {
    if (tab === 'users' && userList.length === 0) {
      fetchUsers();
    }
  }, [tab, userList.length, fetchUsers]);

  function handleActionFilter(action: string) {
    setActionFilter(action);
    fetchLogs(0, action);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-12 w-12 text-destructive/30 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Admin</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Platform-wide activity logs and user management.</p>
          </div>
        </div>
        <button
          onClick={() => { fetchStats(); fetchLogs(0, actionFilter); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-border/60 rounded-xl bg-card p-4 shadow-lg shadow-black/10">
              <div className="skeleton h-3 w-20 mb-2" />
              <div className="skeleton h-7 w-12" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Users', value: formatNumber(stats.totalUsers), icon: Users, color: 'text-blue-400' },
            { label: 'Total Projects', value: formatNumber(stats.totalProjects), icon: FolderKanban, color: 'text-purple-400' },
            { label: 'Total Events', value: formatNumber(stats.totalEvents), icon: Activity, color: 'text-emerald-400' },
            { label: 'Signups (30d)', value: formatNumber(stats.signupsLast30d), icon: Users, color: 'text-amber-400' },
            { label: 'Active Sessions', value: formatNumber(stats.activeSessions), icon: Clock, color: 'text-indigo-400' },
            { label: 'Events (24h)', value: formatNumber(stats.eventsLast24h), icon: Activity, color: 'text-pink-400' },
          ].map((stat) => (
            <div key={stat.label} className="border border-border/60 rounded-xl bg-card p-4 shadow-lg shadow-black/10">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">{stat.label}</p>
              </div>
              <p className="text-xl font-bold font-mono">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border/40">
        {(['logs', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px capitalize ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'logs' ? 'Activity Logs' : 'Users'}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search logs by email, action, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => handleActionFilter(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 text-sm bg-card border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
              >
                <option value="">All actions</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            </div>
          </div>

          {/* Logs Table */}
          <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/20">
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Time</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Actor</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Action</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Resource</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {logsLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="p-3.5"><div className="skeleton h-4 w-28" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-36" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-24" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-20" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-24" /></td>
                    </tr>
                  ))
                ) : filteredLogs(logs, searchQuery).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No activity logs found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs(logs, searchQuery).map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/15 transition-all">
                      <td className="p-3.5 text-xs font-mono text-muted-foreground/60 whitespace-nowrap">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="p-3.5">
                        <span className="text-sm font-medium">{log.actorEmail}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-medium border ${actionColors[log.action] || 'bg-secondary/50 text-muted-foreground border-border/30'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground font-mono">
                        {log.resourceType ? `${log.resourceType}` : <span className="text-muted-foreground/30">&mdash;</span>}
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground/60 font-mono">
                        {log.ipAddress || <span className="text-muted-foreground/30">&mdash;</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {offset + 1}&ndash;{Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(Math.max(0, offset - limit), actionFilter)}
                  disabled={offset === 0}
                  className="p-2 border border-border/60 rounded-lg hover:bg-secondary transition disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchLogs(offset + limit, actionFilter)}
                  disabled={offset + limit >= total}
                  className="p-2 border border-border/60 rounded-lg hover:bg-secondary transition disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <>
          <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/20">
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Verified</th>
                  <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {usersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="p-3.5"><div className="skeleton h-4 w-32" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-40" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-16" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-12" /></td>
                      <td className="p-3.5"><div className="skeleton h-4 w-24" /></td>
                    </tr>
                  ))
                ) : userList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No users found.</p>
                    </td>
                  </tr>
                ) : (
                  userList.map((u) => (
                    <tr key={u.id} className="hover:bg-secondary/15 transition-all">
                      <td className="p-3.5 font-medium">{u.name}</td>
                      <td className="p-3.5 text-muted-foreground font-mono text-xs">{u.email}</td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          u.role === 'sysadmin'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          u.emailVerified
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning'
                        }`}>
                          {u.emailVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground/60 font-mono">
                        {formatTime(u.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Users Pagination */}
          {usersTotal > limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {usersOffset + 1}&ndash;{Math.min(usersOffset + limit, usersTotal)} of {usersTotal}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchUsers(Math.max(0, usersOffset - limit))}
                  disabled={usersOffset === 0}
                  className="p-2 border border-border/60 rounded-lg hover:bg-secondary transition disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchUsers(usersOffset + limit)}
                  disabled={usersOffset + limit >= usersTotal}
                  className="p-2 border border-border/60 rounded-lg hover:bg-secondary transition disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function filteredLogs(logs: LogEntry[], query: string): LogEntry[] {
  if (!query.trim()) return logs;
  const q = query.toLowerCase();
  return logs.filter(
    (log) =>
      log.actorEmail.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.ipAddress && log.ipAddress.includes(q)) ||
      (log.resourceType && log.resourceType.toLowerCase().includes(q))
  );
}
