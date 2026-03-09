'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, Download, AlertTriangle, ChevronDown, Loader2, X, Hash, FileDown, Radio, HelpCircle, Sparkles, Clock } from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';
import { formatRelative } from '@/lib/utils';

interface AuditEvent {
  id: string;
  action: string;
  actor: { name: string; email?: string | null };
  target?: { type: string; name: string } | null;
  tenant: string;
  tenant_id?: string;
  severity: string;
  is_anomalous: boolean;
  occurred_at: string;
  row_hash: string;
  source_ip: string;
  ip_country: string;
  description?: string | null;
  category?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;
  is_failure?: boolean;
}

interface EventsResponse {
  data: AuditEvent[];
  cursor?: string | null;
  has_more?: boolean;
  pagination?: {
    has_more: boolean;
    cursor: string | null;
  };
  total?: number;
}

const severityColors: Record<string, string> = {
  info: 'bg-primary/10 text-primary border border-primary/20',
  warn: 'bg-warning/10 text-warning border border-warning/20',
  error: 'bg-destructive/10 text-destructive border border-destructive/20',
  critical: 'bg-destructive text-destructive-foreground',
};

function SkeletonRow() {
  return (
    <tr>
      <td className="p-3.5"><div className="skeleton h-6 w-32" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-24 mb-1.5" /><div className="skeleton h-3 w-32" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-28" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-20" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-16" /></td>
      <td className="p-3.5"><div className="skeleton h-4 w-4" /></td>
    </tr>
  );
}

const quickFilters = [
  { label: 'Last 24h', query: 'after:now-24h' },
  { label: 'Last 7 days', query: 'after:now-7d' },
  { label: 'Errors only', query: 'severity:error' },
  { label: 'Critical', query: 'severity:critical' },
  { label: 'Anomalies', query: 'is_anomalous:true' },
];

const syntaxHelp = [
  { key: 'actor:', desc: 'Filter by actor name or email' },
  { key: 'action:', desc: 'Filter by action type' },
  { key: 'target:', desc: 'Filter by target type or name' },
  { key: 'severity:', desc: 'info, warn, error, critical' },
  { key: 'tenant:', desc: 'Filter by tenant ID' },
  { key: 'after:', desc: 'Events after date (ISO or now-24h)' },
  { key: 'before:', desc: 'Events before date' },
];

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  // Advanced search state
  const [nlpMode, setNlpMode] = useState(false);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const syntaxHelpRef = useRef<HTMLDivElement>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterTenant, setFilterTenant] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Live mode state
  const [liveMode, setLiveMode] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const isScrolledDownRef = useRef(false);

  const fetchEvents = useCallback(async (query: string, nextCursor?: string | null, useNlp?: boolean) => {
    const isLoadMore = !!nextCursor;
    requestAbortRef.current?.abort();
    const abortController = new AbortController();
    requestAbortRef.current = abortController;

    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (useNlp) params.set('nlp', 'true');
      if (nextCursor) params.set('cursor', nextCursor);
      const qs = params.toString();

      const res = await apiFetch<EventsResponse>(
        `/v1/events${qs ? `?${qs}` : ''}`,
        { headers: apiHeaders(), signal: abortController.signal }
      );

      if (isLoadMore) setEvents((prev) => [...prev, ...res.data]);
      else setEvents(res.data);
      setCursor(res.cursor ?? res.pagination?.cursor ?? null);
      setHasMore(res.has_more ?? res.pagination?.has_more ?? false);
      if (res.total !== undefined) setTotalCount(res.total);
      else if (!isLoadMore) setTotalCount(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchEvents(''); }, [fetchEvents]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchEvents(searchQuery, null, nlpMode), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, fetchEvents, nlpMode]);

  // Track scroll position to show "new events" counter
  useEffect(() => {
    function handleScroll() {
      if (tableRef.current) {
        const rect = tableRef.current.getBoundingClientRect();
        const scrolled = rect.top < -100;
        setIsScrolledDown(scrolled);
        isScrolledDownRef.current = scrolled;
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live mode SSE connection
  useEffect(() => {
    if (!liveMode) {
      // Clean up on disable
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setNewEventCount(0);
      return;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const headers = apiHeaders();
    const url = new URL(`${API_BASE}/v1/events/stream`);
    const abortController = new AbortController();

    async function connectSSE() {
      try {
        const response = await fetch(url.toString(), {
          headers: {
            ...headers,
            Accept: 'text/event-stream',
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7);
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '' && currentEvent && currentData) {
              // End of SSE message
              if (currentEvent === 'event' && currentData) {
                try {
                  const eventData = JSON.parse(currentData) as AuditEvent;
                  const shouldInsertIntoCurrentView = !searchQuery && !nlpMode;

                  if (shouldInsertIntoCurrentView) {
                    setEvents((prev) => [eventData, ...prev]);
                    if (isScrolledDownRef.current) {
                      setNewEventCount((c) => c + 1);
                    }
                  }
                } catch {
                  // Ignore parse errors
                }
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // SSE connection error - silently ignored
        }
      }
    }

    connectSSE();

    return () => {
      abortController.abort();
    };
  }, [liveMode, searchQuery, nlpMode]);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Close syntax help when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (syntaxHelpRef.current && !syntaxHelpRef.current.contains(e.target as Node)) {
        setShowSyntaxHelp(false);
      }
    }
    if (showSyntaxHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSyntaxHelp]);

  // Close filter panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    }
    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterPanel]);

  function applyFilters() {
    const parts: string[] = [];
    if (filterSeverity) parts.push(`severity:${filterSeverity}`);
    if (filterAction) parts.push(`action:${filterAction}`);
    if (filterTenant) parts.push(`tenant:${filterTenant}`);
    if (filterDateFrom) parts.push(`after:${filterDateFrom}`);
    if (filterDateTo) parts.push(`before:${filterDateTo}`);
    setSearchQuery(parts.join(' '));
    setActiveQuickFilter(null);
    setShowFilterPanel(false);
  }

  function clearFilters() {
    setFilterSeverity('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTenant('');
    setFilterAction('');
    setSearchQuery('');
    setActiveQuickFilter(null);
    setShowFilterPanel(false);
  }

  const activeFilterCount = [filterSeverity, filterDateFrom, filterDateTo, filterTenant, filterAction].filter(Boolean).length;

  function applyQuickFilter(filter: typeof quickFilters[number]) {
    if (activeQuickFilter === filter.label) {
      setActiveQuickFilter(null);
      setSearchQuery('');
    } else {
      setActiveQuickFilter(filter.label);
      setSearchQuery(filter.query);
    }
  }

  async function triggerExport(format: 'csv' | 'json') {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const body: Record<string, string> = { format };
      if (searchQuery) body.query = searchQuery;

      const res = await fetch(`${API_BASE}/dashboard/exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-events.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNewEventCount(0);
  }

  return (
    <div>
      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .live-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }
        .event-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse and search audit events across all tenants.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Toggle */}
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-full font-medium transition-all ${
              liveMode
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-card border border-border/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {liveMode ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 live-dot" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            ) : (
              <Radio className="h-3.5 w-3.5" />
            )}
            Live
          </button>

          {/* Export */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all font-medium"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export
              <ChevronDown className="h-3 w-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border/60 rounded-xl shadow-xl shadow-black/20 z-50 overflow-hidden">
                <button
                  onClick={() => triggerExport('csv')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4 text-muted-foreground" />
                  Export CSV
                </button>
                <button
                  onClick={() => triggerExport('json')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all flex items-center gap-2 border-t border-border/30"
                >
                  <FileDown className="h-4 w-4 text-muted-foreground" />
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New events banner (shown when scrolled down in live mode) */}
      {liveMode && newEventCount > 0 && isScrolledDown && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-500/90 text-white rounded-full shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 transition-all backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 live-dot" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            {newEventCount} new event{newEventCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            {nlpMode ? (
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            )}
            <input
              type="text"
              placeholder={nlpMode
                ? 'Try: "Show me all admin actions last week" or "Failed logins from unusual IPs"'
                : 'Search: actor:john action:login severity:error after:2024-01-01'
              }
              className={`w-full pl-10 pr-10 py-3 text-sm bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all ${
                nlpMode ? 'border-purple-500/30' : 'border-border/60'
              }`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveQuickFilter(null);
              }}
            />
            {/* Syntax help tooltip */}
            {!nlpMode && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2" ref={syntaxHelpRef}>
                <button
                  onClick={() => setShowSyntaxHelp(!showSyntaxHelp)}
                  className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition"
                  title="Search syntax help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
                {showSyntaxHelp && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border/60 rounded-xl shadow-xl shadow-black/20 z-50 p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Query Syntax</p>
                    <div className="space-y-1.5">
                      {syntaxHelp.map((item) => (
                        <div key={item.key} className="flex items-start gap-2">
                          <code className="text-[11px] font-mono bg-secondary/50 px-1.5 py-0.5 rounded text-primary shrink-0">{item.key}</code>
                          <span className="text-[11px] text-muted-foreground/60">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground/40">
                        Combine filters: <code className="bg-secondary/50 px-1 rounded">actor:admin action:delete severity:error</code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NLP Toggle */}
          <button
            onClick={() => {
              setNlpMode(!nlpMode);
              setSearchQuery('');
              setActiveQuickFilter(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm rounded-xl font-medium transition-all whitespace-nowrap ${
              nlpMode
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'bg-card border border-border/60 text-muted-foreground hover:bg-secondary'
            }`}
            title="Toggle natural language search"
          >
            <Sparkles className="h-4 w-4" />
            NLP
          </button>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-2 px-5 py-3 text-sm border rounded-xl hover:bg-secondary transition-all font-medium ${
                activeFilterCount > 0
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border/60'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 text-[10px] font-bold bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>
            {showFilterPanel && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/60 rounded-xl shadow-xl shadow-black/20 z-50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold">Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Severity</label>
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-secondary border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">All severities</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Action</label>
                    <input
                      type="text"
                      placeholder="e.g., document.* or user.login"
                      value={filterAction}
                      onChange={(e) => setFilterAction(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-secondary border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Tenant</label>
                    <input
                      type="text"
                      placeholder="e.g., acme-corp"
                      value={filterTenant}
                      onChange={(e) => setFilterTenant(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-secondary border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">From</label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-secondary border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">To</label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-secondary border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <button
                    onClick={applyFilters}
                    className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 mt-3">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
          {quickFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => applyQuickFilter(filter)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all border ${
                activeQuickFilter === filter.label
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-secondary/50 border-border/40 text-muted-foreground/60 hover:text-muted-foreground hover:border-border/60'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Result count */}
      {!loading && events.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{events.length}</span>
            {totalCount !== null && totalCount > events.length && (
              <> of <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span></>
            )}
            {' '}event{events.length !== 1 ? 's' : ''}
            {searchQuery && <> matching <code className="text-[11px] bg-secondary/50 px-1 rounded">{searchQuery}</code></>}
          </p>
        </div>
      )}

      {/* Events Table */}
      <div ref={tableRef} className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/20">
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Action</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Actor</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Target</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Tenant</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 text-xs uppercase tracking-wider">Time</th>
              <th className="text-left p-3.5 font-medium text-muted-foreground/70 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {loading ? (
              <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No events match your search.' : 'No events found.'}
                  </p>
                </td>
              </tr>
            ) : (
              events.map((event, index) => (
                <tr
                  key={event.id}
                  className={`hover:bg-secondary/15 transition-all cursor-pointer ${
                    liveMode && index === 0 ? 'event-slide-in' : ''
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <td className="p-3.5">
                    <span className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-medium ${severityColors[event.severity] || severityColors.info}`}>
                      {event.action}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-sm">{event.actor?.name || '--'}</p>
                    {event.actor?.email && (
                      <p className="text-xs text-muted-foreground/50 mt-0.5">{event.actor.email}</p>
                    )}
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {event.target ? `${event.target.type}: ${event.target.name}` : <span className="text-muted-foreground/30">&mdash;</span>}
                  </td>
                  <td className="p-3.5 text-muted-foreground font-mono text-xs">{event.tenant || event.tenant_id}</td>
                  <td className="p-3.5 text-muted-foreground/60 font-mono text-xs">
                    {formatRelative(event.occurred_at)}
                  </td>
                  <td className="p-3.5">
                    {event.is_anomalous && (
                      <div className="w-6 h-6 rounded-md bg-warning/10 border border-warning/20 flex items-center justify-center">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchEvents(searchQuery, cursor)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-8 py-2.5 text-sm border border-border/60 rounded-xl hover:bg-secondary transition-all disabled:opacity-50 font-medium"
          >
            {loadingMore ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Loading...</>
            ) : (
              'Load more events'
            )}
          </button>
        </div>
      )}

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setSelectedEvent(null)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[500px] bg-card border-l border-border/60 shadow-2xl shadow-black/40 z-50 overflow-y-auto animate-slide-in-right">
            <div className="p-7">
              <div className="flex items-center justify-between mb-7">
                <h2 className="font-bold text-lg tracking-tight">Event Detail</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                  <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Action</label>
                  <p className="font-mono text-sm mt-1.5 font-medium">{selectedEvent.action}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Actor</label>
                    <p className="text-sm mt-1.5 font-medium">{selectedEvent.actor?.name || '--'}</p>
                    {selectedEvent.actor?.email && (
                      <p className="text-xs text-muted-foreground/50 mt-0.5">{selectedEvent.actor.email}</p>
                    )}
                  </div>
                  {selectedEvent.target && (
                    <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                      <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Target</label>
                      <p className="text-sm mt-1.5 font-medium">
                        {selectedEvent.target.type}: {selectedEvent.target.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Tenant</label>
                    <p className="text-sm mt-1.5 font-mono">{selectedEvent.tenant || selectedEvent.tenant_id}</p>
                  </div>
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Severity</label>
                    <p className="mt-1.5">
                      <span className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-medium ${severityColors[selectedEvent.severity] || severityColors.info}`}>
                        {selectedEvent.severity}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                  <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Occurred At</label>
                  <p className="font-mono text-sm mt-1.5">{selectedEvent.occurred_at}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Source IP</label>
                    <p className="font-mono text-sm mt-1.5">{selectedEvent.source_ip || '--'}</p>
                  </div>
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Country</label>
                    <p className="text-sm mt-1.5">{selectedEvent.ip_country || '--'}</p>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Description</label>
                    <p className="text-sm mt-1.5">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.category && (
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Category</label>
                    <p className="text-sm mt-1.5 font-medium">{selectedEvent.category}</p>
                  </div>
                )}

                {selectedEvent.is_failure && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                    <label className="text-[11px] text-destructive/80 uppercase tracking-widest font-medium">Failure</label>
                    <p className="text-sm mt-1.5 text-destructive">
                      {selectedEvent.error_message || 'This action failed.'}
                    </p>
                  </div>
                )}

                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Tags</label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedEvent.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">Metadata</label>
                    <pre className="text-xs font-mono mt-2 text-muted-foreground/80 bg-background/50 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedEvent.is_anomalous && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-warning text-sm font-semibold mb-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Anomaly Detected
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This event was flagged by heuristic anomaly detection rules.
                    </p>
                  </div>
                )}

                <div className="bg-secondary/20 border border-border/30 rounded-xl p-4">
                  <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    Row Hash
                  </label>
                  <p className="font-mono text-xs mt-1.5 text-muted-foreground/70 break-all leading-relaxed">
                    {selectedEvent.row_hash}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
