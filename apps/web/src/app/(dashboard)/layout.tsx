import { Sidebar } from '@/components/dashboard/sidebar';
import { EmailVerificationWrapper } from '@/components/dashboard/email-verification-wrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-background pt-[72px] md:pt-4">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          <EmailVerificationWrapper />
          {children}
        </div>
      </main>
    </div>
  );
}
