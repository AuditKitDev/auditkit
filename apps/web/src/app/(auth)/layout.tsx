import Link from 'next/link';
import { Logo } from '@/components/logo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In to AuditKit — Audit Log & SOC 2 Platform',
  description:
    'Sign in or create your AuditKit account. Tamper-proof audit logs, SOC 2 compliance automation, and evidence collection for B2B SaaS teams.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <Link href="/" className="group">
            <Logo size="xl" className="group-hover:scale-105 transition-transform" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
