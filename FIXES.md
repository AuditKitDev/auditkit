# AuditKit Fixes Log

> Last updated: 2026-03-09 | Test suite: 259 passing (183 unit + 76 API)

---

## Session 1 Fixes (Previous)

### Fix 1: Auth Rate Limiting (CRITICAL)
- **Issue:** Auth endpoints had zero rate limiting
- **Fix:** Created `auth-rate-limit.ts` middleware (login 10/min, signup 5/min, forgot-password 3/min)
- **File:** `apps/api/src/middleware/auth-rate-limit.ts`, `apps/api/src/index.ts`

### Fix 2: Pricing Mismatch (CRITICAL)
- **Issue:** Marketing page advertised wrong plan limits
- **Fix:** Synced marketing page to match backend `PLAN_CONFIGS`
- **File:** `apps/web/src/app/(marketing)/page.tsx`

### Fix 3: Tenant Card Dead End (CRITICAL)
- **Issue:** Tenant cards had cursor-pointer but no onClick
- **Fix:** Added navigation to `/dashboard/events?tenant_id={externalId}`
- **File:** `apps/web/src/app/(dashboard)/dashboard/tenants/page.tsx`

### Fix 4: Login Redirect Open Redirect (HIGH)
- **Issue:** `//evil.com` passed `startsWith('/')` check
- **Fix:** Added strict regex `^\/[a-zA-Z0-9\-_/]+$` for redirect validation
- **File:** `apps/web/src/app/(auth)/login/page.tsx`

---

## Session 2 Fixes (LOGIC_AUDIT items #4-#30)

16 logic audit items fixed across events, webhooks, SIEM, API keys, retention, redaction, anomalies, notifications, verification, billing, forgot-password pages. Built complete sysadmin system (schema, routes, frontend, sidebar).

---

## Session 3 Fixes (Comprehensive Audit — 55 fixes)

### Critical Security (6)

| BUG | Issue | Fix | File(s) |
|-----|-------|-----|---------|
| 001 | Cross-project idempotency key lookup | Added projectId to WHERE clause | `events.ts:96` |
| 002 | Bulk tenant resolution not scoped | Verified already scoped at line 337 | `events.ts:337` |
| 003 | Export download IDOR | Moved project check into WHERE with `inArray` | `export.ts:172` |
| 004 | Session token in localStorage | Server sets httpOnly cookie; client uses indicator only | 5 files |
| 005 | No CSRF protection | `X-Requested-With` header required on non-GET session routes | `session-auth.ts`, `api.ts` |
| 006 | Refresh tokens in response body | Also set as httpOnly cookie on `/auth/refresh` path | `auth.ts` |

### High Priority (18)

| BUG | Issue | Fix |
|-----|-------|-----|
| 007 | No rate limit on team invite | In-memory limiter: 10/project/min |
| 008 | Team accept no logging | logAdminActivity on success/failure |
| 009 | Viewer token scope bypass | 403 if query tenant differs from token |
| 010 | CSV formula injection | Prefix `=+\-@\t\r` with single quote |
| 011 | Predictable pagination cursors | HMAC-SHA256 signed cursors |
| 012 | No logout button | Logout in sidebar with API call + cookie clear |
| 013 | No team removal confirmation | Inline confirm/cancel UI |
| 014 | Auth pages accessible when logged in | Middleware redirect to dashboard |
| 015 | Duplicate API calls on events mount | Removed duplicate useEffect |
| 016 | SSE cleanup on unmount | Verified AbortController present |
| 017 | Dangerous type assertions | Replaced with Array.isArray checks (4 pages) |
| 018 | Open redirect on login | Strict regex validation |
| 019 | No 401 interception | Redirect to /login on 401 |
| 020 | Rate limit cache 60s | Reduced to 10s |
| 021 | Rate limit race condition | Atomic INCR-based Redis operation |
| 022 | Export job timeout | Verified try/catch with failed status |
| 023 | No webhook event type validation | VALID_EVENT_TYPES whitelist |
| 024 | Unbounded severity filter | Max 10 values |

### UX & Consistency (16)

| BUG | Issue | Fix |
|-----|-------|-----|
| 026 | Overview never refreshes | Refresh button + refreshKey state |
| 027 | Fake progress bar | Indeterminate animation + "Verifying..." |
| 028 | Wrong input type for gt/lt | type="number" on gt/lt operators |
| 029 | SIEM form no validation | Per-type required field checks |
| 030 | Notification config not validated | Empty URL/email blocked |
| 031 | Anomaly threshold no bounds | min=1, max=10000 |
| 032 | API key name not validated | Empty check with inline error |
| 033 | Errors never auto-clear | useEffect auto-clear 5s (10 pages) |
| 034 | Optimistic updates no rollback | Rollback on error (3 pages) |
| 035 | Delete state not reset | setDeleteConfirm(null) on success |
| 036 | Data residency no confirmation | Confirmation modal added |
| 037 | No timezone on timestamps | formatDate with timeZoneName: 'short' |
| 038 | Rotation text confusing | "Current active key will be revoked and replaced" |
| 039 | Remove button hover-only | opacity-70 always visible |
| 040 | Compliance no auto-refresh | 5s poll when reports pending |
| 050 | Export toast generic | Shows format and event count |

### Security Hardening (10)

| BUG | Issue | Fix |
|-----|-------|-----|
| 025 | No transaction isolation | SET TRANSACTION ISOLATION LEVEL SERIALIZABLE |
| 041 | Weak password validation | Uppercase, lowercase, digit required (API + frontend) |
| 042 | Email regex too lenient | Stricter domain validation |
| 043 | Name field no max length | 100 char limit |
| 044 | No error boundary on wizard | OnboardingErrorBoundary |
| 047 | Missing aria-labels | Added across 9 pages |
| 049 | Anomaly count inconsistency | Single analytics source |
| 052 | Billing bars misleading | Color coding >90% orange, >100% red |
| — | GraphQL no depth limit | MAX_QUERY_DEPTH = 7 |
| — | Sysadmin guard undefined user | Added !user && !user.role checks |

### Flow Completeness (5)

| Issue | Fix |
|-------|-----|
| Can't re-access onboarding | "Setup" button in sidebar |
| No email verification enforcement | 403 on api-keys + team invite if unverified |
| Missing success toasts | Added to 6 pages (team, signing, api-keys, residency, SIEM, webhooks) |
| Missing loading spinners | Added to 4 pages (redaction, residency, notifications, SIEM) |
| Date format inconsistent | Standardized formatDate with timezone |

---

## Test Coverage

### Unit Tests (Vitest) — 183 tests, ~800ms
| File | Tests | Coverage |
|------|-------|----------|
| validation.test.ts | 53 | Event input, API key format, UUID, string limits |
| nlp-search.test.ts | 33 | Query parsing, operators, date ranges |
| security-fixes.test.ts | 23 | Cursor HMAC, CSV escaping, password, redirect |
| merkle.test.ts | 17 | Tree build, proof gen/verify |
| pii-redaction.test.ts | 15 | Email, CC, phone, SSN patterns |
| siem-encryption.test.ts | 15 | AES-256-GCM encrypt/decrypt |
| anomaly-detection.test.ts | 14 | Privilege escalation, off-hours |
| hash.test.ts | 13 | SHA-256 chain compute/verify |

### API Integration Tests (Vitest) — 76 tests, ~13s
All 60+ API endpoints tested against live server with real database.

### Playwright Smoke Tests — 15 tests, ~50s
15 critical user flows (landing, auth, dashboard, events, tenants, billing, mobile).

### Run Commands
```bash
pnpm test:unit           # 183 unit tests
pnpm test:integration    # 76 API integration tests
pnpm test:smoke:pw       # 15 Playwright smoke tests
```
