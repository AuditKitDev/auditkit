import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CTASection({
  title = 'Ready to get started?',
  description = 'Get SOC 2 ready with tamper-proof evidence from $99/mo. No sales call required.',
  primaryHref = '/signup',
  primaryLabel = 'Start Free Trial',
  secondaryHref = 'https://github.com/auditkit/auditkit',
  secondaryLabel = 'View on GitHub',
}: CTASectionProps) {
  return (
    <section className="max-w-4xl mx-auto px-6 pb-28">
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4">{title}</h2>
        <p className="text-muted-foreground text-lg mb-8">{description}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href={primaryHref}
            className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition btn-shimmer font-medium inline-flex items-center gap-2"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryHref}
            className="text-sm border border-border px-6 py-3 rounded-lg hover:bg-secondary/50 transition font-medium"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
