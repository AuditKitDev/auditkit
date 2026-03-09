-- ============================================
-- Row-Level Security (RLS) Policies
-- Defense-in-depth for tenant isolation
-- ============================================
--
-- These policies enforce project-scoped isolation at the database level.
-- Application-level filtering (via auth.projectId) remains the primary
-- mechanism; RLS acts as a safety net in case of application bugs.
--
-- USAGE: Before each request, the application must set the current project
-- context via:
--   SET LOCAL app.current_project_id = '<project-uuid>';
--
-- This should be done inside a transaction so the setting is automatically
-- cleared when the transaction ends.
-- ============================================

-- Enable RLS on all project-scoped tables
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE redaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE siem_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE merkle_roots ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detection_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
-- All policies use the same pattern: match project_id against the session variable

CREATE POLICY project_isolation ON audit_events
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON tenants
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON webhook_endpoints
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

-- webhook_deliveries are scoped via their parent webhook_endpoint;
-- join-based RLS is complex, so we rely on app-level checks for deliveries.
-- If needed, denormalize project_id into webhook_deliveries.

CREATE POLICY project_isolation ON viewer_tokens
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON retention_policies
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON redaction_rules
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON signing_keys
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON siem_connectors
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON notification_rules
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON export_jobs
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON compliance_reports
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON merkle_roots
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON data_residency_configs
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON anomaly_alerts
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON anomaly_baselines
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

CREATE POLICY project_isolation ON anomaly_detection_settings
  USING (project_id = current_setting('app.current_project_id', true)::uuid);

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. RLS policies apply to non-superuser roles. The application database
--    user should NOT be a superuser.
-- 2. The 'true' parameter in current_setting() returns NULL instead of
--    erroring if the variable is not set, which causes all rows to be
--    filtered out (safe default).
-- 3. Tables not scoped to a project (users, sessions, projects,
--    subscriptions, password_reset_tokens, email_verification_tokens,
--    idempotency_keys, monthly_usage) are excluded from RLS as they
--    use user-level scoping via the session middleware.
-- 4. These are defense-in-depth. Application-level filtering via
--    auth.projectId remains the primary isolation mechanism.
