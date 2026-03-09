import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AuditKit — Audit logs for B2B SaaS',
    template: '%s | AuditKit',
  },
  description:
    'Drop-in audit logs for B2B SaaS. Open source, tamper-evident, enterprise-ready. Ship immutable, tenant-scoped audit trails in minutes.',
  keywords: [
    'audit logs',
    'audit trail',
    'B2B SaaS',
    'SOC 2',
    'compliance',
    'tamper-proof logs',
    'hash chaining',
    'multi-tenant',
    'enterprise audit logging',
    'open source audit logs',
  ],
  alternates: {
    canonical: 'https://auditkit.dev',
  },
  openGraph: {
    title: 'AuditKit — Audit logs for B2B SaaS',
    description:
      'Drop-in audit logs for B2B SaaS. Open source, tamper-evident, enterprise-ready.',
    url: 'https://auditkit.dev',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuditKit — Audit logs for B2B SaaS',
    description:
      'Drop-in audit logs for B2B SaaS. Open source, tamper-evident, enterprise-ready.',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AuditKit',
  url: 'https://auditkit.dev',
  description:
    'Open-source, tamper-evident audit logging for B2B SaaS. Ship immutable, tenant-scoped audit trails in minutes.',
  sameAs: ['https://github.com/AuditKitDev/auditkit'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('auditkit_theme');if(t==='light'||t==='dark'){document.documentElement.className=t}else if(window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.className='light'}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
