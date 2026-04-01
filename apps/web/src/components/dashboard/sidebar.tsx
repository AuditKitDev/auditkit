'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { apiFetch, apiHeaders } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import {
  LayoutDashboard,
  List,
  Users,
  Plug,
  ShieldCheck,
  Settings,
  FileText,
  Webhook,
  Bell,
  Key,
  Clock,
  UserPlus,
  CreditCard,
  Server,
  HelpCircle,
  ExternalLink,
  X,
  AlertTriangle,
  Shield,
  Globe,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

const navigation = [
  { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { name: 'Events', href: '/dashboard/events', icon: List },
  { name: 'Tenants', href: '/dashboard/tenants', icon: Users },
  {
    name: 'Integrations',
    icon: Plug,
    children: [
      { name: 'Webhooks', href: '/dashboard/integrations/webhooks', icon: Webhook },
      { name: 'Notifications', href: '/dashboard/integrations/notifications', icon: Bell },
      { name: 'SIEM', href: '/dashboard/integrations/siem', icon: Server, badge: 'ee' },
    ],
  },
  { name: 'Verification', href: '/dashboard/verification', icon: ShieldCheck },
  { name: 'Compliance', href: '/dashboard/compliance', icon: FileText },
  { name: 'Anomalies', href: '/dashboard/anomalies', icon: AlertTriangle },
  {
    name: 'SOC 2 Prep',
    icon: Shield,
    children: [
      { name: 'Readiness', href: '/dashboard/soc2/readiness', icon: ShieldCheck },
      { name: 'Evidence', href: '/dashboard/soc2/evidence', icon: FileText },
      { name: 'Policies', href: '/dashboard/soc2/policies', icon: FileText },
      { name: 'Access Reviews', href: '/dashboard/soc2/access-reviews', icon: Users },
      { name: 'Vendors', href: '/dashboard/soc2/vendors', icon: Globe },
      { name: 'Risks', href: '/dashboard/soc2/risks', icon: AlertTriangle },
      { name: 'Incidents', href: '/dashboard/soc2/incidents', icon: AlertTriangle },
      { name: 'Personnel', href: '/dashboard/soc2/personnel', icon: Users },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'API Keys', href: '/dashboard/settings/api-keys', icon: Key },
      { name: 'Retention', href: '/dashboard/settings/retention', icon: Clock },
      { name: 'Redaction', href: '/dashboard/settings/redaction', icon: Shield },
      { name: 'Signing Keys', href: '/dashboard/settings/signing', icon: Key },
      { name: 'Data Residency', href: '/dashboard/settings/residency', icon: Globe },
      { name: 'Team', href: '/dashboard/settings/team', icon: UserPlus },
      { name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
    ],
  },
];

interface ProjectInfo {
  name: string;
  environment: string;
}

interface UsageInfo {
  eventsThisMonth: number;
  limit: number;
  plan: string;
  resetsAt: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isSysadmin, setIsSysadmin] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Fetch project and usage data
  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [projectsRes, usageRes, meRes] = await Promise.allSettled([
          apiFetch<{ data: { id: string; name: string }[] }>('/dashboard/projects', { headers: apiHeaders() }),
          apiFetch<{ events_this_month: number; limit: number; plan: string; resets_at: string }>('/billing/subscription', { headers: apiHeaders() }),
          apiFetch<{ role: string }>('/dashboard/me', { headers: apiHeaders() }),
        ]);
        if (projectsRes.status === 'fulfilled' && projectsRes.value.data.length > 0) {
          setProject({ name: projectsRes.value.data[0].name, environment: 'Production' });
        }
        if (meRes.status === 'fulfilled' && meRes.value.role === 'sysadmin') {
          setIsSysadmin(true);
        }
        if (usageRes.status === 'fulfilled') {
          const u = usageRes.value;
          setUsage({
            eventsThisMonth: u.events_this_month ?? 0,
            limit: u.limit ?? 10000,
            plan: u.plan ?? 'Free',
            resetsAt: u.resets_at ?? '',
          });
        }
      } catch {
        // Sidebar data is non-critical, fail silently
      }
    }
    loadSidebarData();
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch { /* logout may fail if session already expired */ }
    clearToken();
    window.location.href = '/login';
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border/60">
        <Link href="/dashboard/overview" className="flex items-center">
          <Logo size="md" />
        </Link>
        {/* Close button -- visible only on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Project selector */}
      <div className="px-3 pt-4 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-all text-sm">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">
            {(project?.name ?? 'P').charAt(0).toUpperCase()}
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{project?.name ?? 'My Project'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{project?.environment ?? 'Production'}</p>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-0.5">
          {/* Sysadmin link — only visible to sysadmin users */}
          {isSysadmin && (() => {
            const isActive = pathname === '/dashboard/sysadmin';
            return (
              <li>
                <Link
                  href="/dashboard/sysadmin"
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-destructive/10 text-destructive font-medium'
                      : 'text-destructive/70 hover:text-destructive hover:bg-destructive/5'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  System Admin
                </Link>
              </li>
            );
          })()}
          {navigation.map((item) => {
            if (item.children) {
              return (
                <li key={item.name}>
                  <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mt-6 first:mt-2">
                    <item.icon className="h-3.5 w-3.5" />
                    {item.name}
                  </div>
                  <ul className="space-y-0.5 ml-1">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            onClick={handleNavClick}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium nav-active-glow'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 glow-hover'
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.name}
                            {child.badge && (
                              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-semibold border border-primary/20">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="p-3 space-y-3 border-t border-border/60">
        {/* Quick links */}
        <div className="flex items-center gap-2">
          <Link
            href="/docs"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition rounded-md hover:bg-secondary/50"
          >
            <FileText className="h-3.5 w-3.5" />
            Docs
          </Link>
          <a
            href="https://github.com/AuditKitDev/auditkit/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition rounded-md hover:bg-secondary/50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Support
          </a>
          <a
            href="https://github.com/AuditKitDev/auditkit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition rounded-md hover:bg-secondary/50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            GitHub
          </a>
          <button
            onClick={() => { localStorage.removeItem('auditkit_onboarding_complete'); window.location.reload(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition rounded-md hover:bg-secondary/50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Setup
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-destructive transition rounded-md hover:bg-destructive/10"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
          <ThemeToggle />
        </div>

        {/* Usage meter */}
        <div className="bg-secondary/30 rounded-lg p-3 border border-border/30">
          <div className="flex justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground">Events this month</span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {usage ? `${usage.eventsThisMonth.toLocaleString()} / ${usage.limit >= 1000 ? `${Math.round(usage.limit / 1000)}K` : usage.limit}` : '-- / --'}
            </span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${usage ? Math.min((usage.eventsThisMonth / usage.limit) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            {usage?.plan ?? 'Free'} plan
            {usage?.resetsAt && <> &middot; Resets {new Date(usage.resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="mobile-header md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="hamburger-btn"
          aria-label="Toggle navigation"
        >
          <span className={cn('hamburger-line', mobileOpen && 'hamburger-open-1')} />
          <span className={cn('hamburger-line', mobileOpen && 'hamburger-open-2')} />
          <span className={cn('hamburger-line', mobileOpen && 'hamburger-open-3')} />
        </button>
        <Link href="/dashboard/overview" className="flex items-center">
          <Logo size="sm" />
        </Link>
        <div className="flex-1" />
      </div>

      {/* Mobile backdrop */}
      <div
        className={cn(
          'mobile-sidebar-backdrop',
          mobileOpen ? 'mobile-sidebar-backdrop-visible' : 'mobile-sidebar-backdrop-hidden'
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] border-r border-border/60 bg-card/50 flex-col h-screen sticky top-0 shrink-0 sidebar-glow">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <aside
        className={cn(
          'mobile-sidebar',
          mobileOpen ? 'mobile-sidebar-open' : 'mobile-sidebar-closed'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
