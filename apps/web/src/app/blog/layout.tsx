import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata: Metadata = {
  alternates: {
    types: {
      'application/rss+xml': '/blog/rss.xml',
    },
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <Logo size="md" />
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Blog
            </Link>
            <Link
              href="/#features"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-muted-foreground text-sm">AGPLv3 + Commercial</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground transition">
                Docs
              </Link>
              <Link href="/blog" className="hover:text-foreground transition">
                Blog
              </Link>
              <Link href="/#pricing" className="hover:text-foreground transition">
                Pricing
              </Link>
            </div>
          </div>
          <div className="border-t border-border/40 pt-6 mb-6">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-3">Audit Logging Comparisons</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li><Link href="/compare/vanta" className="hover:text-foreground transition">vs Vanta</Link></li>
              <li><Link href="/compare/drata" className="hover:text-foreground transition">vs Drata</Link></li>
              <li><Link href="/compare/sprinto" className="hover:text-foreground transition">vs Sprinto</Link></li>
              <li><Link href="/compare/secureframe" className="hover:text-foreground transition">vs Secureframe</Link></li>
              <li><Link href="/compare/thoropass" className="hover:text-foreground transition">vs Thoropass</Link></li>
              <li><Link href="/compare/aikido" className="hover:text-foreground transition">vs Aikido</Link></li>
              <li><Link href="/compare/pangea" className="hover:text-foreground transition">vs Pangea</Link></li>
              <li><Link href="/compare/retraced" className="hover:text-foreground transition">vs Retraced</Link></li>
              <li><Link href="/compare/workos" className="hover:text-foreground transition">vs WorkOS</Link></li>
            </ul>
          </div>
          <div className="border-t border-border/40 pt-6">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-3">More from GrimLabs</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li><a href="https://chirpreply.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">ChirpReply</a></li>
              <li><a href="https://signalixiq.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">SignalixIQ</a></li>
              <li><a href="https://sitecrawliq.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">SiteCrawlIQ</a></li>
              <li><a href="https://datareconiq.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">DataReconIQ</a></li>
              <li><a href="https://cloakshare.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">CloakShare</a></li>
              <li><a href="https://marquiq.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">MarquIQ</a></li>
              <li><a href="https://rivalbeam.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">RivalBeam</a></li>
              <li><a href="https://coipulse.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">COIPulse</a></li>
              <li><a href="https://agentergon.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">AgentErgon</a></li>
              <li><a href="https://otdcheck.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">OTDCheck</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
