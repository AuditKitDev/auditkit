import type { Metadata } from 'next';
import { Terminal, BookOpen, Blocks, Eye, Globe, Key, FileJson } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation: SDK, API & Integration Guide',
  description:
    'Complete AuditKit developer documentation. TypeScript SDK reference, REST API endpoints, React viewer component, framework integrations for Next.js, Hono, and Drizzle.',
  alternates: { canonical: 'https://auditkit.dev/docs' },
  openGraph: {
    title: 'Documentation — AuditKit SDK, API & Integration Guide',
    description:
      'Complete developer documentation. TypeScript SDK, REST API, React viewer, and framework integrations for Next.js, Hono, and Drizzle.',
    url: 'https://auditkit.dev/docs',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentation — AuditKit SDK, API & Integration Guide',
    description:
      'Complete developer documentation. TypeScript SDK, REST API, React viewer, and framework integrations.',
  },
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden my-4">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/50">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono">
        <code className="text-muted-foreground">{children}</code>
      </pre>
    </div>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-bold mt-16 mb-6 flex items-center gap-3 scroll-mt-24">
      <Icon className="h-6 w-6 text-primary" />
      {children}
    </h2>
  );
}

function MethodCard({
  name,
  description,
  signature,
}: {
  name: string;
  description: string;
  signature: string;
}) {
  return (
    <div className="border border-border rounded-lg p-5 bg-card mb-4">
      <h4 className="font-semibold font-mono text-sm text-primary mb-1">{name}</h4>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <pre className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded-md p-3 overflow-x-auto">
        {signature}
      </pre>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  const methodColor =
    method === 'GET'
      ? 'bg-success/20 text-success'
      : method === 'POST'
        ? 'bg-primary/20 text-primary'
        : 'bg-warning/20 text-warning';

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-3 flex items-start gap-4">
      <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${methodColor} shrink-0`}>
        {method}
      </span>
      <div>
        <code className="text-sm font-mono">{path}</code>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">Documentation</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Everything you need to integrate AuditKit into your application. Ship tamper-evident,
        tenant-scoped audit logs in minutes.
      </p>

      {/* Quick Start */}
      <SectionHeading id="quick-start" icon={BookOpen}>
        Quick Start
      </SectionHeading>

      <p className="text-muted-foreground mb-4">
        Install the SDK and send your first audit event in under 5 minutes.
      </p>

      <h3 className="text-lg font-semibold mb-3">1. Install</h3>
      <CodeBlock title="terminal">npm install @auditkit/sdk</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-6">2. Initialize</h3>
      <CodeBlock title="app.ts">{`import { AuditKit } from '@auditkit/sdk';

const audit = new AuditKit({
  apiKey: process.env.AUDITKIT_API_KEY!,
  // Optional: baseUrl for self-hosted
  // baseUrl: 'https://audit.yourcompany.com',
});`}</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-6">3. Log your first event</h3>
      <CodeBlock title="app.ts">{`await audit.log('document.updated', {
  actor: { id: 'user_123', name: 'Jane Doe', email: 'jane@acme.com' },
  target: { type: 'document', id: 'doc_456', name: 'Q4 Report' },
  tenantId: 'org_acme',
  metadata: { ip: '203.0.113.1', userAgent: 'Mozilla/5.0...' },
});`}</CodeBlock>

      {/* SDK Reference */}
      <SectionHeading id="sdk-reference" icon={Terminal}>
        SDK Reference
      </SectionHeading>

      <p className="text-muted-foreground mb-6">
        The <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">AuditKit</code>{' '}
        class provides the following methods:
      </p>

      <MethodCard
        name="log(action, options)"
        description="Log a single audit event. Returns the created event with its hash."
        signature={`await audit.log('user.signed_in', {
  actor: { id: 'user_123', name: 'Jane Doe' },
  tenantId: 'org_acme',
  severity: 'info', // 'info' | 'warn' | 'error' | 'critical'
});`}
      />

      <MethodCard
        name="logMany(events)"
        description="Bulk-log multiple audit events in a single request. More efficient for high-volume ingestion."
        signature={`await audit.logMany([
  { action: 'file.uploaded', actor: { id: 'u1' }, tenantId: 'org_1' },
  { action: 'file.uploaded', actor: { id: 'u2' }, tenantId: 'org_1' },
]);`}
      />

      <MethodCard
        name="search(query)"
        description="Search audit events with filters. Supports full-text search, date ranges, and field filters."
        signature={`const results = await audit.search({
  q: 'document.updated',
  tenantId: 'org_acme',
  actorId: 'user_123',
  from: '2025-01-01',
  to: '2025-12-31',
  limit: 50,
});`}
      />

      <MethodCard
        name="forTenant(tenantId)"
        description="Create a tenant-scoped client. All subsequent calls are automatically scoped to this tenant."
        signature={`const tenantAudit = audit.forTenant('org_acme');
await tenantAudit.log('user.signed_in', {
  actor: { id: 'user_123' },
  // tenantId is automatically set
});`}
      />

      <MethodCard
        name="createViewerToken(tenantId, options?)"
        description="Generate a short-lived JWT token for the embeddable React viewer. Scoped to a single tenant."
        signature={`const token = await audit.createViewerToken('org_acme', {
  expiresIn: '1h',
  filters: { actorId: 'user_123' }, // optional pre-filters
});`}
      />

      <MethodCard
        name="verifyChain(tenantId)"
        description="Verify the SHA-256 hash chain integrity for a tenant. Returns verification results."
        signature={`const result = await audit.verifyChain('org_acme');
// { valid: true, eventsVerified: 15234, brokenLinks: [] }`}
      />

      <MethodCard
        name="flush()"
        description="Flush any buffered events. Call before process exit to ensure all events are sent."
        signature={`await audit.flush();`}
      />

      <MethodCard
        name="close()"
        description="Flush pending events and close the client. Call on application shutdown."
        signature={`await audit.close();`}
      />

      {/* Framework Integrations */}
      <SectionHeading id="framework-integrations" icon={Blocks}>
        Framework Integrations
      </SectionHeading>

      <h3 className="text-lg font-semibold mb-3">Next.js Middleware</h3>
      <p className="text-muted-foreground mb-4">
        Automatically capture authentication and route-level events.
      </p>
      <CodeBlock title="middleware.ts">{`import { withAuditKit } from '@auditkit/sdk/next';

export default withAuditKit(
  async function middleware(request) {
    // Your existing middleware logic
  },
  {
    apiKey: process.env.AUDITKIT_API_KEY!,
    // Auto-capture sign-in/sign-out events
    captureAuth: true,
    // Auto-capture route access events
    captureRoutes: ['/api/admin/*', '/api/billing/*'],
  }
);

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};`}</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-8">Hono Middleware</h3>
      <p className="text-muted-foreground mb-4">
        Audit logging middleware for Hono applications.
      </p>
      <CodeBlock title="server.ts">{`import { Hono } from 'hono';
import { auditkit } from '@auditkit/sdk/hono';

const app = new Hono();

app.use(
  '/api/*',
  auditkit({
    apiKey: process.env.AUDITKIT_API_KEY!,
    // Extract tenant from request context
    getTenantId: (c) => c.get('tenantId'),
    // Extract actor from request context
    getActor: (c) => ({
      id: c.get('userId'),
      name: c.get('userName'),
    }),
  })
);`}</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-8">Drizzle ORM Hooks</h3>
      <p className="text-muted-foreground mb-4">
        Automatically log database mutations as audit events.
      </p>
      <CodeBlock title="db.ts">{`import { drizzle } from 'drizzle-orm/node-postgres';
import { withAuditKit } from '@auditkit/sdk/drizzle';

const db = withAuditKit(
  drizzle(pool),
  {
    apiKey: process.env.AUDITKIT_API_KEY!,
    // Which tables to audit
    tables: ['users', 'documents', 'permissions'],
    // Map table operations to action names
    actionPrefix: 'db',
    // e.g., db.users.insert, db.documents.update
  }
);`}</CodeBlock>

      {/* React Viewer */}
      <SectionHeading id="react-viewer" icon={Eye}>
        React Viewer
      </SectionHeading>

      <p className="text-muted-foreground mb-4">
        Drop-in embeddable audit log viewer for your customer-facing dashboard. Tenant-scoped with
        JWT authentication.
      </p>

      <h3 className="text-lg font-semibold mb-3">Installation</h3>
      <CodeBlock title="terminal">npm install @auditkit/react</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-6">Usage</h3>
      <CodeBlock title="audit-page.tsx">{`import { AuditLog } from '@auditkit/react';

export function AuditPage({ viewerToken }: { viewerToken: string }) {
  return (
    <AuditLog
      token={viewerToken}
      // Optional customization
      theme="dark"
      pageSize={25}
      showSearch={true}
      showExport={true}
      onEventClick={(event) => openAuditEvent(event)}
    />
  );
}`}</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-6">Server-side token generation</h3>
      <CodeBlock title="api/audit-token/route.ts">{`import { AuditKit } from '@auditkit/sdk';
import { NextResponse } from 'next/server';

const audit = new AuditKit({ apiKey: process.env.AUDITKIT_API_KEY! });

export async function GET(request: Request) {
  const tenantId = getTenantFromSession(request);
  const token = await audit.createViewerToken(tenantId, {
    expiresIn: '1h',
  });
  return NextResponse.json({ token });
}`}</CodeBlock>

      <h3 className="text-lg font-semibold mb-3 mt-8">Non-React frameworks (Vue, Angular, vanilla JS)</h3>
      <p className="text-muted-foreground mb-4">
        If you are not using React, you can embed the audit log viewer using an iframe pointed at
        your own thin wrapper page, or call the REST API directly to build a custom viewer.
      </p>
      <CodeBlock title="iframe embed">{`<!-- Create a lightweight page that loads the React viewer, then embed it -->
<iframe
  src="https://your-app.com/audit-embed?token=vt_..."
  width="100%"
  height="600"
  style="border: 1px solid #27272a; border-radius: 8px;"
></iframe>

<!-- Or build your own viewer using the REST API: -->
<!-- GET /v1/events with Authorization: Bearer vt_... -->`}</CodeBlock>

      {/* API Reference */}
      <SectionHeading id="api-reference" icon={Globe}>
        API Reference
      </SectionHeading>

      <p className="text-muted-foreground mb-6">
        All endpoints require an{' '}
        <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">
          Authorization: Bearer ak_live_...
        </code>{' '}
        header.
      </p>

      <EndpointCard
        method="POST"
        path="/v1/events"
        description="Create a single audit event. Returns the event with its hash and chain position."
      />

      <EndpointCard
        method="GET"
        path="/v1/events"
        description="Search and list audit events. Supports query params: q, tenantId, actorId, action, from, to, limit, cursor."
      />

      <EndpointCard
        method="POST"
        path="/v1/events/bulk"
        description="Create multiple audit events in a single request. Max 1000 events per batch."
      />

      <EndpointCard
        method="POST"
        path="/v1/viewer-tokens"
        description="Generate a tenant-scoped JWT for the embeddable viewer. Body: { tenantId, expiresIn?, filters? }."
      />

      <EndpointCard
        method="GET"
        path="/v1/verify"
        description="Verify hash chain integrity. Query params: tenantId (required). Returns chain status and any broken links."
      />

      <h3 className="text-lg font-semibold mb-3 mt-8">Example: Create event via cURL</h3>
      <CodeBlock title="terminal">{`curl -X POST https://api.auditkit.dev/v1/events \\
  -H "Authorization: Bearer ak_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "document.updated",
    "actor": { "id": "user_123", "name": "Jane Doe" },
    "target": { "type": "document", "id": "doc_456" },
    "tenantId": "org_acme"
  }'`}</CodeBlock>

      {/* Authentication */}
      <SectionHeading id="authentication" icon={Key}>
        Authentication
      </SectionHeading>

      <h3 className="text-lg font-semibold mb-3">API Keys</h3>
      <p className="text-muted-foreground mb-4">
        API keys are used for server-to-server communication. Create them in the{' '}
        <a href="/dashboard/settings/api-keys" className="text-primary hover:underline">
          Dashboard Settings
        </a>
        . Keys are prefixed for easy identification:
      </p>
      <div className="border border-border rounded-lg bg-card overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Prefix</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <tr>
              <td className="p-3 font-mono text-sm">ak_live_</td>
              <td className="p-3">Production</td>
              <td className="p-3 text-muted-foreground">Production environments</td>
            </tr>
            <tr>
              <td className="p-3 font-mono text-sm">ak_test_</td>
              <td className="p-3">Test</td>
              <td className="p-3 text-muted-foreground">Development and testing</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mb-3">Viewer Tokens</h3>
      <p className="text-muted-foreground mb-4">
        Viewer tokens are short-lived JWTs used by the{' '}
        <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">
          {'<AuditLog />'}
        </code>{' '}
        React component. They are scoped to a single tenant and can optionally include pre-set
        filters. Generate them server-side using{' '}
        <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">
          createViewerToken()
        </code>{' '}
        or the REST API.
      </p>

      {/* Event Schema */}
      <SectionHeading id="event-schema" icon={FileJson}>
        Event Schema
      </SectionHeading>

      <p className="text-muted-foreground mb-4">
        Every audit event has the following shape. Fields marked with{' '}
        <code className="font-mono text-sm bg-secondary px-1.5 py-0.5 rounded">?</code> are
        optional.
      </p>

      <CodeBlock title="event schema">{`{
  id:              string       // UUID v7, auto-generated
  action:          string       // e.g. "document.updated"
  actor: {
    id:            string       // Your user/system ID
    name?:         string       // Display name
    email?:        string       // Email address
  }
  target?: {
    type:          string       // e.g. "document", "user", "permission"
    id:            string       // Your resource ID
    name?:         string       // Display name
  }
  tenantId:        string       // Your tenant/org ID
  severity?:       string       // "info" | "warn" | "error" | "critical" (default: "info")
  metadata?:       object       // Arbitrary key-value pairs
  source_ip?:      string       // Client IP address
  ip_country?:     string       // ISO country code (auto-resolved)
  user_agent?:     string       // Browser/client user agent
  is_anomalous:    boolean      // Set by anomaly detection (read-only)
  occurred_at:     string       // ISO 8601 timestamp (auto-set if omitted)
  row_hash:        string       // SHA-256 hash (auto-generated, read-only)
  prev_hash:       string       // Previous event's hash (read-only)
  chain_position:  number       // Position in tenant's hash chain (read-only)
}`}</CodeBlock>

      <div className="mt-16 mb-8 border-t border-border pt-8">
        <p className="text-sm text-muted-foreground">
          Need help?{' '}
          <a
            href="https://github.com/AuditKitDev/auditkit/issues"
            className="text-primary hover:underline"
          >
            Open an issue on GitHub
          </a>{' '}
          or reach out on{' '}
          <a href="https://discord.gg/auditkit" className="text-primary hover:underline">
            Discord
          </a>
          .
        </p>
      </div>
    </div>
  );
}
