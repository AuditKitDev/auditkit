import Link from 'next/link';
import { Logo } from '@/components/logo';

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
