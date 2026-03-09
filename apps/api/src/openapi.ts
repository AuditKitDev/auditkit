import { Hono } from 'hono';

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'AuditKit API',
    description: 'Audit logging as a service. Ingest, search, and export audit events with tamper-proof hash chains.',
    version: '1.0.0',
    contact: {
      name: 'AuditKit',
      url: 'https://auditkit.dev',
    },
  },
  servers: [
    {
      url: '{baseUrl}/v1',
      description: 'AuditKit API v1',
      variables: {
        baseUrl: {
          default: process.env.API_URL || 'http://localhost:3001',
        },
      },
    },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        description: 'API key (ak_live_... or ak_test_...) or viewer token (vt_...)',
      },
    },
    headers: {
      'X-RateLimit-Limit': {
        description: 'Maximum number of requests allowed in the current window',
        schema: { type: 'integer' },
      },
      'X-RateLimit-Remaining': {
        description: 'Number of requests remaining in the current window',
        schema: { type: 'integer' },
      },
      'X-RateLimit-Reset': {
        description: 'Unix timestamp when the rate limit window resets',
        schema: { type: 'integer' },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          status: { type: 'integer' },
        },
        required: ['code', 'message'],
      },
      Actor: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', default: 'user' },
          name: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          metadata: { type: 'object', additionalProperties: true, default: {} },
        },
        required: ['id'],
      },
      Target: {
        type: 'object',
        nullable: true,
        properties: {
          type: { type: 'string' },
          id: { type: 'string', nullable: true },
          name: { type: 'string', nullable: true },
          metadata: { type: 'object', additionalProperties: true, default: {} },
        },
        required: ['type'],
      },
      Context: {
        type: 'object',
        properties: {
          ip: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          user_agent: { type: 'string', nullable: true },
          request_id: { type: 'string', nullable: true },
          session_id: { type: 'string', nullable: true },
        },
      },
      EventInput: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string', description: 'External tenant identifier' },
          action: { type: 'string', description: 'Action name (e.g., document.created)' },
          category: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
          actor: { $ref: '#/components/schemas/Actor' },
          target: { $ref: '#/components/schemas/Target' },
          context: {
            type: 'object',
            properties: {
              ip: { type: 'string' },
              user_agent: { type: 'string' },
              request_id: { type: 'string' },
              session_id: { type: 'string' },
            },
          },
          is_failure: { type: 'boolean', default: false },
          is_anonymous: { type: 'boolean', default: false },
          error_message: { type: 'string', nullable: true },
          metadata: { type: 'object', additionalProperties: true, default: {} },
          tags: { type: 'array', items: { type: 'string' }, default: [] },
          occurred_at: { type: 'string', format: 'date-time', nullable: true },
          idempotency_key: { type: 'string', nullable: true },
        },
        required: ['tenant_id', 'action', 'actor'],
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          event_id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          tenant_id: { type: 'string', format: 'uuid' },
          environment: { type: 'string' },
          action: { type: 'string' },
          category: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
          actor: { $ref: '#/components/schemas/Actor' },
          target: { $ref: '#/components/schemas/Target' },
          context: { $ref: '#/components/schemas/Context' },
          is_failure: { type: 'boolean' },
          is_anonymous: { type: 'boolean' },
          error_message: { type: 'string', nullable: true },
          metadata: { type: 'object', additionalProperties: true },
          tags: { type: 'array', items: { type: 'string' } },
          occurred_at: { type: 'string', format: 'date-time' },
          ingested_at: { type: 'string', format: 'date-time' },
          row_hash: { type: 'string' },
          prev_hash: { type: 'string', nullable: true },
          is_anomalous: { type: 'boolean' },
          anomaly_reasons: { type: 'array', items: { type: 'string' } },
        },
      },
      EventCreated: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          event_id: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          row_hash: { type: 'string' },
          ingested_at: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          has_more: { type: 'boolean' },
          cursor: { type: 'string', nullable: true },
        },
      },
      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          external_id: { type: 'string' },
          name: { type: 'string', nullable: true },
          metadata: { type: 'object', additionalProperties: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      WebhookEndpoint: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          is_active: { type: 'boolean' },
          failure_count: { type: 'string' },
          last_success_at: { type: 'string', format: 'date-time', nullable: true },
          last_failure_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ViewerToken: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'The viewer token (shown only once)' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      VerifyResult: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      ExportJob: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          format: { type: 'string', enum: ['csv', 'json'] },
          filters: { type: 'object', additionalProperties: true },
          created_at: { type: 'string', format: 'date-time' },
          completed_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  paths: {
    '/events': {
      post: {
        operationId: 'createEvent',
        summary: 'Log a single audit event',
        tags: ['Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EventInput' },
            },
          },
        },
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Unique key to prevent duplicate event processing',
          },
        ],
        responses: {
          '201': {
            description: 'Event created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventCreated' },
              },
            },
            headers: {
              'X-RateLimit-Limit': { $ref: '#/components/headers/X-RateLimit-Limit' },
              'X-RateLimit-Remaining': { $ref: '#/components/headers/X-RateLimit-Remaining' },
              'X-RateLimit-Reset': { $ref: '#/components/headers/X-RateLimit-Reset' },
            },
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '429': {
            description: 'Rate limit exceeded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      get: {
        operationId: 'listEvents',
        summary: 'Search and list audit events',
        tags: ['Events'],
        parameters: [
          { name: 'tenant_id', in: 'query', schema: { type: 'string' }, description: 'Filter by external tenant ID' },
          { name: 'action', in: 'query', schema: { type: 'string' }, description: 'Filter by action (supports glob: document.*)' },
          { name: 'actor_id', in: 'query', schema: { type: 'string' }, description: 'Filter by actor ID' },
          { name: 'target_type', in: 'query', schema: { type: 'string' }, description: 'Filter by target type' },
          { name: 'target_id', in: 'query', schema: { type: 'string' }, description: 'Filter by target ID' },
          { name: 'severity', in: 'query', schema: { type: 'string' }, description: 'Filter by severity (comma-separated: info,warning,error,critical)' },
          { name: 'is_anomalous', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Filter anomalous events only' },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Events occurred after this time' },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Events occurred before this time' },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Advanced query language (e.g., actor:john@co.com action:delete severity:error after:2025-01-01)' },
          { name: 'query', in: 'query', schema: { type: 'string' }, description: 'Full-text search across action, actor, target, and description' },
          { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Pagination cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 1000 }, description: 'Number of events to return' },
        ],
        responses: {
          '200': {
            description: 'List of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/events/bulk': {
      post: {
        operationId: 'createEventsBulk',
        summary: 'Log multiple audit events in a single request',
        tags: ['Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  events: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/EventInput' },
                    maxItems: 100,
                  },
                },
                required: ['events'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Events created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: { type: 'array', items: { $ref: '#/components/schemas/EventCreated' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/events/{event_id}': {
      get: {
        operationId: 'getEvent',
        summary: 'Get a single audit event by ID',
        tags: ['Events'],
        parameters: [
          { name: 'event_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Event details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } },
          },
          '404': {
            description: 'Event not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/events/stream': {
      get: {
        operationId: 'streamEvents',
        summary: 'Stream audit events in real-time via Server-Sent Events',
        tags: ['Events'],
        responses: {
          '200': {
            description: 'SSE event stream',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/tenants': {
      get: {
        operationId: 'listTenants',
        summary: 'List tenants for the project',
        tags: ['Tenants'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of tenants',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Tenant' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createTenant',
        summary: 'Create a new tenant',
        tags: ['Tenants'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  external_id: { type: 'string' },
                  name: { type: 'string' },
                  metadata: { type: 'object', additionalProperties: true },
                },
                required: ['external_id'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tenant created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } },
          },
        },
      },
    },
    '/tenants/{tenant_id}': {
      get: {
        operationId: 'getTenant',
        summary: 'Get a tenant by external ID',
        tags: ['Tenants'],
        parameters: [
          { name: 'tenant_id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Tenant details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } },
          },
          '404': {
            description: 'Tenant not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/webhooks': {
      get: {
        operationId: 'listWebhooks',
        summary: 'List webhook endpoints',
        tags: ['Webhooks'],
        responses: {
          '200': {
            description: 'List of webhook endpoints',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/WebhookEndpoint' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createWebhook',
        summary: 'Create a webhook endpoint',
        tags: ['Webhooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: { type: 'array', items: { type: 'string' }, default: ['*'] },
                },
                required: ['url'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookEndpoint' } } },
          },
        },
      },
    },
    '/webhooks/{webhook_id}': {
      delete: {
        operationId: 'deleteWebhook',
        summary: 'Delete a webhook endpoint',
        tags: ['Webhooks'],
        parameters: [
          { name: 'webhook_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Webhook deleted',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } },
          },
          '404': {
            description: 'Webhook not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/viewer-tokens': {
      post: {
        operationId: 'createViewerToken',
        summary: 'Create a scoped viewer token for embedding audit logs',
        tags: ['Viewer Tokens'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tenant_id: { type: 'string', description: 'External tenant ID to scope the token' },
                  scopes: { type: 'object', additionalProperties: true },
                  expires_in: { type: 'integer', description: 'Token TTL in seconds', default: 3600 },
                },
                required: ['tenant_id'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Viewer token created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ViewerToken' } } },
          },
        },
      },
    },
    '/verify': {
      post: {
        operationId: 'verifyHashChain',
        summary: 'Verify the integrity of the audit event hash chain',
        tags: ['Verify'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tenant_id: { type: 'string', description: 'External tenant ID to verify' },
                  from: { type: 'string', format: 'date-time' },
                  to: { type: 'string', format: 'date-time' },
                },
                required: ['tenant_id'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification result',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyResult' } } },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApiSpec',
        summary: 'Get the OpenAPI specification',
        tags: ['Meta'],
        security: [],
        responses: {
          '200': {
            description: 'OpenAPI 3.1 specification',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Events', description: 'Audit event ingestion and search' },
    { name: 'Tenants', description: 'Tenant management' },
    { name: 'Webhooks', description: 'Webhook endpoint management' },
    { name: 'Viewer Tokens', description: 'Scoped read-only tokens for embedding' },
    { name: 'Verify', description: 'Hash chain integrity verification' },
    { name: 'Meta', description: 'API metadata' },
  ],
};

export function createOpenApiRouter() {
  const router = new Hono();

  router.get('/openapi.json', (c) => {
    return c.json(openApiSpec);
  });

  return router;
}

export { openApiSpec };
