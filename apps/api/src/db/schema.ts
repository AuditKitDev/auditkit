import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  bigserial,
  bigint,
  integer,
  jsonb,
  inet,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// Users
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').notNull().default(false),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Sessions
// ============================================
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_sessions_token').on(table.tokenHash)]
);

// ============================================
// Projects
// ============================================
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  region: text('region').notNull().default('us-east-1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// API Keys
// ============================================
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    environment: text('environment').notNull().default('production'),
    scopes: text('scopes')
      .array()
      .notNull()
      .default(sql`ARRAY['write','read']`),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_api_keys_hash').on(table.keyHash)]
);

// ============================================
// Tenants
// ============================================
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    name: text('name'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_tenants_project_external').on(table.projectId, table.externalId)]
);

// ============================================
// Audit Events (core table)
// ============================================
export const auditEvents = pgTable(
  'audit_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    eventId: uuid('event_id').notNull().defaultRandom(),
    idempotencyKey: text('idempotency_key').unique(),

    // Tenant
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    tenantId: uuid('tenant_id').notNull(),
    environment: text('environment').notNull().default('production'),

    // Event
    action: text('action').notNull(),
    category: text('category'),
    description: text('description'),
    severity: text('severity').notNull().default('info'),

    // Actor
    actorId: text('actor_id').notNull(),
    actorType: text('actor_type').notNull().default('user'),
    actorName: text('actor_name'),
    actorEmail: text('actor_email'),
    actorMetadata: jsonb('actor_metadata').$type<Record<string, unknown>>().default({}),

    // Target
    targetType: text('target_type'),
    targetId: text('target_id'),
    targetName: text('target_name'),
    targetMetadata: jsonb('target_metadata').$type<Record<string, unknown>>().default({}),

    // Context
    sourceIp: inet('source_ip'),
    ipCountry: text('ip_country'),
    ipCity: text('ip_city'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    sessionId: text('session_id'),

    // Result
    isFailure: boolean('is_failure').notNull().default(false),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    errorMessage: text('error_message'),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    // Timestamps
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),

    // Integrity (hash chain)
    // MIGRATION: Add CHECK constraint to prevent placeholder hashes from being committed:
    //   ALTER TABLE audit_events ADD CONSTRAINT chk_row_hash_not_placeholder
    //     CHECK (row_hash NOT IN ('pending', 'computing'));
    prevHash: text('prev_hash'),
    rowHash: text('row_hash').notNull(),

    // Signing
    signature: text('signature'),
    signingKeyId: uuid('signing_key_id'),

    // Data Residency
    region: text('region'),

    // Anomaly
    isAnomalous: boolean('is_anomalous').notNull().default(false),
    anomalyReasons: text('anomaly_reasons')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
  },
  (table) => [
    index('idx_events_tenant_time').on(table.tenantId, table.occurredAt),
    index('idx_events_project').on(table.projectId, table.occurredAt),
    index('idx_events_actor').on(table.tenantId, table.actorId, table.occurredAt),
    index('idx_events_action').on(table.tenantId, table.action, table.occurredAt),
    index('idx_events_target').on(table.tenantId, table.targetType, table.targetId),
  ]
);

// ============================================
// Viewer Tokens
// ============================================
export const viewerTokens = pgTable('viewer_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  scopes: jsonb('scopes').$type<Record<string, unknown>>().default({}),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Webhook Endpoints
// ============================================
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: text('events')
    .array()
    .notNull()
    .default(sql`ARRAY['*']`),
  isActive: boolean('is_active').notNull().default(true),
  // TODO: failureCount should be integer type, not text. Requires a migration to change.
  failureCount: text('failure_count').notNull().default('0'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Webhook Deliveries
// ============================================
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    eventId: text('event_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    // TODO: responseStatus should be integer type, not text. Requires a migration to change.
    responseStatus: text('response_status'),
    responseBody: text('response_body'),
    // TODO: attempt should be integer type, not text. Requires a migration to change.
    attempt: text('attempt').notNull().default('1'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_deliveries_endpoint').on(table.endpointId, table.createdAt)]
);

// ============================================
// Retention Policies
// ============================================
export const retentionPolicies = pgTable('retention_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id'),
  // TODO: retentionDays should be integer type, not text. Requires a migration to change.
  retentionDays: text('retention_days').notNull().default('30'),
  legalHold: boolean('legal_hold').notNull().default(false),
  legalHoldUntil: timestamp('legal_hold_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Password Reset Tokens
// ============================================
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_password_reset_token').on(table.tokenHash)]
);

// ============================================
// Email Verification Tokens
// ============================================
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_email_verification_token').on(table.tokenHash)]
);

// ============================================
// Subscriptions
// ============================================
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  eventQuota: integer('event_quota').notNull().default(1000),
  projectQuota: integer('project_quota').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// SIEM Connectors
// ============================================
export const siemConnectors = pgTable('siem_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // splunk | datadog | s3 | custom_http | sentinel | gcs | bigquery | elastic
  name: text('name').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Merkle Roots
// ============================================
export const merkleRoots = pgTable(
  'merkle_roots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    rootHash: text('root_hash').notNull(),
    eventCount: integer('event_count').notNull(),
    fromEventId: bigint('from_event_id', { mode: 'number' }).notNull(),
    toEventId: bigint('to_event_id', { mode: 'number' }).notNull(),
    treeData: jsonb('tree_data').$type<string[][]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_merkle_roots_project').on(table.projectId, table.createdAt)]
);

// ============================================
// Redaction Rules
// ============================================
export const redactionRules = pgTable(
  'redaction_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fieldPath: text('field_path').notNull(),
    pattern: text('pattern').notNull(),
    replacement: text('replacement').notNull().default('[REDACTED]'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_redaction_rules_project').on(table.projectId)]
);

// ============================================
// Signing Keys
// ============================================
export const signingKeys = pgTable(
  'signing_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull(),
    privateKeyEncrypted: text('private_key_encrypted').notNull(),
    algorithm: text('algorithm').notNull().default('Ed25519'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [index('idx_signing_keys_project').on(table.projectId)]
);

// ============================================
// Compliance Reports
// ============================================
export const complianceReports = pgTable(
  'compliance_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    framework: text('framework').notNull(), // soc2 | hipaa | iso27001 | gdpr
    status: text('status').notNull().default('completed'),
    reportData: jsonb('report_data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_compliance_reports_project').on(table.projectId, table.createdAt)]
);

// ============================================
// Notification Rules
// ============================================
export const notificationRules = pgTable('notification_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  conditions: jsonb('conditions').$type<Record<string, unknown>>().notNull(),
  channelType: text('channel_type').notNull(), // slack | discord | email | webhook
  channelConfig: jsonb('channel_config').$type<Record<string, unknown>>().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Data Residency Configs
// ============================================
export const dataResidencyConfigs = pgTable(
  'data_residency_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    region: text('region').notNull().default('us'), // us | eu | apac | custom
    storageEndpoint: text('storage_endpoint'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_data_residency_project').on(table.projectId)]
);

// ============================================
// Anomaly Alerts
// ============================================
export const anomalyAlerts = pgTable(
  'anomaly_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    severity: text('severity').notNull().default('medium'), // low | medium | high | critical
    description: text('description').notNull(),
    eventIds: jsonb('event_ids').$type<string[]>().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    status: text('status').notNull().default('open'), // open | acknowledged | resolved
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_anomaly_alerts_project').on(table.projectId, table.createdAt),
    index('idx_anomaly_alerts_status').on(table.projectId, table.status),
  ]
);

// ============================================
// Anomaly Baselines
// ============================================
export const anomalyBaselines = pgTable(
  'anomaly_baselines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    metric: text('metric').notNull(),
    baselineValue: text('baseline_value').notNull().default('0'),
    stdDev: text('std_dev').notNull().default('0'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_anomaly_baselines_project_metric').on(table.projectId, table.metric)]
);

// ============================================
// Anomaly Detection Settings
// ============================================
export const anomalyDetectionSettings = pgTable(
  'anomaly_detection_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_anomaly_settings_project').on(table.projectId)]
);

// ============================================
// Idempotency Keys
// ============================================
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    responseStatus: integer('response_status').notNull(),
    responseBody: text('response_body'),
    responseHeaders: jsonb('response_headers').$type<Record<string, string>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('idx_idempotency_key').on(table.key)]
);

// ============================================
// Monthly Usage
// ============================================
export const monthlyUsage = pgTable(
  'monthly_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    yearMonth: text('year_month').notNull(), // "2026-03"
    eventCount: integer('event_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_monthly_usage_project_month').on(table.projectId, table.yearMonth)]
);

// ============================================
// Team Members
// ============================================
export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // owner | admin | member
    invitedBy: uuid('invited_by').references(() => users.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_team_members_project_user').on(table.projectId, table.userId),
    index('idx_team_members_user').on(table.userId),
  ]
);

// ============================================
// Team Invitations
// ============================================
export const teamInvitations = pgTable(
  'team_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    tokenHash: text('token_hash').notNull(),
    invitedBy: uuid('invited_by').notNull().references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_team_invitations_token').on(table.tokenHash),
    index('idx_team_invitations_project').on(table.projectId),
  ]
);

// ============================================
// Refresh Tokens
// ============================================
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(), // For detecting rotation violations
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_refresh_tokens_hash').on(table.tokenHash),
    index('idx_refresh_tokens_family').on(table.familyId),
  ]
);

// ============================================
// Export Jobs
// ============================================
export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  format: text('format').notNull().default('json'),
  filters: jsonb('filters').$type<Record<string, unknown>>().default({}),
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
