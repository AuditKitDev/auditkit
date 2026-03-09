'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuditEvent, AuditSearchResponse } from '@auditkit/shared';

// --- Theme ---
export interface AuditLogTheme {
  mode?: 'light' | 'dark' | 'system';
  primaryColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

// --- Features ---
export interface AuditLogFeatures {
  search?: boolean;
  filters?: boolean;
  export?: boolean;
  realtime?: boolean;
  actorAvatars?: boolean;
}

// --- Props ---
export interface AuditLogProps {
  viewerToken: string;
  baseUrl?: string;
  theme?: AuditLogTheme;
  features?: AuditLogFeatures;
  locale?: string;
  emptyState?: React.ReactNode;
  onEventClick?: (event: AuditEvent) => void;
  className?: string;
}

// --- Severity colors ---
const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  info: { bg: '#27272a33', text: '#71717a' },
  warn: { bg: '#f59e0b33', text: '#f59e0b' },
  error: { bg: '#ef444433', text: '#ef4444' },
  critical: { bg: '#ef4444', text: '#ffffff' },
};

// --- Gravatar ---
function gravatarUrl(email: string, size = 32): string {
  // Generate a deterministic numeric hash from the email for avatar lookup
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(32, '0');
  return `https://www.gravatar.com/avatar/${hexHash}?s=${size}&d=identicon`;
}

// --- Format time ---
function formatTime(date: string): string {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * AuditLog — Embeddable audit log viewer component.
 *
 * Drop this into your customer-facing settings page to give
 * enterprise customers access to their own audit trail.
 *
 * @example
 * <AuditLog
 *   viewerToken={token}
 *   theme={{ primaryColor: '#6366f1' }}
 *   features={{ search: true, filters: true, export: true }}
 * />
 */
export function AuditLog({
  viewerToken,
  baseUrl = 'https://api.auditkit.dev',
  theme = {},
  features = { search: true, filters: true, export: true },
  locale: _locale = 'en',
  emptyState,
  onEventClick,
  className,
}: AuditLogProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    mode = 'dark',
    primaryColor = '#6366f1',
    borderRadius = '0.5rem',
    fontFamily = 'inherit',
  } = theme;

  const isDark = mode === 'dark' || (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const bgColor = isDark ? '#09090b' : '#ffffff';
  const cardColor = isDark ? '#0a0a0c' : '#fafafa';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';

  const fetchEvents = useCallback(
    async (append = false) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (searchQuery) params.set('query', searchQuery);
        if (append && cursor) params.set('cursor', cursor);

        const res = await fetch(`${baseUrl}/v1/events?${params}`, {
          headers: { Authorization: `Bearer ${viewerToken}` },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: AuditSearchResponse = await res.json();

        setEvents((prev) => (append ? [...prev, ...data.data] : data.data));
        setCursor(data.pagination.cursor);
        setHasMore(data.pagination.hasMore);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, viewerToken, searchQuery, cursor]
  );

  useEffect(() => {
    fetchEvents();
  }, [searchQuery]);

  // Realtime SSE connection
  useEffect(() => {
    if (!features.realtime) return;

    const MAX_SSE_EVENTS = 1000;
    const SSE_RECONNECT_DELAY = 3000;
    let abortController = new AbortController();
    let cancelled = false;

    async function connectSSE() {
      while (!cancelled) {
        try {
          abortController = new AbortController();
          const response = await fetch(`${baseUrl}/v1/events/stream`, {
            headers: {
              Authorization: `Bearer ${viewerToken}`,
              Accept: 'text/event-stream',
            },
            signal: abortController.signal,
          });

          if (!response.ok || !response.body) return;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            let currentEvent = '';
            let currentData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                currentEvent = line.slice(7);
              } else if (line.startsWith('data: ')) {
                currentData = line.slice(6);
              } else if (line === '' && currentEvent && currentData) {
                if (currentEvent === 'event' && currentData) {
                  try {
                    const eventData = JSON.parse(currentData) as AuditEvent;
                    setEvents((prev) => {
                      const updated = [eventData, ...prev];
                      // Cap at max events, drop oldest
                      return updated.length > MAX_SSE_EVENTS ? updated.slice(0, MAX_SSE_EVENTS) : updated;
                    });
                  } catch {
                    // Ignore parse errors
                  }
                }
                currentEvent = '';
                currentData = '';
              }
            }
          }

          // Stream ended unexpectedly, reconnect after delay
          if (!cancelled) {
            await new Promise((resolve) => setTimeout(resolve, SSE_RECONNECT_DELAY));
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError' || cancelled) {
            return;
          }
          // Reconnect after delay on error
          await new Promise((resolve) => setTimeout(resolve, SSE_RECONNECT_DELAY));
        }
      }
    }

    connectSSE();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [baseUrl, viewerToken, features.realtime]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`${baseUrl}/v1/events/export?format=csv`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.download_url, '_blank');
      }
    } catch {
      // Export failed silently — user can retry
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        fontFamily,
        backgroundColor: bgColor,
        color: textColor,
        borderRadius,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {features.search && (
          <input
            type="text"
            placeholder="Search audit events..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCursor(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              backgroundColor: isDark ? '#18181b' : '#f4f4f5',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              color: textColor,
              outline: 'none',
            }}
          />
        )}
        {features.export && (
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: mutedColor,
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Events List */}
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {loading && events.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: mutedColor }}>
            Loading events...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            {error}
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: mutedColor }}>
            {emptyState ?? 'No audit events found.'}
          </div>
        ) : (
          events.map((event) => {
            const severity = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.info;
            return (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  onEventClick?.(event);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  borderBottom: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? '#18181b' : '#f4f4f5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {/* Avatar */}
                {features.actorAvatars && event.actorEmail && (
                  <img
                    src={gravatarUrl(event.actorEmail)}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%' }}
                  />
                )}

                {/* Action badge */}
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'ui-monospace, monospace',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: severity.bg,
                    color: severity.text,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.action}
                </span>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{event.actorName ?? event.actorId}</strong>
                    {event.targetName && (
                      <span style={{ color: mutedColor }}>
                        {' → '}
                        {event.targetName}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <div style={{ fontSize: '12px', color: mutedColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.description}
                    </div>
                  )}
                </div>

                {/* Anomaly */}
                {event.isAnomalous && (
                  <span style={{ color: '#f59e0b', fontSize: '16px' }} title="Anomaly detected">
                    &#9888;
                  </span>
                )}

                {/* Time */}
                <span style={{ fontSize: '12px', color: mutedColor, whiteSpace: 'nowrap' }}>
                  {formatTime(event.occurredAt)}
                </span>
              </div>
            );
          })
        )}

        {/* Load More */}
        {hasMore && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={() => fetchEvents(true)}
              disabled={loading}
              style={{
                padding: '8px 24px',
                fontSize: '13px',
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: primaryColor,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <div
          style={{
            borderTop: `1px solid ${borderColor}`,
            padding: '20px',
            backgroundColor: cardColor,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px' }}>Event Detail</strong>
            <button
              onClick={() => setSelectedEvent(null)}
              style={{ background: 'none', border: 'none', color: mutedColor, cursor: 'pointer', fontSize: '18px' }}
            >
              &times;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</div>
              <div style={{ fontFamily: 'ui-monospace, monospace' }}>{selectedEvent.action}</div>
            </div>
            <div>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</div>
              <div>{selectedEvent.severity}</div>
            </div>
            <div>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actor</div>
              <div>{selectedEvent.actorName ?? selectedEvent.actorId}</div>
              {selectedEvent.actorEmail && <div style={{ color: mutedColor }}>{selectedEvent.actorEmail}</div>}
            </div>
            <div>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</div>
              <div>{selectedEvent.targetName ?? selectedEvent.targetId ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP Address</div>
              <div style={{ fontFamily: 'ui-monospace, monospace' }}>
                {selectedEvent.sourceIp ?? '—'} {selectedEvent.ipCountry && `(${selectedEvent.ipCountry})`}
              </div>
            </div>
            <div>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occurred At</div>
              <div style={{ fontFamily: 'ui-monospace, monospace' }}>{new Date(selectedEvent.occurredAt).toLocaleString()}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hash</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: mutedColor, wordBreak: 'break-all' }}>
                {selectedEvent.rowHash}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
