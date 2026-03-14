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

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AuditKit',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://auditkit.dev',
  description:
    'Open-source, tamper-evident audit logging platform for B2B SaaS. Drop-in SDKs, hash-chained immutability, tenant-scoped access, embeddable viewer, SIEM streaming, and compliance exports.',
  featureList: [
    'SHA-256 hash chain with Merkle tree proofs',
    'Tenant-scoped audit log isolation',
    'Embeddable React viewer component',
    'SIEM streaming (Splunk, Datadog, Elastic)',
    'Multi-language SDKs (TypeScript, Python, Go, Java)',
    'Self-hostable with Docker Compose',
    'Compliance exports (SOC 2, ISO 27001, HIPAA, GDPR)',
    'GraphQL API with real-time subscriptions',
    'AI anomaly detection',
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: '1K events/mo, 7-day retention, 1 project, 1 seat',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '39',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
      description: '50K events/mo, 90-day retention, embedded viewer, anomaly detection',
    },
    {
      '@type': 'Offer',
      name: 'Business',
      price: '99',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
      description: '500K events/mo, 1-year retention, SIEM streaming, compliance exports',
    },
    {
      '@type': 'Offer',
      name: 'Supersize + Milkshake',
      price: '349',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
      description: '5M events/mo, 7-year retention, Merkle tree proofs, SSO/SCIM, 99.99% SLA',
    },
  ],
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
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify reset".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{api_host:'${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'}',person_profiles:'identified_only'});`,
            }}
          />
        )}
      </head>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
