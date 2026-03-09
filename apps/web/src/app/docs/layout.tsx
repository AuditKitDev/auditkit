import Link from 'next/link';
import { Logo } from '@/components/logo';

const sections = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'sdk-reference', label: 'SDK Reference' },
  { id: 'framework-integrations', label: 'Framework Integrations' },
  { id: 'react-viewer', label: 'React Viewer' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'event-schema', label: 'Event Schema' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <Logo size="md" />
            </Link>
            <span className="text-muted-foreground text-sm ml-3">/</span>
            <span className="text-sm text-muted-foreground ml-1">Docs</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              Home
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Blog
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4 hidden md:block">
          <nav>
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
