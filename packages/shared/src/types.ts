// ============================================
// @auditkit/shared — Core Types
// ============================================

// --- Actor ---
export interface AuditActor {
  id: string;
  type?: 'user' | 'api_key' | 'system' | 'service';
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

// --- Target ---
export interface AuditTarget {
  type: string;
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

// --- Context ---
export interface AuditContext {
  ip?: string;
  userAgent?: string;
  location?: string;
  requestId?: string;
  sessionId?: string;
}

// --- Severity ---
export type AuditSeverity = 'info' | 'warn' | 'error' | 'critical';

// --- Event Input (what the SDK sends) ---
export interface AuditEventInput {
  action: string;
  tenantId?: string;
  actor: AuditActor;
  target?: AuditTarget;
  context?: AuditContext;
  description?: string;
  category?: string;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  tags?: string[];
  isFailure?: boolean;
  isAnonymous?: boolean;
  errorMessage?: string;
  occurredAt?: Date | string;
  idempotencyKey?: string;
}

// --- Event (what the API returns) ---
export interface AuditEvent {
  id: string;
  eventId: string;
  projectId: string;
  tenantId: string;
  environment: string;

  action: string;
  category: string | null;
  description: string | null;
  severity: AuditSeverity;

  actorId: string;
  actorType: string;
  actorName: string | null;
  actorEmail: string | null;
  actorMetadata: Record<string, unknown>;

  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  targetMetadata: Record<string, unknown>;

  sourceIp: string | null;
  ipCountry: string | null;
  ipCity: string | null;
  userAgent: string | null;
  requestId: string | null;
  sessionId: string | null;

  isFailure: boolean;
  isAnonymous: boolean;
  errorMessage: string | null;

  metadata: Record<string, unknown>;
  tags: string[];

  occurredAt: string;
  ingestedAt: string;

  prevHash: string | null;
  rowHash: string;

  isAnomalous: boolean;
  anomalyReasons: string[];
}

// --- Search Query ---
export interface AuditSearchQuery {
  tenantId?: string;
  action?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  severity?: AuditSeverity | AuditSeverity[];
  isAnomalous?: boolean;
  tags?: string[];
  from?: Date | string;
  to?: Date | string;
  query?: string;
  limit?: number;
  cursor?: string;
}

// --- Search Response ---
export interface AuditSearchResponse {
  data: AuditEvent[];
  pagination: {
    hasMore: boolean;
    cursor: string | null;
  };
}

// --- Viewer Token ---
export interface ViewerTokenScopes {
  actorId?: string;
  targetTypes?: string[];
  actions?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface ViewerTokenRequest {
  tenantId: string;
  scopes?: ViewerTokenScopes;
  expiresIn?: string;
}

export interface ViewerTokenResponse {
  token: string;
  expiresAt: string;
}

// --- Verification ---
export interface ChainVerificationResult {
  valid: boolean;
  eventsChecked: number;
  firstEvent: string | null;
  lastEvent: string | null;
  chainRootHash: string | null;
  verifiedAt: string;
  brokenLinks?: Array<{
    eventId: string;
    occurredAt: string;
    expected: string;
    actual: string;
  }>;
}

// --- Webhook ---
export interface WebhookPayload {
  id: string;
  type: 'event.created' | 'event.anomaly_detected';
  createdAt: string;
  data: AuditEvent;
}

// --- API Error ---
export interface AuditKitError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

// --- Tenant ---
export interface Tenant {
  id: string;
  projectId: string;
  externalId: string;
  name: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- API Key ---
export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  environment: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// --- Project ---
export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  region: string;
  createdAt: string;
}

// --- Ingest Response ---
export interface IngestResponse {
  id: string;
  eventId: string;
  action: string;
  rowHash: string;
  ingestedAt: string;
}

// --- Bulk Ingest Response ---
export interface BulkIngestResponse {
  events: IngestResponse[];
  count: number;
}

// --- Export ---
export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportRequest {
  tenantId: string;
  from: string;
  to: string;
  format: ExportFormat;
  actions?: string[];
  actorIds?: string[];
}

export interface ExportResponse {
  downloadUrl: string;
  expiresAt: string;
  eventCount: number;
}
