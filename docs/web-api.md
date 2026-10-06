# Web ↔ API contract

The site (`packages/web`, Astro, static) and the API (`packages/server`) are served from one origin:
nginx sends `/v1/*`, `/auth/*`, `/oauth/*`, `/api/*`, `/demo/*`, `/public/*`, `/webhooks/*`, `/mcp`, `/openapi.json`, `/health`, `/.well-known/*`
to the server and everything else to the static build. In dev, Astro's `vite.server.proxy` does the same
to `http://localhost:3001`.

All JSON. Errors: `{ error: { code, message } }` with 4xx/5xx. Session is an httpOnly cookie `ak_session`
(SameSite=Lax, Secure in prod). Browser calls use `credentials: "same-origin"`.

## Auth (passwordless)

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/auth/magic` | `{ email, next? }` | `202 { sent: true }` always (no account enumeration). Dev with no RESEND_API_KEY: link is printed to the server log. |
| GET | `/auth/callback` | `?token=…` | `302` to `next` (default `/app`) with the cookie set; `302 /login?error=expired` otherwise. Token single-use, 15 min. |
| GET | `/auth/me` | | `200 { user: { id, email, created_at } }` or `401` |
| POST | `/auth/logout` | | `204` |

First login creates the user and a project named after the email's domain, with the user as owner.

## App (session-authenticated) — JSON lives under `/api/app/*`; the HTML pages stay at `/app/*`

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/app/projects` | | `{ projects: [{ id, name, plan, role, created_at, events_this_month, limit_events }] }` |
| POST | `/api/app/projects` | `{ name }` | `201 { id, name, plan }` |
| GET | `/api/app/projects/:id` | | project + `usage: { events_this_month, limit_events, retention_days, anchor_interval_seconds }` + `last_anchor: { global_root, anchors[] } \| null` |
| GET | `/api/app/projects/:id/keys` | | `{ keys: [{ id, prefix, mode, scopes, created_at, revoked_at }] }` |
| POST | `/api/app/projects/:id/keys` | `{ mode: "live"\|"test", scopes: ["read","write","erase","admin"] }` | `201 { id, key }` (key shown once) |
| DELETE | `/api/app/projects/:id/keys/:keyId` | | `{ revoked: true }` |
| GET | `/api/app/projects/:id/tenants` | | same as `/v1/tenants` |
| GET | `/api/app/projects/:id/events?…` | same query as `/v1/events` | same shape |
| GET | `/api/app/projects/:id/events/:eventId` | | same as `/v1/events/:id` |
| GET | `/api/app/projects/:id/events/:eventId/proof` | | same as `/v1/events/:id/proof` |
| GET | `/api/app/projects/:id/verify?tenant=…` | | same as `/v1/verify` |
| GET | `/api/app/projects/:id/export?tenant=…` | | NDJSON download |
| POST | `/api/app/projects/:id/billing/checkout` | `{ plan: "pro"\|"business" }` | `{ url }` (Stripe Checkout) or `501 { error: { code: "billing_not_configured" } }` |
| POST | `/api/app/projects/:id/billing/portal` | | `{ url }` or `501` |
| POST | `/webhooks/stripe` | Stripe event | sets `project.plan` on `checkout.session.completed` / `customer.subscription.*` |

## Public, unauthenticated

| Method | Path | Returns |
|---|---|---|
| GET | `/public/anchors?limit=20` | `{ anchors: [{ global_root, created_at, projects: n, receipts: [{ kind, ref, status, anchored_at }] }] }` for the transparency page |
| GET | `/public/stats` | `{ events_total, roots_total, anchors_final, projects }` rounded, cacheable |

## Demo (unauthenticated, rate-limited 30 req/min per IP, throwaway project `demo` reset nightly)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/demo/log` | `{ actor, action, target?, payload? }` (tenant is forced to the caller's IP hash) | receipt, same as `/v1/events` |
| GET | `/demo/events` | | last 20 events for this caller's tenant |
| GET | `/demo/verify` | | `/v1/verify` for this caller's tenant |
| GET | `/demo/proof/:id` | | `/v1/events/:id/proof` (only this caller's tenant) |

Demo anchors on the normal tick (every 60 s in prod), so a visitor sees "anchored to Rekor" within a minute.

## Plans (from the spec)

| plan | events/mo | retention days | anchor interval s |
|---|---|---|---|
| free | 10,000 | 30 | 86,400 |
| pro | 500,000 | 365 | 300 |
| business | 5,000,000 | 1,095 | 60 |

## Viewer tokens (read-only, tenant-scoped, expiring)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/app/projects/:id/viewer-tokens` | | `{ tokens: [{ id, tenant, expires_at, created_at, revoked_at }] }` |
| POST | `/api/app/projects/:id/viewer-tokens` | `{ tenant, ttl_hours? (default 168, max 2160) }` | `201 { id, token, expires_at, url }` (token shown once) |
| DELETE | `/api/app/projects/:id/viewer-tokens/:tokenId` | | `{ revoked: true }` |

Public JSON routes under `/api/viewer/*` (the HTML page stays at `/viewer`), authenticated by `?token=vt_…` or `Authorization: Bearer vt_…`, always scoped to the token's tenant (a `tenant` query param is ignored):
`GET /api/viewer/me` → `{ tenant, project_id }`, `GET /api/viewer/events?actor&action&from&to&limit&cursor`, `GET /api/viewer/events/:id`, `GET /api/viewer/events/:id/proof`, `GET /api/viewer/verify?from&to`, `GET /api/viewer/export?from&to`.
The site serves a static `/viewer` page that reads `token` from the URL and renders the tenant's log, verify button and export link; it is also what customers iframe into their own admin UI.
