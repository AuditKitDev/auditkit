# AuditKit — Complete Audit Map

> Generated: 2026-03-09 | Scope: Full product surface — pages, flows, endpoints, features

---

## 1. Public / Marketing

| Route | File | Features |
|-------|------|----------|
| `/` | `apps/web/src/app/(marketing)/page.tsx` | Landing page, feature comparison table, interactive demo, CTAs |
| `/blog` | `apps/web/src/app/blog/page.tsx` | Blog listing grid, tags, author, read time, JSON-LD |
| `/blog/[slug]` | `apps/web/src/app/blog/[slug]/page.tsx` | Full article, related posts, FAQ schema, breadcrumbs |
| `/docs` | `apps/web/src/app/docs/page.tsx` | Quick start, SDK reference, endpoint reference, code blocks |

## 2. Authentication

| Route | File | Features |
|-------|------|----------|
| `/login` | `apps/web/src/app/(auth)/login/page.tsx` | Email/password form, redirect param, forgot-password link |
| `/signup` | `apps/web/src/app/(auth)/signup/page.tsx` | Name/email/password, confirmation, 8-char min |
| `/forgot-password` | `apps/web/src/app/(auth)/forgot-password/page.tsx` | Email input, client-side regex validation, success state |
| `/reset-password` | `apps/web/src/app/(auth)/reset-password/page.tsx` | Token from query param, new password, auto-redirect to login |

**Layout:** `apps/web/src/app/(auth)/layout.tsx` — centered card with logo

## 3. Dashboard

**Layout:** `apps/web/src/app/(dashboard)/layout.tsx` — Sidebar + ToastProvider + EmailVerificationWrapper

### 3.1 Core Pages

| Route | File | Features |
|-------|------|----------|
| `/dashboard/overview` | `…/overview/page.tsx` | 4 stat cards, sparkline charts, severity breakdown, top actions, top actors, anomaly rate, recent events, chain integrity, onboarding wizard |
| `/dashboard/events` | `…/events/page.tsx` (917 lines) | Advanced search, NLP toggle, quick filter chips, filter panel, live SSE mode, event detail drawer, hash verification, CSV/JSON export, pagination |
| `/dashboard/tenants` | `…/tenants/page.tsx` | Tenant list cards, search, event/user counts, chain status, click-to-filter |
| `/dashboard/compliance` | `…/compliance/page.tsx` | SOC 2 / HIPAA / ISO 27001 / GDPR framework cards, report generation, findings list with control status |
| `/dashboard/verification` | `…/verification/page.tsx` | Tenant selector, run verification, progress bar, result display, broken links table |
| `/dashboard/anomalies` | `…/anomalies/page.tsx` | Global detection toggle, alert feed, status tracking, detection rules config, threshold adjustment |
| `/dashboard/sysadmin` | `…/sysadmin/page.tsx` | Sysadmin-only, stats grid (6 metrics), activity logs tab, users tab, search/filter/pagination |

### 3.2 Integrations

| Route | File | Features |
|-------|------|----------|
| `/dashboard/integrations/webhooks` | `…/webhooks/page.tsx` | CRUD webhooks, event type selector, enable/disable toggle, test button, delivery timestamps |
| `/dashboard/integrations/notifications` | `…/notifications/page.tsx` | Notification rules, Slack/Discord/Email/Webhook channels, condition builder, enable/disable |
| `/dashboard/integrations/siem` | `…/siem/page.tsx` | Splunk HEC / Datadog / S3 / Custom HTTP connectors, test connection, activate/deactivate |

### 3.3 Settings

| Route | File | Features |
|-------|------|----------|
| `/dashboard/settings/api-keys` | `…/api-keys/page.tsx` | Create/list/delete keys, env selector (Test/Live), copy, warning banner for new key |
| `/dashboard/settings/retention` | `…/retention/page.tsx` | Retention tiers (7d–7yr), confirmation modal for reductions, plan-gated options |
| `/dashboard/settings/redaction` | `…/redaction/page.tsx` | CRUD redaction rules, regex pattern input with live validation, preset patterns |
| `/dashboard/settings/signing` | `…/signing/page.tsx` | Signing key list, rotation with confirmation, copy public key, active indicator |
| `/dashboard/settings/residency` | `…/residency/page.tsx` | Region selector (US/EU/APAC), migration warning, save with confirmation |
| `/dashboard/settings/team` | `…/team/page.tsx` | Member list, invite form, role selector, remove member |
| `/dashboard/settings/billing` | `…/billing/page.tsx` | Current subscription, usage bars, plan cards (Free/Pro/Business/Supersize), Stripe checkout |

## 4. Shared Components

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | `components/dashboard/sidebar.tsx` | Navigation, project selector, usage meter, theme toggle, sysadmin link |
| OnboardingWizard | `components/dashboard/onboarding-wizard.tsx` | 4-step onboarding (Welcome → API Key → Send Event → Success) |
| Toast | `components/toast.tsx` | success/error/warning/info, auto-dismiss 4s |
| Logo | `components/logo.tsx` | Brand mark |
| ThemeProvider | `components/theme-provider.tsx` | Dark/light mode context |
| ThemeToggle | `components/dashboard/theme-toggle.tsx` | Toggle button |
| InteractiveDemo | `components/interactive-demo.tsx` | Marketing demo widget |
| Sparkline | `components/dashboard/sparkline.tsx` | Inline chart |
| EmailVerificationBanner | `components/dashboard/email-verification-banner.tsx` | Prompt bar |

## 5. Client Libraries (lib/)

| File | Exports |
|------|---------|
| `lib/auth.ts` | `getToken`, `setToken`, `clearToken`, `isAuthenticated` |
| `lib/api.ts` | `apiFetch<T>`, `apiHeaders` |
| `lib/utils.ts` | `cn`, `formatDate`, `formatRelative`, `truncateHash` |

## 6. API Endpoints

### 6.1 Auth (`/auth/*`) — rate-limited, unauthenticated

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Create account + default project |
| POST | `/auth/login` | Authenticate, return session + refresh tokens |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/refresh` | Rotate refresh token |
| GET | `/auth/me` | Current user + projects |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset with token |
| POST | `/auth/send-verification` | Send email verification |
| POST | `/auth/verify-email` | Verify email token |

### 6.2 Dashboard (`/dashboard/*`) — session auth

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/me` | User profile (id, email, name, role) |
| GET/POST/PATCH/DELETE | `/dashboard/api-keys[/:id]` | API key CRUD |
| GET/POST/PATCH/DELETE | `/dashboard/projects[/:id]` | Project CRUD |
| GET/POST/PATCH/DELETE | `/dashboard/notifications[/:id]` | Notification rule CRUD |
| GET/POST/PATCH | `/dashboard/retention[/:id]` | Retention policy CRUD |
| GET/POST/PATCH/DELETE | `/dashboard/redaction[/:id]` | Redaction rule CRUD |
| GET/POST/PATCH | `/dashboard/signing-keys[/:id]` | Signing key mgmt + rotation |
| GET/POST/PATCH/DELETE | `/dashboard/siem-connectors[/:id]` | SIEM connector CRUD |
| GET/PATCH | `/dashboard/anomaly-settings` | Anomaly detection config |
| GET/PATCH | `/dashboard/data-residency` | Data residency config |

### 6.3 Team (`/dashboard/team/*`) — session auth

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/team/members` | List members |
| POST | `/dashboard/team/invite` | Send invitation |
| POST | `/dashboard/team/accept` | Accept invitation (unauthenticated) |
| PATCH | `/dashboard/team/members/:id` | Update role |
| DELETE | `/dashboard/team/members/:id` | Remove member |

### 6.4 Exports (`/dashboard/exports/*`) — session auth

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/dashboard/exports` | Create export job |
| GET | `/dashboard/exports` | List jobs |
| GET | `/dashboard/exports/:id/download` | Download file |

### 6.5 Sysadmin (`/dashboard/sysadmin/*`) — session auth + sysadmin role

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/sysadmin/stats` | System-wide counts |
| GET | `/dashboard/sysadmin/logs` | Activity logs (paginated, filterable) |
| GET | `/dashboard/sysadmin/users` | All users |
| GET | `/dashboard/sysadmin/actions` | Distinct action types |

### 6.6 Billing (`/billing/*`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/billing/checkout` | Session | Create Stripe checkout |
| POST | `/billing/portal` | Session | Create Stripe portal |
| GET | `/billing/subscription` | Session | Current subscription + usage |
| POST | `/billing/webhook` | Stripe signature | Handle Stripe events |

### 6.7 API v1 (`/v1/*`) — API key auth + rate limiting + idempotency

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/events` | Log single event |
| POST | `/v1/events/bulk` | Batch log (up to 100, 10MB) |
| GET | `/v1/events` | Search/list events |
| GET | `/v1/events/nlp-search` | Natural language search |
| GET | `/v1/events/:id` | Get event by ID |
| GET | `/v1/events/stream` | SSE real-time stream |
| POST/GET/PATCH | `/v1/tenants[/:id]` | Tenant CRUD |
| POST | `/v1/viewer-tokens` | Create scoped read token |
| GET | `/v1/verify` | Verify hash chain |
| GET | `/v1/verify/merkle-roots` | List Merkle roots |
| GET | `/v1/verify/merkle/:rootId` | Merkle root + proof |
| GET | `/v1/verify/signature/:eventId` | Verify event signature |
| POST/GET/PATCH/DELETE | `/v1/webhooks[/:id]` | Webhook CRUD |
| GET | `/v1/webhooks/:id/deliveries` | Delivery history |
| POST/GET | `/v1/graphql` | GraphQL endpoint |

### 6.8 Infrastructure

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + version |

## 7. Middleware Stack

1. CORS (origin whitelist)
2. Request ID (`X-Request-Id`)
3. HTTP logger (Hono)
4. Body limit (1MB default, 10MB bulk)
5. Auth (API key / viewer token / session token)
6. Rate limiter (Redis-backed, plan-tiered)
7. Idempotency key (24h dedup)

## 8. Background Workers

| Worker | Purpose |
|--------|---------|
| `queue-worker.ts` | Process event queue (BullMQ) |
| `webhook-worker.ts` | Retry failed webhook deliveries |
| `retention-cron.ts` | Purge expired events |
| `merkle.ts` | Batch Merkle root computation |

## 9. SDKs & Packages

| Package | Language | Key Export |
|---------|----------|-----------|
| `@auditkit/shared` | TS | Types, event catalog (40+ events) |
| `@auditkit/sdk` | TS | `AuditKit` client, `computeRowHash`, `verifyHash` |
| `@auditkit/react` | React | `<AuditLog>` embeddable viewer |
| `@auditkit/next` | Next.js | `withAuditKit()` middleware |
| `@auditkit/hono` | Hono | `auditKit()` middleware |
| `@auditkit/drizzle` | Drizzle | `withAudit()` wrapper |
| `sdk-python` | Python | Async client |
| `sdk-go` | Go | Zero-dep client |
| `sdk-java` | Java 17+ | HttpClient-based |
| `terraform-provider` | HCL | Terraform provider |
| `github-action` | YAML | CI/CD action |

## 10. Database Schema (31 tables)

**Core:** users, sessions, projects, apiKeys, tenants, auditEvents
**Auth:** refreshTokens, passwordResetTokens, emailVerificationTokens, viewerTokens
**Team:** teamMembers, teamInvitations
**Crypto:** merkleRoots, signingKeys
**Webhooks:** webhookEndpoints, webhookDeliveries
**Policies:** retentionPolicies, notificationRules, redactionRules, dataResidencyConfigs
**SIEM:** siemConnectors
**Analytics:** anomalyAlerts, anomalyBaselines, anomalyDetectionSettings
**Billing:** subscriptions, monthlyUsage
**Admin:** adminActivityLogs
**Other:** complianceReports, idempotencyKeys, exportJobs

## 11. Deployment

- **Docker:** docker-compose with API (Node 22) + PostgreSQL 16
- **Production:** Fly.io, Neon Postgres, Upstash Redis
- **Build:** pnpm monorepo + Turborepo

## 12. Test Coverage

| Suite | Count | Tool |
|-------|-------|------|
| Unit tests | 160 | Vitest |
| API integration | 76 | Vitest |
| Playwright smoke | 15 | Playwright |
| **Total** | **251** | |
