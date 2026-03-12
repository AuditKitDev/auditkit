<p align="center">
  <img src="logo.png" alt="AuditKit" height="80" />
</p>

<h3 align="center">Audit logs for B2B SaaS</h3>

<p align="center">
  Open-source, tamper-evident, enterprise-ready audit logging.<br />
  Ship immutable, tenant-scoped audit trails in minutes.
</p>

<p align="center">
  <a href="https://auditkit.dev">Website</a> &middot;
  <a href="https://auditkit.dev/docs">Docs</a> &middot;
  <a href="https://github.com/AuditKitDev/auditkit/issues">Issues</a>
</p>

<p align="center">
  <a href="https://github.com/AuditKitDev/auditkit/actions"><img src="https://img.shields.io/github/actions/workflow/status/AuditKitDev/auditkit/ci.yml?label=build" alt="Build Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3-blue" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@auditkit/sdk"><img src="https://img.shields.io/npm/dm/@auditkit/sdk?label=npm%20downloads" alt="npm downloads" /></a>
</p>

---

## Get Started in 60 Seconds

```bash
npm install @auditkit/sdk
```

```typescript
import { AuditKit } from '@auditkit/sdk';

const auditkit = new AuditKit({ apiKey: 'ak_...' });

await auditkit.log({
  action: 'document.updated',
  actor: { id: 'user_123', email: 'alice@acme.com' },
  target: { type: 'document', id: 'doc_456' },
  context: { ip: '203.0.113.1' },
});
```

## Features

- **Tamper-proof** — SHA-256 hash chain + Merkle tree proofs
- **Tenant-scoped** — each customer gets isolated, queryable logs
- **Embeddable viewer** — drop-in React component for your customers
- **SIEM streaming** — forward events to Splunk, Datadog, Elastic
- **Multi-language SDKs** — TypeScript, Python, Go, Java
- **Self-hostable** — Docker Compose, or use our managed cloud
- **SOC 2 / ISO 27001 ready** — compliance exports out of the box

## Architecture

```
apps/
  api/        Hono API server (Fly.io)
  web/        Next.js 15 dashboard + marketing (Vercel)
packages/
  sdk/        TypeScript SDK
  sdk-python/ Python SDK
  sdk-go/     Go SDK
  sdk-java/   Java SDK
  react/      Embeddable audit log viewer
  shared/     Shared types and validation
  next/       Next.js middleware integration
  hono/       Hono middleware integration
  drizzle/    Drizzle ORM integration
ee/           Enterprise features (commercial license)
```

## Self-Hosting

```bash
git clone https://github.com/AuditKitDev/auditkit.git
cd auditkit
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d
pnpm install && pnpm build && pnpm dev
```

## Development

```bash
pnpm install
pnpm dev          # starts API + web concurrently
pnpm build        # production build
pnpm test:api     # API e2e tests
pnpm test:ui      # UI e2e tests
```

## License

AGPLv3 — see [LICENSE](LICENSE). The `/ee` directory requires a [commercial license](mailto:hello@auditkit.dev).

---

## Also By Us

- **[CloakShare](https://github.com/cloakshare/cloakshare)** — Open-source DocSend alternative with canvas rendering, watermarks, and per-page analytics. MIT licensed.
- **[SiteCrawlIQ](https://github.com/AuditKitDev/sitecrawliq)** — AI-powered SEO + GEO/AEO audit platform. Tracks AI citations across ChatGPT, Perplexity, Claude, and Gemini.
