# AuditKit Logic Audit

## CRITICAL — Fix Before Launch

### 1. No Rate Limiting on Auth Endpoints
**Flow**: Login, Signup, Forgot Password
**Current**: Auth routes (`/auth/*`) have zero rate limiting. Attackers can brute-force passwords, spam account creation, or enumerate emails with no throttling.
**Confused user**: N/A — this is a security issue. Attackers exploit it, real users suffer account takeover.
**Fix**: Add rate limiting middleware to auth routes (5 login attempts/min, 3 signups/min, 3 forgot-password/min).

### 2. Pricing Mismatch: Marketing Page vs Billing Settings vs Backend
**Flow**: User reads marketing page → signs up → sees different quotas in billing
**Current**: Marketing says Free=5K events, 30-day retention. Billing page says Free=1K events, 7-day retention. Backend (stripe.ts PLAN_CONFIGS) says Free=1K, 7-day. Pro marketing says 100K, billing says 50K.
**Confused user**: "They advertised 5K events but I only got 1K. This is bait-and-switch."
**Fix**: Sync marketing page to match backend/billing values.

### 3. Tenant Card Not Clickable (Dead End)
**Flow**: Dashboard → Tenants
**Current**: Tenant cards have `cursor-pointer` and hover styling but NO onClick handler. Users click and nothing happens.
**Confused user**: "The card looks interactive but is broken. How do I see tenant details?"
**Fix**: Either add navigation to tenant detail page or remove hover/pointer styling.

---

## HIGH — Fix This Week

### 4. Export Has No Success Feedback
**Flow**: Events page → Export CSV/JSON
**Current**: Export button shows spinner during request but gives zero feedback on completion. No toast, no download confirmation.
**Confused user**: "Did the export work? Where's my file?"
**Fix**: Add toast notification on successful export download.

### 5. No Webhook Test Feature
**Flow**: Integrations → Webhooks → Add Webhook
**Current**: User enters URL, saves, hopes it works. No "Send Test Event" button.
**Confused user**: "Is my URL reachable? I won't know until real events fail."
**Fix**: Add "Test" button that sends a sample payload and shows response status.

### 6. No SIEM Test Connection
**Flow**: Integrations → SIEM → Add Connector
**Current**: User fills in Splunk/Datadog credentials, saves, no way to verify credentials work.
**Confused user**: "Are my credentials valid? I'll only find out when events don't appear in Splunk."
**Fix**: Add "Test Connection" button that validates credentials before saving.

### 7. API Key Only Shown Once Without Persistent Warning
**Flow**: Settings → API Keys → Create
**Current**: Full key shown in dismissible banner. User might close it before copying.
**Confused user**: "I accidentally closed the banner. Can I see the full key again? No?!"
**Fix**: Add modal with "I've copied the key" confirmation before dismissing. Show key in non-dismissible format until explicitly acknowledged.

### 8. Retention Reduction Lacks Strong Confirmation
**Flow**: Settings → Retention → Reduce days
**Current**: Warning banner shown but "Save Changes" button works with single click. No modal confirmation for destructive action.
**Confused user**: "Wait, did I just delete all my events older than 7 days?"
**Fix**: Add confirmation modal: "This will permanently delete X events older than Y days. Type 'DELETE' to confirm."

### 9. Login Redirect Not Sanitized (Open Redirect)
**Flow**: `/login?redirect=//evil.com`
**Current**: Validates `redirect.startsWith('/')` but `//evil.com` passes this check.
**Confused user**: N/A — security vulnerability.
**Fix**: Use `new URL(redirect, window.location.origin)` and verify `origin` matches.

### 10. Anomaly Detection Toggle Unclear
**Flow**: Dashboard → Anomalies
**Current**: "Active" badge at top but no global enable/disable toggle. Only per-rule toggles exist.
**Confused user**: "Can I turn off all anomaly detection? Or do I have to disable each rule?"
**Fix**: Add global enable/disable toggle with clear label.

---

## MEDIUM — Fix Next Sprint

### 11. Regex Pattern Not Validated on Redaction Rule Create
**Flow**: Settings → Redaction → Custom Rule
**Current**: User enters regex, saves. Invalid regex silently skipped during event processing.
**Confused user**: "My redaction rule isn't working. Why?"
**Fix**: Validate regex client-side and server-side before saving. Show error for invalid patterns.

### 12. Onboarding Wizard Cannot Be Re-Accessed
**Flow**: Dashboard Overview → Onboarding
**Current**: Onboarding wizard dismissed via localStorage flag. No way to re-show it.
**Confused user**: "I dismissed the tutorial too fast. How do I get it back?"
**Fix**: Add "Show Getting Started" link in help menu or settings.

### 13. Webhook Failure Details Not Accessible
**Flow**: Integrations → Webhooks
**Current**: Shows "Last failure: Jan 15" but no error details or response body.
**Confused user**: "My webhook failed but I have no idea why. Was it a 500? A timeout? Wrong auth?"
**Fix**: Add expandable delivery history with status codes and error messages.

### 14. SIEM Feature List Not Gated to Plan
**Flow**: Integrations → SIEM
**Current**: Features like "HMAC-SHA256 signed payloads" listed as available on all plans.
**Confused user**: "Can I use these on Free? Or do I need to upgrade?"
**Fix**: Add plan badges next to gated features or gate the entire SIEM page.

### 15. Viewer Token Scopes Not Enforced
**Flow**: API → Create Viewer Token with scopes
**Current**: Scopes field accepted but middleware hardcodes `['read']`. Custom scopes are ignored.
**Confused user (developer)**: "I set specific scopes but the token can still read everything."
**Fix**: Either enforce stored scopes in middleware or remove the scopes parameter from the API.

### 16. Idempotency Keys Have No TTL
**Flow**: Event ingestion with Idempotency-Key header
**Current**: Keys stored permanently. Over time, stale keys accumulate and could cause false deduplication.
**Fix**: Add 24-hour TTL (already documented as such, but not implemented).

### 17. No Cascading Delete on Project Deletion
**Flow**: Delete a project
**Current**: Project deleted but child records (events, keys, webhooks, tenants) may be orphaned.
**Fix**: Add CASCADE constraints or explicit cleanup in delete handler.

### 18. Team Invite Missing Lifecycle Info
**Flow**: Settings → Team → Invite
**Current**: "Invitation sent to X" but no expiration date shown, no resend button.
**Confused user**: "When does this invite expire? Can I send it again?"
**Fix**: Show invite expiration and add resend/cancel buttons.

### 19. Notification Rule Missing Success Feedback
**Flow**: Integrations → Notifications → Create Rule
**Current**: Form closes and rule appears in list. No toast confirmation.
**Fix**: Add success toast.

### 20. NLP Mode Clears Search Without Confirmation
**Flow**: Events → Toggle NLP
**Current**: Switching to NLP mode clears the current search query instantly.
**Confused user**: "Where did my search go?"
**Fix**: Preserve query text when toggling, or confirm before clearing.

### 21. Signing Key Rotation Missing Grace Period Info
**Flow**: Settings → Signing → Rotate
**Current**: Warning says "cannot be undone" but doesn't explain if old signatures remain verifiable.
**Fix**: Add: "Events signed with the old key will still verify using the stored public key."

### 22. GraphQL Query Depth Limiting Incomplete
**Flow**: /v1/graphql
**Current**: Only checks brace depth (max 10) but no query complexity or field count limits.
**Fix**: Add field-count limits and query timeout.

---

## LOW — Polish

### 23. Copy Button Copies Key Prefix, Not Full Key
Settings → API Keys: Copy icon copies truncated prefix after creation banner is dismissed.

### 24. Progress Bar on Verification Is Fake
Verification page: Progress bar animates on a timer, not tied to actual server progress.

### 25. Billing Button Text Doesn't Show "Upgrading..."
Billing page: Spinner shows but button text stays "Upgrade to Pro" during loading.

### 26. Error Messages Inconsistent Across Auth Pages
All catch blocks show "Network error" even for structured API errors.

### 27. Forgot Password No Client-Side Email Validation
User can submit empty or invalid email before server-side check.

### 28. Docs API Key Example Looks Real
Code example shows `ak_live_your_key_here` — should be `YOUR_API_KEY` clearly.

### 29. Alert Status Change Has No Toast
Anomalies page: Acknowledge/Resolve buttons work but give no visible confirmation.

### 30. Threshold Input Auto-Saves on Blur
Anomaly settings: Threshold saves on blur with no explicit save button. Users may not realize it saved.
