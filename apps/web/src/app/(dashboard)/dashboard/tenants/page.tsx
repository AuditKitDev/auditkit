'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Activity, Hash, ChevronRight } from 'lucide-react';
import { apiFetch, apiHeaders } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  externalId: string;
  eventCount?: number;
  createdAt: string;
  lastActivity?: string;
  chainStatus?: string;
  users?: number;
}

const chainColors: Record<string, string> = {
  verified: 'text-success',
  broken: 'text-destructive',
};

function SkeletonCard() {
  return (
    <div className="border border-border/60 rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-28" />
        </div>
        <div className="skeleton h-4 w-4" />
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Tenant[] }>('/v1/tenants', {
        headers: apiHeaders(),
      });
      const data = Array.isArray(res) ? res : (res as { data?: Tenant[] }).data ?? [];
      setTenants(data);
    } catch {
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.externalId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage tenant organizations and view their audit activity.
          </p>
        </div>
        {!loading && (
          <div className="text-right">
            <p className="text-2xl font-bold">{tenants.length}</p>
            <p className="text-xs text-muted-foreground/60">Total tenants</p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Search tenants by name or external ID..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-card border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/40 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tenant Cards */}
      <div className="space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredTenants.length === 0 ? (
          <div className="border border-border/60 rounded-xl bg-card p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No tenants match your search.' : 'No tenants found.'}
            </p>
          </div>
        ) : (
          filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="border border-border/60 rounded-xl bg-card p-5 card-hover transition-all cursor-pointer"
              onClick={() => {
                const params = new URLSearchParams({ tenant_id: tenant.externalId });
                window.location.href = `/dashboard/events?${params.toString()}`;
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">
                      {tenant.externalId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                    {tenant.eventCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {tenant.eventCount.toLocaleString()} events
                      </span>
                    )}
                    {tenant.users !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tenant.users} users
                      </span>
                    )}
                    {tenant.chainStatus && (
                      <span
                        className={`flex items-center gap-1 ${chainColors[tenant.chainStatus] || ''}`}
                      >
                        <Hash className="h-3 w-3" />
                        Chain {tenant.chainStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground/60">Created</p>
                  <p className="text-xs font-mono text-muted-foreground/60">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
