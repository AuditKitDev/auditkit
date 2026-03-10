# AuditKit — Test Surface Map

> Generated: 2026-03-09

## Unit Tests (Vitest)

### Hash Chain Verification (tests/unit/hash.test.ts) — 13 tests
- SHA-256 row hash computation
- Hash chain verification
- Edge cases (null, empty, special chars)

### Merkle Tree (tests/unit/merkle.test.ts) — 17 tests
- Tree construction from events
- Root hash computation
- Proof generation and verification
- Edge cases (single event, empty, large batch)

### Input Validation (tests/unit/validation.test.ts) — 53 tests
- Event schema validation
- API key format validation
- UUID validation
- String length limits
- Type coercion
- Special character handling

### NLP Search (tests/unit/nlp-search.test.ts) — 33 tests
- Natural language query parsing
- Operator extraction (actor:, action:, severity:, etc.)
- Date range parsing
- Boolean expressions
- Edge cases (empty query, special chars)

### Anomaly Detection (tests/unit/anomaly-detection.test.ts) — 14 tests
- Baseline calculation
- Threshold breach detection
- Rate anomaly detection
- Pattern analysis

### PII Redaction (tests/unit/pii-redaction.test.ts) — 15 tests
- Email pattern matching
- Credit card detection
- Phone number detection
- SSN detection
- Custom regex patterns
- Nested field traversal

### SIEM Encryption (tests/unit/siem-encryption.test.ts) — 15 tests
- AES-256-GCM encryption/decryption
- Key derivation
- IV uniqueness
- Ciphertext integrity

### Security Fixes (tests/unit/security-fixes.test.ts) — ~20 tests
- HMAC cursor signing and verification
- Cursor tamper detection
- CSV formula injection escaping
- Password strength validation
- Open redirect prevention

## API Integration Tests (Vitest + real server)

### Authentication — 8 tests
- POST /auth/signup (happy path, duplicate email, weak password)
- POST /auth/login (valid, invalid password, nonexistent user)
- POST /auth/logout
- GET /auth/me

### Events API — 12 tests
- POST /v1/events (create event, validation errors)
- POST /v1/events/bulk (batch create, size limits)
- GET /v1/events (list, pagination, filters: action, severity, actor_id, tenant_id)
- GET /v1/events/:id (found, not found)
- Unauthenticated access → 401

### Tenants API — 4 tests
- POST /v1/tenants (create, upsert existing)
- GET /v1/tenants (list)
- GET /v1/tenants/:id

### Verification API — 2 tests
- GET /v1/verify (chain integrity)
- GET /v1/verify/merkle-roots

### Viewer Tokens — 2 tests
- POST /v1/viewer-tokens (create)
- Viewer token cannot write events

### Webhooks API — 4 tests
- POST /v1/webhooks (create)
- GET /v1/webhooks (list)
- PATCH /v1/webhooks/:id (update)
- DELETE /v1/webhooks/:id

### Billing — 3 tests
- POST /billing/checkout (pro, business, supersize)

### Dashboard — 2 tests
- Dashboard endpoints reject unauthenticated → 401
- API key CRUD (create, delete, deleted key rejected)

### Security — 4 tests
- CORS rejects unknown origin
- XSS in signup name is stored safely
- SQL injection in query params is safe
- Oversized payload is rejected
- User B cannot access User A's resources (tenant isolation)

## Playwright Smoke Tests

### Marketing — 2 tests
- Landing page loads
- Navigation works

### Auth Flow — 3 tests
- Login flow
- Signup flow
- Dashboard redirect when authenticated

### Dashboard — 10 tests
- Overview page renders
- Events page loads
- Tenants page loads
- Compliance reports
- Verification page
- Settings pages load
- Navigation between pages
- Mobile sidebar toggle
- Theme toggle
- Onboarding wizard

## Untested Surfaces (known gaps)

### Frontend-Only (no automated tests)
- All form validation UX (visual feedback, inline errors)
- Toast notification rendering
- Loading states and spinners
- Confirmation modals
- Mobile responsive layouts
- Dark/light theme consistency
- Accessibility (screen readers, keyboard navigation)

### API Endpoints Not Directly Tested
- POST /dashboard/compliance-reports
- GET/PATCH /dashboard/anomaly-settings
- GET/PATCH /dashboard/data-residency
- POST/PATCH/DELETE /dashboard/redaction
- POST/PATCH /dashboard/signing-keys
- GET/POST/PATCH/DELETE /dashboard/siem-connectors
- GET/POST/PATCH/DELETE /dashboard/notifications
- POST /dashboard/exports
- GET /dashboard/sysadmin/* (sysadmin endpoints)
- POST /v1/graphql

### Background Workers
- Webhook retry worker
- Retention cron
- Merkle batch cron
- Queue worker
