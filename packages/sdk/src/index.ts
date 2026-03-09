export { AuditKit, AuditKitError, TenantClient } from './client.js';
export type { AuditKitConfig, LogOptions } from './client.js';
export { computeRowHash, verifyHash } from './hash.js';
export { BatchQueue } from './batch.js';
export type { BatchConfig } from './batch.js';

// Re-export shared types and events for convenience
export { Events } from '@auditkit/shared';
export type {
  AuditActor,
  AuditContext,
  AuditEvent,
  AuditEventInput,
  AuditSearchQuery,
  AuditSearchResponse,
  AuditSeverity,
  AuditTarget,
  ChainVerificationResult,
  IngestResponse,
  BulkIngestResponse,
  ViewerTokenRequest,
  ViewerTokenResponse,
  EventName,
} from '@auditkit/shared';
