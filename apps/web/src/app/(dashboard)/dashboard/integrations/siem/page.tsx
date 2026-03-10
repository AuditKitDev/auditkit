'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Plus,
  BarChart3,
  Database,
  Cloud,
  Code2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Check,
  Loader2,
  Plug,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/toast';

interface SiemConnector {
  id: string;
  type: 'splunk' | 'datadog' | 's3' | 'custom_http';
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  splunk: 'Splunk HEC',
  datadog: 'Datadog',
  s3: 'AWS S3',
  custom_http: 'Custom HTTP',
};

const typeIcons: Record<string, typeof Server> = {
  splunk: BarChart3,
  datadog: Database,
  s3: Cloud,
  custom_http: Code2,
};

const typeColors: Record<string, string> = {
  splunk: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  datadog: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  s3: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  custom_http: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

interface HeaderPair {
  key: string;
  value: string;
}

export default function SiemPage() {
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<SiemConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [testingConn, setTestingConn] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [connType, setConnType] = useState<'splunk' | 'datadog' | 's3' | 'custom_http'>('splunk');
  const [connName, setConnName] = useState('');

  // Splunk
  const [hecUrl, setHecUrl] = useState('');
  const [hecToken, setHecToken] = useState('');

  // Datadog
  const [ddApiKey, setDdApiKey] = useState('');
  const [ddSite, setDdSite] = useState('us1');

  // S3
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');

  // Custom HTTP
  const [customUrl, setCustomUrl] = useState('');
  const [customHeaders, setCustomHeaders] = useState<HeaderPair[]>([{ key: '', value: '' }]);

  const fetchConnectors = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: SiemConnector[] }>('/dashboard/siem');
      setConnectors(data.data ?? []);
    } catch {
      // Failed to load connectors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function toggleConnector(id: string, currentlyActive: boolean) {
    const previousConnectors = [...connectors];
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
    try {
      await apiFetch(`/dashboard/siem/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentlyActive }),
      });
    } catch {
      setConnectors(previousConnectors);
      setError('Failed to toggle connector. Please try again.');
    }
  }

  async function deleteConnector(id: string) {
    setDeleting(true);
    try {
      await apiFetch(`/dashboard/siem/${id}`, {
        method: 'DELETE',
      });
      setConnectors((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
      toast('success', 'Connector deleted');
    } catch {
      setError('Failed to delete connector. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function testConnection(id: string) {
    setTestingConn(id);
    try {
      await apiFetch(`/dashboard/siem/${id}/test`, { method: 'POST' });
      toast('success', 'Connection test successful');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTestingConn(null);
    }
  }

  function buildConfig(): Record<string, unknown> {
    switch (connType) {
      case 'splunk':
        return { hecUrl, hecToken };
      case 'datadog':
        return { apiKey: ddApiKey, site: ddSite };
      case 's3':
        return { bucket: s3Bucket, region: s3Region, accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey };
      case 'custom_http': {
        const headers: Record<string, string> = {};
        customHeaders.forEach((h) => {
          if (h.key.trim()) headers[h.key.trim()] = h.value;
        });
        return { url: customUrl, headers };
      }
      default:
        return {};
    }
  }

  async function createConnector() {
    if (!connName.trim()) return;
    setFormError(null);

    // BUG-029: Validate required fields based on connector type
    if (connType === 'splunk') {
      if (!hecUrl.trim() || !hecToken.trim()) {
        setFormError('Splunk requires both HEC URL and HEC Token.');
        return;
      }
    } else if (connType === 'datadog') {
      if (!ddApiKey.trim()) {
        setFormError('Datadog requires an API Key.');
        return;
      }
    } else if (connType === 's3') {
      if (!s3Bucket.trim() || !s3Region.trim() || !s3AccessKey.trim() || !s3SecretKey.trim()) {
        setFormError('S3 requires Bucket, Region, Access Key, and Secret Key.');
        return;
      }
    } else if (connType === 'custom_http') {
      if (!customUrl.trim()) {
        setFormError('Custom HTTP requires an Endpoint URL.');
        return;
      }
    }

    setCreating(true);
    try {
      const created = await apiFetch<SiemConnector>('/dashboard/siem', {
        method: 'POST',
        body: JSON.stringify({
          type: connType,
          name: connName,
          config: buildConfig(),
        }),
      });
      setConnectors((prev) => [created, ...prev]);
      toast('success', 'SIEM connector created');
      resetForm();
    } catch {
      setError('Failed to create connector. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setConnName('');
    setConnType('splunk');
    setHecUrl('');
    setHecToken('');
    setDdApiKey('');
    setDdSite('us1');
    setS3Bucket('');
    setS3Region('us-east-1');
    setS3AccessKey('');
    setS3SecretKey('');
    setCustomUrl('');
    setCustomHeaders([{ key: '', value: '' }]);
    setFormError(null);
    setShowCreate(false);
  }

  function addHeader() {
    setCustomHeaders((prev) => [...prev, { key: '', value: '' }]);
  }

  function removeHeader(index: number) {
    setCustomHeaders((prev) => prev.filter((_, i) => i !== index));
  }

  function updateHeader(index: number, updates: Partial<HeaderPair>) {
    setCustomHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...updates } : h))
    );
  }

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 transition-all';
  const selectClass =
    'w-full px-3.5 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

  function renderConfigFields() {
    switch (connType) {
      case 'splunk':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">HEC URL</label>
              <input
                type="url"
                placeholder="https://splunk.example.com:8088/services/collector"
                value={hecUrl}
                onChange={(e) => setHecUrl(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">HEC Token</label>
              <input
                type="password"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={hecToken}
                onChange={(e) => setHecToken(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        );
      case 'datadog':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">API Key</label>
              <input
                type="password"
                placeholder="Your Datadog API key"
                value={ddApiKey}
                onChange={(e) => setDdApiKey(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Site</label>
              <select
                value={ddSite}
                onChange={(e) => setDdSite(e.target.value)}
                className={selectClass}
              >
                <option value="us1">US1 (datadoghq.com)</option>
                <option value="eu1">EU1 (datadoghq.eu)</option>
              </select>
            </div>
          </div>
        );
      case 's3':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Bucket Name</label>
              <input
                type="text"
                placeholder="my-audit-logs-bucket"
                value={s3Bucket}
                onChange={(e) => setS3Bucket(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Region</label>
              <input
                type="text"
                placeholder="us-east-1"
                value={s3Region}
                onChange={(e) => setS3Region(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Access Key ID</label>
              <input
                type="password"
                placeholder="AKIA..."
                value={s3AccessKey}
                onChange={(e) => setS3AccessKey(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Secret Access Key</label>
              <input
                type="password"
                placeholder="Secret key"
                value={s3SecretKey}
                onChange={(e) => setS3SecretKey(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        );
      case 'custom_http':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Endpoint URL</label>
              <input
                type="url"
                placeholder="https://api.example.com/ingest"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block font-medium">
                Custom Headers <span className="text-muted-foreground/50 font-normal">(optional)</span>
              </label>
              <div className="space-y-2">
                {customHeaders.map((header, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateHeader(i, { key: e.target.value })}
                      className={`${inputClass} flex-1`}
                    />
                    <input
                      type="text"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(i, { value: e.target.value })}
                      className={`${inputClass} flex-1`}
                    />
                    {customHeaders.length > 1 && (
                      <button
                        onClick={() => removeHeader(i)}
                        className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addHeader}
                className="mt-2 text-xs text-primary hover:text-primary/80 transition font-medium"
              >
                + Add header
              </button>
            </div>
          </div>
        );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SIEM Streaming</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stream audit events to your security infrastructure in real time.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all btn-shimmer"
        >
          <Plus className="h-4 w-4" />
          Add Connector
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Create Connector Form */}
      {showCreate && (
        <div className="border border-border/60 rounded-xl bg-card p-6 mb-6 shadow-lg shadow-black/10 gradient-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-lg">New SIEM Connector</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition"
              aria-label="Close create form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Connector Name</label>
                <input
                  type="text"
                  placeholder="e.g., Production Splunk"
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block font-medium">Type</label>
                <select
                  value={connType}
                  onChange={(e) => setConnType(e.target.value as typeof connType)}
                  className={selectClass}
                >
                  <option value="splunk">Splunk HEC</option>
                  <option value="datadog">Datadog</option>
                  <option value="s3">AWS S3</option>
                  <option value="custom_http">Custom HTTP</option>
                </select>
              </div>
            </div>

            {renderConfigFields()}

            {formError && (
              <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={createConnector}
                disabled={creating}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all btn-shimmer disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Connector
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connectors List */}
      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border border-border/60 rounded-xl bg-card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 skeleton" />
                    <div className="h-3 w-72 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && connectors.length === 0 && (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
            <Server className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No SIEM connectors configured.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Add a connector to stream audit events to your SIEM platform.
            </p>
          </div>
        )}

        {connectors.map((conn) => {
          const TypeIcon = typeIcons[conn.type] ?? Server;
          return (
            <div
              key={conn.id}
              className="border border-border/60 rounded-xl bg-card p-5 hover:bg-secondary/10 transition-all shadow-sm shadow-black/5 group card-hover"
            >
              <div className="flex items-center gap-4">
                {/* Type Icon */}
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${typeColors[conn.type] ?? 'bg-secondary/50 text-muted-foreground border-border/60'}`}
                >
                  <TypeIcon className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">{conn.name}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {typeLabels[conn.type] ?? conn.type}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        conn.is_active
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {conn.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {conn.last_sync_at
                      ? `Last sync: ${new Date(conn.last_sync_at).toLocaleString()}`
                      : 'No events streamed yet'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => testConnection(conn.id)}
                    disabled={testingConn === conn.id}
                    className="p-2 text-muted-foreground hover:text-primary transition rounded-lg hover:bg-secondary disabled:opacity-40"
                    title="Test connection"
                    aria-label="Test connection"
                  >
                    {testingConn === conn.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plug className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleConnector(conn.id, conn.is_active)}
                    className="p-2 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-secondary"
                    title={conn.is_active ? 'Deactivate' : 'Activate'}
                    aria-label={conn.is_active ? 'Deactivate connector' : 'Activate connector'}
                  >
                    {conn.is_active ? (
                      <ToggleRight className="h-5 w-5 text-success" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  {deleteConfirm === conn.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteConnector(conn.id)}
                        disabled={deleting}
                        className="px-2 py-1 text-xs bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs text-muted-foreground rounded-lg hover:bg-secondary transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(conn.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary"
                      title="Delete connector"
                      aria-label="Delete connector"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature list */}
      {!loading && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">Streaming Features</h2>
          <div className="border border-border/60 rounded-xl bg-card p-6 shadow-lg shadow-black/10">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Real-time streaming with <1s latency',
                'OCSF and CEF format support',
                'Automatic retry with exponential backoff',
                'HMAC-SHA256 signed payloads',
                'Per-tenant filtering and routing',
                'Compliance-ready export evidence',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
