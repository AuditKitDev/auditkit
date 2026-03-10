# AuditKit — Bug Report

> Generated: 2026-03-09 | Method: Static code audit of every page, route, component, and endpoint
> Severity scale: CRITICAL > HIGH > MEDIUM > LOW

---

## CRITICAL (6)

### BUG-001: Cross-project idempotency key lookup (IDOR)
- **File:** `apps/api/src/routes/events.ts:74-91`
- **Description:** Idempotency key lookup queries `auditEvents` without scoping to `auth.projectId`. An attacker with a valid API key can probe idempotency keys from other projects and retrieve event IDs + row hashes.
- **Impact:** Cross-project event enumeration, data leakage.
- **Fix:** Add `eq(auditEvents.projectId, auth.projectId)` to the WHERE clause.

### BUG-002: Bulk event tenant resolution not scoped to project
- **File:** `apps/api/src/routes/events.ts:307-338`
- **Description:** Bulk event ingestion resolves tenants by `externalId` without filtering by `projectId`. An attacker could inject events into tenants belonging to other projects.
- **Impact:** Cross-project data injection, tenant contamination.
- **Fix:** Add `eq(tenants.projectId, auth.projectId)` to tenant lookup in bulk loop.

### BUG-003: Export download IDOR (check after query)
- **File:** `apps/api/src/routes/export.ts:172-179`
- **Description:** Export download fetches the full export job row, then checks project membership. The job data (including S3 file URL, filters) is loaded into memory for any valid export ID before the ownership check.
- **Impact:** Information disclosure of export metadata; potential S3 URL leakage.
- **Fix:** Move project check into WHERE clause.

### BUG-004: Session token stored in JS-accessible cookie + localStorage
- **File:** `apps/web/src/lib/auth.ts:8-14`
- **Description:** `setToken()` stores the session token in both localStorage and a non-httpOnly cookie. Any XSS vulnerability grants full session hijacking.
- **Impact:** Session hijacking via XSS.
- **Fix:** Use httpOnly cookies set by the server; remove localStorage token storage.

### BUG-005: No CSRF protection on state-changing endpoints
- **File:** `apps/api/src/routes/auth.ts` (all POST endpoints)
- **Description:** Login, signup, password reset, and all dashboard POST/PATCH/DELETE endpoints have no CSRF token validation. With `credentials: 'include'`, cross-origin form posts can trigger actions.
- **Impact:** Account actions triggerable from malicious sites.
- **Fix:** Implement CSRF tokens or use SameSite=Strict cookies with custom header requirement.

### BUG-006: Refresh tokens returned in JSON response body
- **File:** `apps/api/src/routes/auth.ts:195, 266`
- **Description:** Refresh tokens are returned in the JSON response, not in httpOnly cookies. They're visible in DevTools, browser history, and logs.
- **Impact:** Token theft, persistent account compromise (7-day TTL).
- **Fix:** Return refresh tokens only in httpOnly Secure cookies.

---

## HIGH (12)

### BUG-007: No rate limiting on team invite endpoint
- **File:** `apps/api/src/routes/team.ts:151`
- **Description:** `/dashboard/team/invite` has no rate limiting. An attacker with session access can send unlimited invitation emails (email-based DoS).
- **Impact:** Email flooding, reputation damage.

### BUG-008: Team invitation accept endpoint has no attempt limiting
- **File:** `apps/api/src/routes/team.ts:255`
- **Description:** `/dashboard/team/accept` is unauthenticated and has no rate limiting. Token brute force is infeasible (256-bit), but lack of attempt logging is a monitoring gap.
- **Impact:** Missing audit trail for failed accept attempts.

### BUG-009: Viewer token tenant scope not validated against query
- **File:** `apps/api/src/routes/events.ts:539-556`
- **Description:** When a viewer token is used, the events query applies `tenantId` from the token but doesn't reject requests that explicitly specify a different tenant ID in query params.
- **Impact:** Potential scope confusion; viewer token holder might see unexpected results.

### BUG-010: CSV export formula injection
- **File:** `apps/api/src/routes/export.ts:329`
- **Description:** CSV escaping only handles double quotes. Cells starting with `=`, `+`, `-`, `@` are not prefixed, allowing formula injection in Excel/Sheets.
- **Impact:** Code execution when exported CSV is opened in spreadsheet software.

### BUG-011: Pagination cursor is predictable (base64 numeric ID)
- **File:** `apps/api/src/routes/events.ts:607-614`
- **Description:** Cursor is `base64(numeric_id)`. Attacker can craft cursors to jump to specific event IDs or enumerate events.
- **Impact:** Event enumeration, data scraping.
- **Fix:** Sign cursors with HMAC.

### BUG-012: No logout button in UI
- **File:** `apps/web/src/components/dashboard/sidebar.tsx`
- **Description:** The sidebar has no logout action. Users cannot explicitly end their session from the UI.
- **Impact:** Users cannot securely end sessions; tokens persist in localStorage.

### BUG-013: Team member removal has no confirmation dialog
- **File:** `apps/web/src/app/(dashboard)/dashboard/settings/team/page.tsx:236`
- **Description:** Clicking "Remove" immediately fires the delete API call with no confirmation prompt. Accidental clicks cause data loss.
- **Impact:** Accidental member removal.

### BUG-014: Authenticated users can access login/signup pages
- **File:** `apps/web/src/middleware.ts`
- **Description:** Middleware allows authenticated users to visit `/login` and `/signup` without redirecting to `/dashboard`. Creates confusion.
- **Impact:** UX confusion, potential token overwrite.

### BUG-015: Events page fires duplicate API calls on mount
- **File:** `apps/web/src/app/(dashboard)/dashboard/events/page.tsx:158,162`
- **Description:** Two separate useEffect hooks both trigger `fetchEvents` on mount — once directly and once through the `searchQuery` dependency.
- **Impact:** Double network requests, wasted bandwidth, potential race condition.

### BUG-016: SSE connection not cleaned up on unmount
- **File:** `apps/web/src/app/(dashboard)/dashboard/events/page.tsx:259`
- **Description:** When component unmounts during SSE connection setup (promise resolving), the stream continues consuming resources.
- **Impact:** Memory leak in long-running sessions.

### BUG-017: Dangerous type assertions across dashboard pages
- **Files:** `tenants/page.tsx:61`, `compliance/page.tsx:113,135`, `verification/page.tsx:43`, `anomalies/page.tsx:93,107`
- **Description:** Pattern `res.data ?? (res as unknown as T[])` bypasses type safety. If API response structure changes, data silently corrupts.
- **Impact:** Silent data corruption, runtime crashes.

### BUG-018: Open redirect on login page
- **File:** `apps/web/src/app/(auth)/login/page.tsx:38-42`
- **Description:** Redirect parameter validated with `startsWith('/')` and `!startsWith('//')`, but `///path` bypasses the check.
- **Impact:** Phishing via crafted login URLs.

---

## MEDIUM (22)

### BUG-019: No client-side session expiry handling
- **Description:** `apiFetch` doesn't intercept 401 responses to redirect to login. Expired sessions cause silent failures across all dashboard pages.

### BUG-020: Rate limit cache doesn't reflect plan upgrades for 60s
- **File:** `apps/api/src/middleware/rate-limit.ts:47-86`
- **Description:** Plan tier cached for 60 seconds. After upgrade, old rate limits apply until cache expires.

### BUG-021: Race condition in rate limit check-then-increment
- **File:** `apps/api/src/middleware/rate-limit.ts:139-147`
- **Description:** Usage checked, then incremented non-atomically. Burst of concurrent requests can exceed limit.

### BUG-022: Export job can hang forever if request times out
- **File:** `apps/api/src/routes/export.ts:54-118`
- **Description:** Export processes synchronously. If HTTP request times out before completion, job stays in `processing` status permanently.

### BUG-023: No validation on webhook event type whitelist
- **File:** `apps/api/src/routes/webhooks.ts:77-81`
- **Description:** Event type array accepts any string. Invalid types silently never fire.

### BUG-024: Unbounded severity filter array in events query
- **File:** `apps/api/src/routes/events.ts:580-585`
- **Description:** `severity` parameter split by comma with no limit. Attacker can send thousands of values, creating a massive OR clause.

### BUG-025: Transaction isolation level not specified for event ingestion
- **File:** `apps/api/src/routes/events.ts:343-478`
- **Description:** `db.transaction()` uses default READ COMMITTED. Concurrent bulk inserts for same tenant could create phantom reads.

### BUG-026: Overview page analytics never refresh
- **File:** `apps/web/src/app/(dashboard)/dashboard/overview/page.tsx:158`
- **Description:** Analytics data fetched once on mount with no refresh mechanism. Stale after extended use.

### BUG-027: Verification progress bar is fake (random increments)
- **File:** `apps/web/src/app/(dashboard)/dashboard/verification/page.tsx:62-68`
- **Description:** Progress bar uses random increments on a timer, not real progress. Can complete before or after actual verification finishes.

### BUG-028: Notification rule conditions accept wrong types
- **File:** `apps/web/src/app/(dashboard)/dashboard/integrations/notifications/page.tsx`
- **Description:** Conditions with `operator: 'gt'` or `'lt'` accept string values in the value field. Should enforce numeric input.

### BUG-029: SIEM connector form has no client-side validation
- **File:** `apps/web/src/app/(dashboard)/dashboard/integrations/siem/page.tsx`
- **Description:** Splunk URL, tokens, S3 keys can all be submitted empty. Server-side validation not confirmed.

### BUG-030: Notification channel config not validated
- **File:** `apps/web/src/app/(dashboard)/dashboard/integrations/notifications/page.tsx:154`
- **Description:** Webhook URL and email address fields can be submitted empty.

### BUG-031: Anomaly threshold input has no min/max validation
- **File:** `apps/web/src/app/(dashboard)/dashboard/anomalies/page.tsx:424-440`
- **Description:** Threshold field accepts negative numbers and unreasonably large values.

### BUG-032: API key name not validated for empty/whitespace
- **File:** `apps/web/src/app/(dashboard)/dashboard/settings/api-keys/page.tsx:74`
- **Description:** Name field trimmed but not checked for empty string before submission.

### BUG-033: Error messages persist across operations on all pages
- **Description:** Error state set on failure but never auto-cleared. Old errors remain visible even after successful subsequent operations.

### BUG-034: Optimistic updates without rollback on failure
- **Files:** Multiple settings pages (retention, team, SIEM, notifications)
- **Description:** UI updates optimistically but doesn't revert on API failure. User sees success state despite failure.

### BUG-035: Delete confirmation state not reset after deletion
- **Files:** `api-keys/page.tsx`, `redaction/page.tsx`, `webhooks/page.tsx`
- **Description:** `deleteConfirm` state persists after successful deletion. Rapid clicks can trigger unintended confirmations.

### BUG-036: Data residency region change has no confirmation dialog
- **File:** `apps/web/src/app/(dashboard)/dashboard/settings/residency/page.tsx`
- **Description:** Unlike retention, changing data residency region (a potentially destructive operation) requires no confirmation.

### BUG-037: No timezone indication on any timestamp display
- **Description:** All dates rendered via `formatDate`/`formatRelative` without timezone context. Users in different timezones may misinterpret times.

### BUG-038: Signing key rotation confirmation text is confusing
- **File:** `apps/web/src/app/(dashboard)/dashboard/settings/signing/page.tsx:150`
- **Description:** Warning says "new key will be revoked" instead of "old key will be revoked, new key will be active."

### BUG-039: Remove button on team page only visible on hover
- **File:** `apps/web/src/app/(dashboard)/dashboard/settings/team/page.tsx:238`
- **Description:** Delete button uses `opacity-0 group-hover:opacity-100`. Inaccessible on touch devices and invisible to keyboard users.

### BUG-040: Compliance pending reports have no auto-refresh
- **File:** `apps/web/src/app/(dashboard)/dashboard/compliance/page.tsx`
- **Description:** When a report is "pending", user must manually click Refresh. No polling for status updates.

---

## LOW (12)

### BUG-041: Weak password validation (length-only)
- **Files:** `signup/page.tsx`, `reset-password/page.tsx`, `auth.ts`
- **Description:** Only checks `length >= 8`. Passwords like "aaaaaaaa" accepted.

### BUG-042: Email regex too lenient
- **Files:** `forgot-password/page.tsx`, `auth.ts`
- **Description:** Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepts `a@b.c`.

### BUG-043: Name field has no max length
- **File:** `apps/api/src/routes/auth.ts:133`
- **Description:** Accepts any non-empty string. 10,000-character names allowed.

### BUG-044: No error boundary on onboarding wizard
- **File:** `apps/web/src/app/(dashboard)/dashboard/overview/page.tsx:228`
- **Description:** If OnboardingWizard crashes, entire overview page fails.

### BUG-045: Skeleton loaders don't match actual content layout
- **File:** `apps/web/src/app/(dashboard)/dashboard/overview/page.tsx:248`
- **Description:** Shows 4 skeleton cards but actual page has 4 stat cards + multiple analytics sections.

### BUG-046: No retry UI on failed data loads
- **Files:** Multiple dashboard pages
- **Description:** When initial data fetch fails, user must refresh the entire page. No retry button.

### BUG-047: Missing aria-labels on icon-only actions
- **Description:** Many icon buttons across dashboard lack `aria-label` attributes. Screen readers can't identify their purpose.

### BUG-048: Date formatting inconsistent across pages
- **Description:** Some pages use `.toLocaleDateString()`, others `.toLocaleString()`, others `formatDate()`. No consistent pattern.

### BUG-049: Overview anomaly count uses two different sources
- **File:** `apps/web/src/app/(dashboard)/dashboard/overview/page.tsx:101,129`
- **Description:** Anomaly count calculated from recent events AND defined separately. Potential inconsistency.

### BUG-050: Export success toast doesn't show filename
- **File:** `apps/web/src/app/(dashboard)/dashboard/events/page.tsx:368`
- **Description:** Toast says "exported successfully" without identifying the file.

### BUG-051: Webhook test failure shows hostname parse error
- **File:** `apps/web/src/app/(dashboard)/dashboard/integrations/webhooks/page.tsx:168`
- **Description:** `new URL(webhook.url).hostname` can throw if URL is malformed. Wrapped in try/catch but error toast may be unclear.

### BUG-052: Billing progress bars misleading for high usage
- **File:** `apps/web/src/app/(dashboard)/dashboard/settings/billing/page.tsx:185`
- **Description:** `Math.min()` caps at 100%, so 150% overage still shows as full bar with no visual distinction.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 12 |
| MEDIUM | 22 |
| LOW | 12 |
| **Total** | **52** |
