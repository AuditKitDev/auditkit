// ============================================
// @auditkit/sdk — Core Client
// ============================================

import type {
  AuditActor,
  AuditEventInput,
  AuditSearchQuery,
  AuditSearchResponse,
  AuditTarget,
  AuditSeverity,
  BulkIngestResponse,
  ChainVerificationResult,
  IngestResponse,
  ViewerTokenRequest,
  ViewerTokenResponse,
} from '@auditkit/shared';
import { validateEventInput } from '@auditkit/shared';
import { BatchQueue } from './batch.js';

declare const __SDK_VERSION__: string;
const SDK_VERSION = typeof __SDK_VERSION__ !== 'undefined' ? __SDK_VERSION__ : '0.1.0';

// --- Config ---
export interface AuditKitConfig {
  apiKey: string;
  baseUrl?: string;
  defaultTenantId?: string;
  environment?: 'production' | 'staging' | 'development';
  batchSize?: number;
  flushInterval?: number;
  retry?: {
    maxRetries?: number;
    backoff?: 'exponential' | 'linear';
  };
  debug?: boolean;
  logger?: (message: string) => void;
  onError?: (error: AuditKitError) => void;
}

// --- Error ---
export class AuditKitError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuditKitError';
  }
}

// --- Log options (simplified for the most common usage) ---
export interface LogOptions {
  actor: AuditActor;
  target?: AuditTarget;
  tenantId?: string;
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
  context?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
    sessionId?: string;
  };
}

// --- Tenant-scoped client ---
export class TenantClient {
  constructor(
    private client: AuditKit,
    private tenantId: string
  ) {}

  async log(action: string, options: Omit<LogOptions, 'tenantId'>): Promise<void> {
    return this.client.log(action, { ...options, tenantId: this.tenantId });
  }

  async search(query: Omit<AuditSearchQuery, 'tenantId'>): Promise<AuditSearchResponse> {
    return this.client.search({ ...query, tenantId: this.tenantId });
  }

  async createViewerToken(
    options: Omit<ViewerTokenRequest, 'tenantId'>
  ): Promise<ViewerTokenResponse> {
    return this.client.createViewerToken({ ...options, tenantId: this.tenantId });
  }

  async verifyChain(options?: {
    from?: Date | string;
    to?: Date | string;
  }): Promise<ChainVerificationResult> {
    return this.client.verifyChain({ tenantId: this.tenantId, ...options });
  }
}

// --- Main Client ---
export class AuditKit {
  private config: Required<
    Pick<AuditKitConfig, 'baseUrl' | 'environment' | 'batchSize' | 'flushInterval' | 'debug'>
  > &
    AuditKitConfig;
  private batch: BatchQueue;

  constructor(config: AuditKitConfig) {
    if (!config.apiKey) {
      throw new Error('AuditKit: apiKey is required');
    }

    if (config.baseUrl !== undefined) {
      if (!config.baseUrl || (!config.baseUrl.startsWith('http://') && !config.baseUrl.startsWith('https://'))) {
        throw new Error('AuditKit: baseUrl must be a non-empty string starting with http:// or https://');
      }
    }

    if (config.batchSize !== undefined) {
      if (!Number.isInteger(config.batchSize) || config.batchSize <= 0) {
        throw new Error('AuditKit: batchSize must be a positive integer');
      }
    }

    if (config.flushInterval !== undefined) {
      if (typeof config.flushInterval !== 'number' || config.flushInterval <= 0) {
        throw new Error('AuditKit: flushInterval must be a positive number');
      }
    }

    this.config = {
      baseUrl: 'https://api.auditkit.dev',
      environment: 'production',
      batchSize: 25,
      flushInterval: 5000,
      debug: false,
      ...config,
    };

    this.batch = new BatchQueue({
      maxSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      onFlush: (events) => this.sendBatch(events),
      onError: (err) => {
        this.config.onError?.(
          err instanceof AuditKitError
            ? err
            : new AuditKitError(err.message, 'BATCH_FLUSH_ERROR', 0)
        );
      },
    });
  }

  /**
   * Log a single audit event.
   *
   * @example
   * await audit.log('document.updated', {
   *   actor: { id: 'user_123', name: 'Jane' },
   *   target: { type: 'document', id: 'doc_456' },
   * });
   */
  async log(action: string, options: LogOptions): Promise<void> {
    const event: AuditEventInput = {
      action,
      tenantId: options.tenantId ?? this.config.defaultTenantId,
      actor: options.actor,
      target: options.target,
      context: options.context,
      description: options.description,
      category: options.category,
      severity: options.severity,
      metadata: options.metadata,
      tags: options.tags,
      isFailure: options.isFailure,
      isAnonymous: options.isAnonymous,
      errorMessage: options.errorMessage,
      occurredAt: options.occurredAt,
      idempotencyKey: options.idempotencyKey,
    };

    const errors = validateEventInput(event);
    if (errors.length > 0) {
      throw new AuditKitError(
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`,
        'VALIDATION_ERROR',
        400,
        { errors }
      );
    }

    await this.batch.add(event);
  }

  /**
   * Log multiple events at once.
   */
  async logMany(
    events: Array<{ action: string } & LogOptions>
  ): Promise<void> {
    const inputs: AuditEventInput[] = events.map((e) => ({
      action: e.action,
      tenantId: e.tenantId ?? this.config.defaultTenantId,
      actor: e.actor,
      target: e.target,
      context: e.context,
      description: e.description,
      category: e.category,
      severity: e.severity,
      metadata: e.metadata,
      tags: e.tags,
      isFailure: e.isFailure,
      isAnonymous: e.isAnonymous,
      errorMessage: e.errorMessage,
      occurredAt: e.occurredAt,
      idempotencyKey: e.idempotencyKey,
    }));

    for (const input of inputs) {
      const errors = validateEventInput(input);
      if (errors.length > 0) {
        throw new AuditKitError(
          `Validation failed for action "${input.action}": ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`,
          'VALIDATION_ERROR',
          400,
          { errors }
        );
      }
    }

    await this.batch.addMany(inputs);
  }

  /**
   * Create a tenant-scoped client.
   *
   * @example
   * const acmeAudit = audit.forTenant('org_acme');
   * await acmeAudit.log('user.invited', { actor: { id: 'user_1' } });
   */
  forTenant(tenantId: string): TenantClient {
    return new TenantClient(this, tenantId);
  }

  /**
   * Search audit events.
   */
  async search(query: AuditSearchQuery): Promise<AuditSearchResponse> {
    const params = new URLSearchParams();

    if (query.tenantId) params.set('tenant_id', query.tenantId);
    if (query.action) params.set('action', query.action);
    if (query.actorId) params.set('actor_id', query.actorId);
    if (query.targetType) params.set('target_type', query.targetType);
    if (query.targetId) params.set('target_id', query.targetId);
    if (query.query) params.set('query', query.query);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.isAnomalous !== undefined) params.set('is_anomalous', String(query.isAnomalous));

    if (query.severity) {
      const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
      params.set('severity', severities.join(','));
    }

    if (query.tags) params.set('tags', query.tags.join(','));

    if (query.from) {
      params.set('from', query.from instanceof Date ? query.from.toISOString() : query.from);
    }
    if (query.to) {
      params.set('to', query.to instanceof Date ? query.to.toISOString() : query.to);
    }

    return this.request<AuditSearchResponse>(`/v1/events?${params.toString()}`);
  }

  /**
   * Create a scoped viewer token for the embedded UI.
   */
  async createViewerToken(request: ViewerTokenRequest): Promise<ViewerTokenResponse> {
    return this.request<ViewerTokenResponse>('/v1/viewer-tokens', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: request.tenantId,
        scopes: request.scopes,
        expires_in: request.expiresIn ?? '1h',
      }),
    });
  }

  /**
   * Verify hash chain integrity for a tenant.
   */
  async verifyChain(options: {
    tenantId: string;
    from?: Date | string;
    to?: Date | string;
  }): Promise<ChainVerificationResult> {
    const params = new URLSearchParams();
    params.set('tenant_id', options.tenantId);

    if (options.from) {
      params.set('from', options.from instanceof Date ? options.from.toISOString() : options.from);
    }
    if (options.to) {
      params.set('to', options.to instanceof Date ? options.to.toISOString() : options.to);
    }

    return this.request<ChainVerificationResult>(`/v1/verify?${params.toString()}`);
  }

  /**
   * Flush all pending events immediately.
   */
  async flush(): Promise<void> {
    await this.batch.flush();
  }

  /**
   * Close the client and flush remaining events.
   */
  async close(): Promise<void> {
    await this.batch.close();
  }

  // --- Private ---

  private async sendBatch(events: AuditEventInput[]): Promise<void> {
    if (events.length === 1) {
      await this.request<IngestResponse>('/v1/events', {
        method: 'POST',
        body: JSON.stringify(this.serializeEvent(events[0])),
      });
    } else {
      await this.request<BulkIngestResponse>('/v1/events/bulk', {
        method: 'POST',
        body: JSON.stringify({
          events: events.map((e) => this.serializeEvent(e)),
        }),
      });
    }
  }

  private serializeEvent(event: AuditEventInput): Record<string, unknown> {
    return {
      action: event.action,
      tenant_id: event.tenantId,
      actor: {
        id: event.actor.id,
        type: event.actor.type ?? 'user',
        name: event.actor.name,
        email: event.actor.email,
        metadata: event.actor.metadata,
      },
      target: event.target
        ? {
            type: event.target.type,
            id: event.target.id,
            name: event.target.name,
            metadata: event.target.metadata,
          }
        : undefined,
      context: event.context
        ? {
            ip: event.context.ip,
            user_agent: event.context.userAgent,
            request_id: event.context.requestId,
            session_id: event.context.sessionId,
          }
        : undefined,
      description: event.description,
      category: event.category,
      severity: event.severity ?? 'info',
      metadata: event.metadata,
      tags: event.tags,
      is_failure: event.isFailure,
      is_anonymous: event.isAnonymous,
      error_message: event.errorMessage,
      occurred_at: event.occurredAt
        ? event.occurredAt instanceof Date
          ? event.occurredAt.toISOString()
          : event.occurredAt
        : undefined,
      idempotency_key: event.idempotencyKey,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const maxRetries = this.config.retry?.maxRetries ?? 3;
    const backoff = this.config.retry?.backoff ?? 'exponential';

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (this.config.debug) {
          this.config.logger?.(`[AuditKit] ${init?.method ?? 'GET'} ${path} (attempt ${attempt + 1})`);
        }

        const response = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'X-AuditKit-Environment': this.config.environment,
            'User-Agent': `@auditkit/sdk ${SDK_VERSION}`,
            ...init?.headers,
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const error = new AuditKitError(
            (body as Record<string, string>).message ?? `HTTP ${response.status}`,
            (body as Record<string, string>).code ?? 'HTTP_ERROR',
            response.status,
            body as Record<string, unknown>
          );

          // Don't retry 4xx errors (except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }

          lastError = error;
        } else {
          return (await response.json()) as T;
        }
      } catch (error) {
        if (error instanceof AuditKitError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        const delay =
          backoff === 'exponential'
            ? Math.min(1000 * Math.pow(2, attempt), 30000)
            : 1000 * (attempt + 1);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new AuditKitError('Unknown error', 'UNKNOWN', 0);
  }
}
