import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: { icon: 'w-5 h-5', text: 'text-base', gap: 'gap-1.5' },
  md: { icon: 'w-7 h-7', text: 'text-xl', gap: 'gap-2' },
  lg: { icon: 'w-9 h-9', text: 'text-2xl', gap: 'gap-2.5' },
  xl: { icon: 'w-14 h-14', text: 'text-5xl', gap: 'gap-3' },
};

export function Logo({ size = 'md', className }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      {/* Clipboard-check: represents audit trail / verified log */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(s.icon, 'shrink-0')}
        aria-hidden="true"
      >
        {/* Clipboard body */}
        <rect
          x="4"
          y="4"
          width="16"
          height="18"
          rx="2.5"
          className="fill-primary"
        />
        {/* Clipboard clip tab */}
        <rect
          x="8"
          y="2"
          width="8"
          height="4"
          rx="1.5"
          className="fill-primary"
          stroke="currentColor"
          strokeWidth="0"
        />
        <rect
          x="8.5"
          y="2.5"
          width="7"
          height="3"
          rx="1"
          className="fill-background"
        />
        {/* Check mark */}
        <path
          d="M8.5 13.5l2.5 2.5 4.5-5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary-foreground"
        />
        {/* Horizontal lines (log entries) */}
        <line x1="8" y1="9" x2="16" y2="9" strokeWidth="1.2" strokeLinecap="round" className="stroke-primary-foreground/40" />
      </svg>
      <span className={cn(s.text, 'font-bold tracking-tight text-foreground')}>
        Audit<span className="text-primary">Kit</span>
      </span>
    </span>
  );
}
