import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16">
      <div className="mx-auto w-full max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mt-3 text-4xl font-bold md:text-5xl tracking-tight">
          That page didn&apos;t make it past the audit.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          What most visitors are looking for is below.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Free
          </Link>
          <Link
            href="/#pricing"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
          >
            See Pricing
          </Link>
          <Link
            href="/"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
          >
            Home
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 text-left">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Compare</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link href="/compare/vanta" className="hover:text-foreground transition">vs Vanta</Link></li>
              <li><Link href="/compare/drata" className="hover:text-foreground transition">vs Drata</Link></li>
              <li><Link href="/compare/sprinto" className="hover:text-foreground transition">vs Sprinto</Link></li>
              <li><Link href="/compare/secureframe" className="hover:text-foreground transition">vs Secureframe</Link></li>
              <li><Link href="/compare/pangea" className="hover:text-foreground transition">vs Pangea</Link></li>
              <li><Link href="/compare/retraced" className="hover:text-foreground transition">vs Retraced</Link></li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Top Reads</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link href="/blog/soc-2-vs-iso-27001-which-first" className="hover:text-foreground transition">SOC 2 vs ISO 27001</Link></li>
              <li><Link href="/blog/audit-logging-ai-applications-soc-2-eu-ai-act" className="hover:text-foreground transition">AI App Audit Logging</Link></li>
              <li><Link href="/blog/soc-2-compliance-cost-breakdown-2026" className="hover:text-foreground transition">SOC 2 Cost Breakdown</Link></li>
              <li><Link href="/blog/build-vs-buy-audit-logging" className="hover:text-foreground transition">Build vs Buy Audit Logging</Link></li>
              <li><Link href="/blog/hash-chaining-tamper-proof-audit-logs" className="hover:text-foreground transition">Hash-Chained Audit Logs</Link></li>
              <li><Link href="/blog" className="text-primary hover:text-foreground transition">All articles →</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
