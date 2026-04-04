export interface FAQ {
  question: string;
  answer: string;
}

export interface IntegrationStep {
  step: number;
  title: string;
  description: string;
  code?: string;
}

export interface DevFramework {
  slug: string;
  name: string;
  language: string;
  description: string;
  overview: string;
  integrationSteps: IntegrationStep[];
  codeExample: string;
  commonPatterns: string[];
  faqs: FAQ[];
}

export const devFrameworks: DevFramework[] = [
  {
    slug: 'nodejs',
    name: 'Node.js',
    language: 'TypeScript / JavaScript',
    description:
      'Add immutable audit logging to your Node.js application with the AuditKit SDK. Capture user actions, API calls, and system events with SHA-256 hash chains and Merkle tree proofs.',
    overview:
      'Node.js powers the majority of modern B2B SaaS backends. Adding audit logging to a Node.js application is straightforward with the AuditKit SDK, which provides a typed client for capturing events, querying logs, and verifying integrity. The SDK supports both CommonJS and ES modules, works with any Node.js framework, and integrates with popular ORMs like Prisma and Drizzle for automatic database change logging.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the SDK',
        description: 'Add the AuditKit Node.js SDK to your project.',
        code: 'npm install @auditkit/node',
      },
      {
        step: 2,
        title: 'Initialize the client',
        description: 'Create an AuditKit client instance with your API key and tenant configuration.',
        code: `import { AuditKit } from '@auditkit/node';

const auditkit = new AuditKit({
  apiKey: process.env.AUDITKIT_API_KEY,
  tenantId: 'org_123',
});`,
      },
      {
        step: 3,
        title: 'Log your first event',
        description: 'Capture an audit event with actor, action, target, and metadata.',
        code: `await auditkit.log({
  action: 'user.login',
  actor: {
    id: 'user_456',
    email: 'jane@acme.com',
    name: 'Jane Smith',
  },
  target: {
    type: 'session',
    id: 'sess_789',
  },
  context: {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  },
});`,
      },
      {
        step: 4,
        title: 'Query and verify logs',
        description: 'Retrieve audit logs with filtering and verify their integrity using Merkle proofs.',
        code: `// Query recent events
const events = await auditkit.query({
  actions: ['user.login', 'user.logout'],
  actorId: 'user_456',
  since: '2024-01-01T00:00:00Z',
  limit: 100,
});

// Verify integrity of a specific event
const proof = await auditkit.verify(events[0].id);
console.log(proof.valid); // true
console.log(proof.merkleRoot); // SHA-256 root hash`,
      },
    ],
    codeExample: `import { AuditKit } from '@auditkit/node';
import express from 'express';

const app = express();
const auditkit = new AuditKit({
  apiKey: process.env.AUDITKIT_API_KEY,
  tenantId: 'org_123',
});

// Middleware to log all API requests
app.use(async (req, res, next) => {
  const start = Date.now();
  res.on('finish', async () => {
    await auditkit.log({
      action: \`api.\${req.method.toLowerCase()}\`,
      actor: {
        id: req.user?.id ?? 'anonymous',
        email: req.user?.email,
      },
      target: {
        type: 'api_endpoint',
        id: req.path,
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
    });
  });
  next();
});

// Log sensitive operations explicitly
app.post('/api/users/:id/role', async (req, res) => {
  const { role } = req.body;
  const user = await db.users.update(req.params.id, { role });

  await auditkit.log({
    action: 'user.role_changed',
    actor: { id: req.user.id, email: req.user.email },
    target: { type: 'user', id: req.params.id },
    metadata: {
      previousRole: user.previousRole,
      newRole: role,
    },
  });

  res.json(user);
});`,
    commonPatterns: [
      'Express/Koa middleware for automatic request logging',
      'Prisma middleware for database change capture',
      'Authentication event logging (login, logout, MFA, password reset)',
      'Role and permission change tracking',
      'Data export and deletion request logging for GDPR',
      'Webhook delivery and retry logging',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a Node.js application?',
        answer:
          'Install the @auditkit/node SDK, initialize it with your API key, and call auditkit.log() at key points in your application. The SDK supports structured events with actor, action, target, and context fields. Events are cryptographically chained using SHA-256 hashes for tamper-proof integrity.',
      },
      {
        question: 'Does the AuditKit Node.js SDK support TypeScript?',
        answer:
          'Yes. The @auditkit/node SDK is written in TypeScript and ships with full type definitions. All event types, query parameters, and verification results are fully typed.',
      },
      {
        question: 'Can I use AuditKit with Prisma or Drizzle ORM?',
        answer:
          'Yes. AuditKit provides middleware integrations for Prisma and Drizzle that automatically log database mutations (create, update, delete) as audit events with before/after state captured in the metadata.',
      },
    ],
  },
  {
    slug: 'nestjs',
    name: 'NestJS',
    language: 'TypeScript',
    description:
      'Integrate AuditKit into your NestJS application using decorators, interceptors, and the built-in module system for clean, maintainable audit logging.',
    overview:
      'NestJS is the most popular enterprise Node.js framework, known for its modular architecture and dependency injection. AuditKit provides a dedicated NestJS module that integrates naturally with the framework\'s patterns. Use the @AuditLog() decorator to mark controller methods for automatic logging, or inject the AuditKitService into any provider for programmatic control. The module supports async configuration for loading credentials from environment variables or secret managers.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the SDK',
        description: 'Add the AuditKit NestJS module.',
        code: 'npm install @auditkit/nestjs @auditkit/node',
      },
      {
        step: 2,
        title: 'Register the module',
        description: 'Import AuditKitModule in your root AppModule with async configuration.',
        code: `import { AuditKitModule } from '@auditkit/nestjs';

@Module({
  imports: [
    AuditKitModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        apiKey: config.get('AUDITKIT_API_KEY'),
        tenantResolver: (req) => req.user?.organizationId,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}`,
      },
      {
        step: 3,
        title: 'Use the decorator',
        description: 'Add @AuditLog() to controller methods for automatic event capture.',
        code: `import { AuditLog } from '@auditkit/nestjs';

@Controller('users')
export class UsersController {
  @Post(':id/role')
  @AuditLog({
    action: 'user.role_changed',
    targetType: 'user',
    targetId: (req) => req.params.id,
  })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.usersService.changeRole(id, dto.role);
  }
}`,
      },
      {
        step: 4,
        title: 'Inject the service directly',
        description: 'For more control, inject AuditKitService into any provider.',
        code: `import { AuditKitService } from '@auditkit/nestjs';

@Injectable()
export class PaymentsService {
  constructor(private readonly auditkit: AuditKitService) {}

  async processRefund(userId: string, paymentId: string) {
    const result = await this.stripe.refund(paymentId);

    await this.auditkit.log({
      action: 'payment.refunded',
      actor: { id: userId },
      target: { type: 'payment', id: paymentId },
      metadata: { amount: result.amount, currency: result.currency },
    });

    return result;
  }
}`,
      },
    ],
    codeExample: `import { Module } from '@nestjs/common';
import { AuditKitModule, AuditLog, AuditKitService } from '@auditkit/nestjs';
import { ConfigService } from '@nestjs/config';

// Module setup with async configuration
@Module({
  imports: [
    AuditKitModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        apiKey: config.get('AUDITKIT_API_KEY'),
        tenantResolver: (req) => req.user?.organizationId,
        defaultContext: (req) => ({
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}

// Controller with decorator-based logging
@Controller('documents')
export class DocumentsController {
  constructor(private readonly auditkit: AuditKitService) {}

  @Get(':id')
  @AuditLog({
    action: 'document.viewed',
    targetType: 'document',
    targetId: (req) => req.params.id,
  })
  async getDocument(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id') id: string,
    @Request() req,
  ) {
    const doc = await this.documentsService.findOne(id);
    await this.documentsService.delete(id);

    await this.auditkit.log({
      action: 'document.deleted',
      actor: { id: req.user.id, email: req.user.email },
      target: { type: 'document', id },
      metadata: {
        documentTitle: doc.title,
        deletedAt: new Date().toISOString(),
      },
    });
  }
}`,
    commonPatterns: [
      '@AuditLog() decorator for declarative controller-level logging',
      'AuditKitService injection for programmatic logging in services',
      'Global interceptor for blanket API request logging',
      'Guard integration for authentication event capture',
      'CQRS event handler integration for domain event logging',
      'Multi-tenant resolver for automatic tenant isolation',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a NestJS application?',
        answer:
          'Install @auditkit/nestjs, register AuditKitModule.forRootAsync() in your AppModule, then use the @AuditLog() decorator on controller methods or inject AuditKitService into any provider for programmatic logging.',
      },
      {
        question: 'Does AuditKit work with NestJS guards and interceptors?',
        answer:
          'Yes. AuditKit provides a global interceptor that can automatically log all API requests. It also integrates with NestJS guards to capture authentication events and with exception filters to log error events.',
      },
    ],
  },
  {
    slug: 'fastapi',
    name: 'FastAPI',
    language: 'Python',
    description:
      'Add tamper-proof audit logging to your FastAPI application with the AuditKit Python SDK. Middleware-based integration with async support and Pydantic model compatibility.',
    overview:
      'FastAPI is the fastest-growing Python web framework, favored for its async support, automatic API documentation, and Pydantic integration. The AuditKit Python SDK provides a FastAPI middleware for automatic request logging and a client for explicit event capture. The SDK is fully async-compatible, uses Pydantic models for type safety, and integrates with SQLAlchemy for automatic ORM change tracking.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the SDK',
        description: 'Add the AuditKit Python SDK.',
        code: 'pip install auditkit',
      },
      {
        step: 2,
        title: 'Initialize and add middleware',
        description: 'Configure AuditKit and add the FastAPI middleware.',
        code: `from fastapi import FastAPI
from auditkit import AuditKit
from auditkit.fastapi import AuditKitMiddleware

app = FastAPI()
auditkit = AuditKit(
    api_key=os.environ["AUDITKIT_API_KEY"],
    tenant_id="org_123",
)
app.add_middleware(AuditKitMiddleware, client=auditkit)`,
      },
      {
        step: 3,
        title: 'Log events explicitly',
        description: 'Capture specific audit events in your route handlers.',
        code: `from auditkit import AuditEvent

@app.post("/api/users/{user_id}/role")
async def change_role(user_id: str, role: RoleUpdate, request: Request):
    previous_role = await db.get_user_role(user_id)
    await db.update_role(user_id, role.new_role)

    await auditkit.log(AuditEvent(
        action="user.role_changed",
        actor={"id": request.state.user.id, "email": request.state.user.email},
        target={"type": "user", "id": user_id},
        metadata={"previous_role": previous_role, "new_role": role.new_role},
    ))

    return {"status": "updated"}`,
      },
    ],
    codeExample: `import os
from fastapi import FastAPI, Request, Depends
from auditkit import AuditKit, AuditEvent
from auditkit.fastapi import AuditKitMiddleware

app = FastAPI()
auditkit = AuditKit(
    api_key=os.environ["AUDITKIT_API_KEY"],
    tenant_id="org_123",
)
app.add_middleware(AuditKitMiddleware, client=auditkit)

@app.post("/api/documents")
async def create_document(doc: DocumentCreate, request: Request):
    document = await db.documents.create(doc.dict())

    await auditkit.log(AuditEvent(
        action="document.created",
        actor={
            "id": request.state.user.id,
            "email": request.state.user.email,
        },
        target={"type": "document", "id": document.id},
        metadata={
            "title": document.title,
            "classification": document.classification,
        },
    ))

    return document

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str, request: Request):
    document = await db.documents.get(doc_id)
    await db.documents.delete(doc_id)

    await auditkit.log(AuditEvent(
        action="document.deleted",
        actor={"id": request.state.user.id},
        target={"type": "document", "id": doc_id},
        metadata={"title": document.title},
    ))

    return {"status": "deleted"}

# Verify audit log integrity
@app.get("/api/audit/verify/{event_id}")
async def verify_event(event_id: str):
    proof = await auditkit.verify(event_id)
    return {
        "valid": proof.valid,
        "merkle_root": proof.merkle_root,
        "hash_chain_position": proof.chain_position,
    }`,
    commonPatterns: [
      'FastAPI middleware for automatic HTTP request/response logging',
      'Dependency injection for per-request audit context',
      'SQLAlchemy event hooks for ORM change tracking',
      'Background task integration for non-blocking audit logging',
      'Pydantic model integration for typed audit events',
      'ASGI lifespan hooks for startup/shutdown logging',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a FastAPI application?',
        answer:
          'Install the auditkit package, create an AuditKit client, and add AuditKitMiddleware to your FastAPI app for automatic request logging. Use auditkit.log() with AuditEvent objects for explicit event capture in route handlers.',
      },
      {
        question: 'Is the AuditKit Python SDK async-compatible?',
        answer:
          'Yes. The AuditKit Python SDK is fully async-native, designed for FastAPI and other async frameworks. All logging and query operations use async/await and work with asyncio event loops.',
      },
    ],
  },
  {
    slug: 'go',
    name: 'Go',
    language: 'Go',
    description:
      'Integrate AuditKit into your Go application with the official Go SDK. Zero-allocation hot path, context-aware logging, and native support for middleware patterns.',
    overview:
      'Go is the language of choice for high-performance backend systems, infrastructure tools, and cloud-native applications. The AuditKit Go SDK is designed for performance-critical applications with zero-allocation logging on the hot path, context propagation through context.Context, and native support for net/http middleware patterns. The SDK works with any Go HTTP router including chi, gorilla/mux, gin, and the standard library.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the SDK',
        description: 'Add the AuditKit Go module.',
        code: 'go get github.com/auditkit/auditkit-go',
      },
      {
        step: 2,
        title: 'Initialize the client',
        description: 'Create an AuditKit client with your configuration.',
        code: `import "github.com/auditkit/auditkit-go"

client, err := auditkit.New(auditkit.Config{
    APIKey:   os.Getenv("AUDITKIT_API_KEY"),
    TenantID: "org_123",
})
if err != nil {
    log.Fatal(err)
}
defer client.Close()`,
      },
      {
        step: 3,
        title: 'Log events',
        description: 'Capture audit events with strongly typed structs.',
        code: `err := client.Log(ctx, auditkit.Event{
    Action: "user.role_changed",
    Actor: auditkit.Actor{
        ID:    userID,
        Email: user.Email,
    },
    Target: auditkit.Target{
        Type: "user",
        ID:   targetUserID,
    },
    Metadata: map[string]any{
        "previous_role": previousRole,
        "new_role":      newRole,
    },
})`,
      },
      {
        step: 4,
        title: 'Add HTTP middleware',
        description: 'Use the middleware for automatic request logging.',
        code: `import "github.com/auditkit/auditkit-go/middleware"

mux := http.NewServeMux()
handler := middleware.AuditLog(client)(mux)
http.ListenAndServe(":8080", handler)`,
      },
    ],
    codeExample: `package main

import (
    "log"
    "net/http"
    "os"

    "github.com/auditkit/auditkit-go"
    "github.com/auditkit/auditkit-go/middleware"
)

func main() {
    client, err := auditkit.New(auditkit.Config{
        APIKey:   os.Getenv("AUDITKIT_API_KEY"),
        TenantID: "org_123",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    mux := http.NewServeMux()

    mux.HandleFunc("POST /api/users/{id}/role", func(w http.ResponseWriter, r *http.Request) {
        userID := r.PathValue("id")
        user := auth.UserFromContext(r.Context())

        previousRole, _ := db.GetUserRole(r.Context(), userID)
        newRole := r.FormValue("role")
        _ = db.UpdateRole(r.Context(), userID, newRole)

        _ = client.Log(r.Context(), auditkit.Event{
            Action: "user.role_changed",
            Actor: auditkit.Actor{
                ID:    user.ID,
                Email: user.Email,
            },
            Target: auditkit.Target{
                Type: "user",
                ID:   userID,
            },
            Metadata: map[string]any{
                "previous_role": previousRole,
                "new_role":      newRole,
                "ip_address":    r.RemoteAddr,
            },
        })

        w.WriteHeader(http.StatusOK)
    })

    // Wrap with audit logging middleware
    handler := middleware.AuditLog(client)(mux)
    log.Fatal(http.ListenAndServe(":8080", handler))
}`,
    commonPatterns: [
      'net/http middleware for automatic request logging',
      'context.Context propagation for tenant and actor resolution',
      'GORM hooks for automatic database change logging',
      'gRPC interceptors for service-to-service audit trails',
      'Buffered async logging for high-throughput systems',
      'Graceful shutdown with pending event flush',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a Go application?',
        answer:
          'Install auditkit-go, create a client with auditkit.New(), and call client.Log() with structured Event objects. Use the middleware package for automatic HTTP request logging with any Go router.',
      },
      {
        question: 'Does the Go SDK support buffered/async logging?',
        answer:
          'Yes. The AuditKit Go SDK supports buffered async logging for high-throughput applications. Events are batched and sent in the background with configurable buffer size and flush intervals. Call client.Close() to flush pending events on shutdown.',
      },
    ],
  },
  {
    slug: 'django',
    name: 'Django',
    language: 'Python',
    description:
      'Add tamper-proof audit trails to your Django application with the AuditKit Python SDK. Middleware, signals, and model mixin support for comprehensive audit logging.',
    overview:
      'Django is the most widely used Python web framework for building database-backed applications. The AuditKit Django integration provides middleware for automatic request logging, model mixins for ORM-level change tracking, and signal handlers for capturing authentication events. It works with Django REST Framework (DRF) out of the box and supports multi-tenant applications using django-tenants or custom tenant isolation.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the SDK',
        description: 'Add the AuditKit Python SDK with Django extras.',
        code: 'pip install auditkit[django]',
      },
      {
        step: 2,
        title: 'Configure in settings.py',
        description: 'Add AuditKit to your Django settings.',
        code: `# settings.py
INSTALLED_APPS = [
    ...
    'auditkit.django',
]

MIDDLEWARE = [
    ...
    'auditkit.django.middleware.AuditKitMiddleware',
]

AUDITKIT = {
    'API_KEY': os.environ['AUDITKIT_API_KEY'],
    'TENANT_RESOLVER': 'myapp.utils.get_tenant_id',
}`,
      },
      {
        step: 3,
        title: 'Add model mixin for change tracking',
        description: 'Use the AuditedModel mixin to automatically log model changes.',
        code: `from auditkit.django.mixins import AuditedModel

class Document(AuditedModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    classification = models.CharField(max_length=50)

    class AuditMeta:
        audit_fields = ['title', 'content', 'classification']
        # Automatically logs create, update, delete with field diffs`,
      },
      {
        step: 4,
        title: 'Log custom events',
        description: 'Use the AuditKit client for explicit event logging.',
        code: `from auditkit.django import get_auditkit

def approve_document(request, doc_id):
    auditkit = get_auditkit()
    document = Document.objects.get(id=doc_id)
    document.status = 'approved'
    document.save()

    auditkit.log(
        action='document.approved',
        actor={'id': str(request.user.id), 'email': request.user.email},
        target={'type': 'document', 'id': str(doc_id)},
        metadata={'title': document.title},
    )`,
      },
    ],
    codeExample: `# settings.py
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework',
    'auditkit.django',
    'myapp',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'auditkit.django.middleware.AuditKitMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]

AUDITKIT = {
    'API_KEY': os.environ['AUDITKIT_API_KEY'],
    'TENANT_RESOLVER': 'myapp.utils.get_tenant_id',
    'AUTO_LOG_AUTH': True,  # Log login/logout/failed attempts
    'AUTO_LOG_ADMIN': True,  # Log Django admin actions
}

# models.py
from auditkit.django.mixins import AuditedModel

class Invoice(AuditedModel):
    number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='draft')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)

    class AuditMeta:
        audit_fields = ['amount', 'status']

# views.py
from auditkit.django import get_auditkit

class InvoiceViewSet(viewsets.ModelViewSet):
    def perform_update(self, serializer):
        instance = serializer.save()
        auditkit = get_auditkit()
        auditkit.log(
            action='invoice.updated',
            actor={'id': str(self.request.user.id)},
            target={'type': 'invoice', 'id': str(instance.id)},
            metadata={
                'invoice_number': instance.number,
                'new_status': instance.status,
            },
        )`,
    commonPatterns: [
      'AuditedModel mixin for automatic ORM change tracking',
      'Middleware for HTTP request/response logging',
      'Django signals for authentication event capture (login, logout, failed login)',
      'Django admin action logging',
      'Django REST Framework integration with ViewSet hooks',
      'Multi-tenant support with django-tenants',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a Django application?',
        answer:
          'Install auditkit[django], add auditkit.django to INSTALLED_APPS, add AuditKitMiddleware to MIDDLEWARE, and configure your API key in AUDITKIT settings. Use the AuditedModel mixin for automatic ORM change tracking or call auditkit.log() for explicit events.',
      },
      {
        question: 'Does AuditKit work with Django REST Framework?',
        answer:
          'Yes. AuditKit integrates with DRF through the standard middleware and provides ViewSet hooks for logging create, update, and delete operations with full request context.',
      },
    ],
  },
  {
    slug: 'rails',
    name: 'Ruby on Rails',
    language: 'Ruby',
    description:
      'Add immutable audit trails to your Ruby on Rails application with the AuditKit Ruby gem. ActiveRecord callbacks, controller concerns, and Sidekiq integration for background logging.',
    overview:
      'Ruby on Rails remains one of the most productive frameworks for building B2B SaaS applications. The AuditKit Ruby gem provides ActiveRecord callbacks for automatic model change tracking, controller concerns for request logging, and Sidekiq integration for non-blocking event delivery. The gem follows Rails conventions with generators, configuration initializers, and concern-based composition.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the gem',
        description: 'Add AuditKit to your Gemfile.',
        code: `# Gemfile
gem 'auditkit'

# Then run:
bundle install
rails generate auditkit:install`,
      },
      {
        step: 2,
        title: 'Configure the initializer',
        description: 'Set up AuditKit in the generated initializer.',
        code: `# config/initializers/auditkit.rb
AuditKit.configure do |config|
  config.api_key = ENV['AUDITKIT_API_KEY']
  config.tenant_resolver = ->(request) { request.env['current_tenant']&.id }
  config.async = true  # Use Sidekiq for background delivery
end`,
      },
      {
        step: 3,
        title: 'Add model tracking',
        description: 'Include the Auditable concern in your models.',
        code: `class Document < ApplicationRecord
  include AuditKit::Auditable

  auditable fields: [:title, :status, :classification],
             on: [:create, :update, :destroy]
end`,
      },
      {
        step: 4,
        title: 'Log custom events',
        description: 'Capture explicit audit events in controllers or services.',
        code: `class DocumentsController < ApplicationController
  def approve
    document = Document.find(params[:id])
    document.update!(status: 'approved')

    AuditKit.log(
      action: 'document.approved',
      actor: { id: current_user.id.to_s, email: current_user.email },
      target: { type: 'document', id: document.id.to_s },
      metadata: { title: document.title }
    )
  end
end`,
      },
    ],
    codeExample: `# config/initializers/auditkit.rb
AuditKit.configure do |config|
  config.api_key = ENV['AUDITKIT_API_KEY']
  config.tenant_resolver = ->(request) { request.env['current_tenant']&.id }
  config.async = true
end

# app/models/invoice.rb
class Invoice < ApplicationRecord
  include AuditKit::Auditable

  belongs_to :customer
  auditable fields: [:amount, :status, :due_date], on: [:create, :update, :destroy]
end

# app/controllers/invoices_controller.rb
class InvoicesController < ApplicationController
  include AuditKit::ControllerConcern

  def create
    @invoice = Invoice.create!(invoice_params)
    head :created
  end

  def refund
    @invoice = Invoice.find(params[:id])
    previous_status = @invoice.status
    @invoice.update!(status: 'refunded')

    AuditKit.log(
      action: 'invoice.refunded',
      actor: { id: current_user.id.to_s, email: current_user.email },
      target: { type: 'invoice', id: @invoice.id.to_s },
      metadata: {
        invoice_number: @invoice.number,
        amount: @invoice.amount.to_s,
        previous_status: previous_status,
      }
    )

    head :ok
  end
end`,
    commonPatterns: [
      'Auditable concern for ActiveRecord model change tracking',
      'ControllerConcern for automatic request logging',
      'Sidekiq integration for non-blocking event delivery',
      'Devise integration for authentication event capture',
      'Pundit/CanCanCan integration for authorization logging',
      'Multi-tenant support with Apartment or acts_as_tenant',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a Rails application?',
        answer:
          'Add the auditkit gem to your Gemfile, run the install generator, and configure your API key. Include AuditKit::Auditable in models for automatic change tracking, or call AuditKit.log() for explicit events.',
      },
      {
        question: 'Does AuditKit support background job delivery in Rails?',
        answer:
          'Yes. The AuditKit gem integrates with Sidekiq for non-blocking event delivery. Set config.async = true in the initializer and events will be queued as Sidekiq jobs.',
      },
    ],
  },
  {
    slug: 'expressjs',
    name: 'Express.js',
    language: 'JavaScript / TypeScript',
    description:
      'Add audit logging to your Express.js application with the AuditKit Node.js SDK. Simple middleware integration for automatic request logging and explicit event capture.',
    overview:
      'Express.js is the most widely used Node.js web framework with over 30 million weekly npm downloads. The AuditKit Node.js SDK provides Express middleware for automatic request logging and a straightforward API for capturing explicit audit events. The middleware captures request details, response status, timing, and user context with zero configuration. Works with Express 4.x and 5.x.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the SDK',
        description: 'Add the AuditKit Node.js SDK.',
        code: 'npm install @auditkit/node',
      },
      {
        step: 2,
        title: 'Add middleware',
        description: 'Register the AuditKit Express middleware.',
        code: `import { AuditKit } from '@auditkit/node';
import { auditMiddleware } from '@auditkit/node/express';

const auditkit = new AuditKit({
  apiKey: process.env.AUDITKIT_API_KEY,
  tenantResolver: (req) => req.user?.organizationId,
});

app.use(auditMiddleware(auditkit));`,
      },
      {
        step: 3,
        title: 'Log explicit events',
        description: 'Capture specific audit events in route handlers.',
        code: `app.post('/api/settings', async (req, res) => {
  const previous = await db.settings.get(req.user.orgId);
  await db.settings.update(req.user.orgId, req.body);

  await auditkit.log({
    action: 'settings.updated',
    actor: { id: req.user.id, email: req.user.email },
    target: { type: 'settings', id: req.user.orgId },
    metadata: {
      changed_fields: Object.keys(req.body),
    },
  });

  res.json({ status: 'updated' });
});`,
      },
    ],
    codeExample: `import express from 'express';
import { AuditKit } from '@auditkit/node';
import { auditMiddleware } from '@auditkit/node/express';

const app = express();
const auditkit = new AuditKit({
  apiKey: process.env.AUDITKIT_API_KEY,
  tenantResolver: (req) => req.user?.organizationId,
});

// Automatic request logging
app.use(auditMiddleware(auditkit));

// Authentication events
app.post('/auth/login', async (req, res) => {
  try {
    const user = await authenticate(req.body.email, req.body.password);

    await auditkit.log({
      action: 'user.login',
      actor: { id: user.id, email: user.email },
      target: { type: 'session', id: user.sessionId },
      context: { ipAddress: req.ip },
    });

    res.json({ token: user.token });
  } catch (err) {
    await auditkit.log({
      action: 'user.login_failed',
      actor: { id: 'unknown', email: req.body.email },
      target: { type: 'session', id: 'none' },
      context: { ipAddress: req.ip, reason: err.message },
    });

    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Data access logging
app.get('/api/customers/:id', async (req, res) => {
  const customer = await db.customers.findById(req.params.id);

  await auditkit.log({
    action: 'customer.viewed',
    actor: { id: req.user.id },
    target: { type: 'customer', id: req.params.id },
  });

  res.json(customer);
});

app.listen(3000);`,
    commonPatterns: [
      'Express middleware for automatic request/response logging',
      'Passport.js integration for authentication event capture',
      'Error handler middleware for failure logging',
      'Router-level middleware for endpoint-specific logging',
      'Mongoose/Sequelize hooks for ORM change tracking',
      'Rate limiting event logging',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to an Express.js app?',
        answer:
          'Install @auditkit/node, create an AuditKit client, and register auditMiddleware() for automatic request logging. Call auditkit.log() in route handlers for explicit event capture. The middleware automatically captures request method, path, status, timing, and user context.',
      },
      {
        question: 'Does the AuditKit Express middleware affect performance?',
        answer:
          'The middleware is designed for minimal overhead. Events are batched and sent asynchronously, so request handling is not blocked. The middleware adds less than 1ms of overhead per request.',
      },
    ],
  },
  {
    slug: 'spring-boot',
    name: 'Spring Boot',
    language: 'Java',
    description:
      'Integrate AuditKit into your Spring Boot application with the official Java SDK. Annotation-driven audit logging, Spring AOP integration, and JPA entity listeners.',
    overview:
      'Spring Boot is the dominant framework for enterprise Java applications. The AuditKit Java SDK provides annotation-driven audit logging through Spring AOP, JPA entity listeners for automatic persistence-layer tracking, and Spring Security integration for authentication event capture. The SDK follows Spring conventions with auto-configuration, conditional beans, and property-based configuration.',
    integrationSteps: [
      {
        step: 1,
        title: 'Add the dependency',
        description: 'Add AuditKit to your Maven or Gradle project.',
        code: `<!-- Maven -->
<dependency>
  <groupId>dev.auditkit</groupId>
  <artifactId>auditkit-spring-boot-starter</artifactId>
  <version>1.0.0</version>
</dependency>

// Gradle
implementation 'dev.auditkit:auditkit-spring-boot-starter:1.0.0'`,
      },
      {
        step: 2,
        title: 'Configure properties',
        description: 'Add AuditKit configuration to application.yml.',
        code: `# application.yml
auditkit:
  api-key: \${AUDITKIT_API_KEY}
  tenant-header: X-Tenant-ID
  auto-log-security: true`,
      },
      {
        step: 3,
        title: 'Use the @AuditLog annotation',
        description: 'Add @AuditLog to controller methods or service methods.',
        code: `@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping("/{id}/role")
    @AuditLog(action = "user.role_changed", targetType = "user")
    public ResponseEntity<User> changeRole(
            @PathVariable String id,
            @RequestBody RoleUpdateRequest request) {
        User user = userService.changeRole(id, request.getRole());
        return ResponseEntity.ok(user);
    }
}`,
      },
      {
        step: 4,
        title: 'Add JPA entity listeners',
        description: 'Annotate JPA entities for automatic change tracking.',
        code: `@Entity
@Audited  // AuditKit JPA annotation
public class Document {
    @Id
    private String id;

    @AuditField  // Track changes to this field
    private String title;

    @AuditField
    private String status;

    private String content;  // Not tracked
}`,
      },
    ],
    codeExample: `// Application configuration (auto-configured by starter)
// application.yml:
// auditkit:
//   api-key: \${AUDITKIT_API_KEY}
//   tenant-header: X-Tenant-ID

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final AuditKitClient auditkit;
    private final InvoiceService invoiceService;

    public InvoiceController(AuditKitClient auditkit, InvoiceService service) {
        this.auditkit = auditkit;
        this.invoiceService = service;
    }

    @PostMapping
    @AuditLog(action = "invoice.created", targetType = "invoice")
    public ResponseEntity<Invoice> create(@RequestBody CreateInvoiceRequest req) {
        return ResponseEntity.ok(invoiceService.create(req));
    }

    @PostMapping("/{id}/refund")
    public ResponseEntity<Invoice> refund(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails user) {

        Invoice invoice = invoiceService.findById(id);
        String previousStatus = invoice.getStatus();
        invoiceService.refund(id);

        auditkit.log(AuditEvent.builder()
            .action("invoice.refunded")
            .actor(Actor.of(user.getUsername(), user.getEmail()))
            .target(Target.of("invoice", id))
            .metadata(Map.of(
                "invoice_number", invoice.getNumber(),
                "amount", invoice.getAmount().toString(),
                "previous_status", previousStatus
            ))
            .build());

        return ResponseEntity.ok(invoice);
    }
}`,
    commonPatterns: [
      '@AuditLog annotation for declarative method-level logging',
      'JPA entity listeners with @Audited and @AuditField annotations',
      'Spring Security event listeners for authentication logging',
      'Spring AOP aspects for cross-cutting audit concerns',
      'WebFilter for automatic HTTP request logging',
      'Reactor/WebFlux support for reactive applications',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a Spring Boot application?',
        answer:
          'Add the auditkit-spring-boot-starter dependency, configure your API key in application.yml, and use the @AuditLog annotation on controller or service methods. For JPA-level tracking, annotate entities with @Audited and mark specific fields with @AuditField.',
      },
      {
        question: 'Does AuditKit work with Spring Security?',
        answer:
          'Yes. The AuditKit Spring Boot starter automatically registers Spring Security event listeners that capture authentication successes, failures, session events, and authorization decisions as audit events.',
      },
    ],
  },
  {
    slug: 'laravel',
    name: 'Laravel',
    language: 'PHP',
    description:
      'Add tamper-proof audit logging to your Laravel application with the AuditKit PHP SDK. Eloquent model observers, middleware, and event system integration.',
    overview:
      'Laravel is the most popular PHP framework for building modern web applications. The AuditKit Laravel package provides Eloquent model observers for automatic change tracking, HTTP middleware for request logging, and integration with Laravel\'s event system. The package follows Laravel conventions with a service provider, publishable configuration, and Artisan commands.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the package',
        description: 'Add AuditKit via Composer.',
        code: `composer require auditkit/laravel
php artisan vendor:publish --provider="AuditKit\\Laravel\\AuditKitServiceProvider"`,
      },
      {
        step: 2,
        title: 'Configure environment',
        description: 'Add your API key to .env.',
        code: `# .env
AUDITKIT_API_KEY=your_api_key_here

# config/auditkit.php is auto-published
# Configure tenant resolution, async mode, etc.`,
      },
      {
        step: 3,
        title: 'Add the Auditable trait to models',
        description: 'Use the trait for automatic Eloquent change tracking.',
        code: `use AuditKit\\Laravel\\Traits\\Auditable;

class Document extends Model
{
    use Auditable;

    protected $auditFields = ['title', 'status', 'classification'];
    protected $auditEvents = ['created', 'updated', 'deleted'];
}`,
      },
      {
        step: 4,
        title: 'Log explicit events',
        description: 'Use the AuditKit facade for custom events.',
        code: `use AuditKit\\Laravel\\Facades\\AuditKit;

class DocumentController extends Controller
{
    public function approve(Document $document)
    {
        $document->update(['status' => 'approved']);

        AuditKit::log([
            'action' => 'document.approved',
            'actor' => ['id' => auth()->id(), 'email' => auth()->user()->email],
            'target' => ['type' => 'document', 'id' => $document->id],
            'metadata' => ['title' => $document->title],
        ]);
    }
}`,
      },
    ],
    codeExample: `// config/auditkit.php
return [
    'api_key' => env('AUDITKIT_API_KEY'),
    'tenant_resolver' => fn ($request) => $request->user()?->organization_id,
    'async' => true,  // Use Laravel queues for delivery
    'queue' => 'audit',
];

// app/Models/Invoice.php
use AuditKit\\Laravel\\Traits\\Auditable;

class Invoice extends Model
{
    use Auditable;

    protected $auditFields = ['amount', 'status', 'due_date'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}

// app/Http/Controllers/InvoiceController.php
use AuditKit\\Laravel\\Facades\\AuditKit;

class InvoiceController extends Controller
{
    public function refund(Invoice $invoice)
    {
        $previousStatus = $invoice->status;
        $invoice->update(['status' => 'refunded']);

        AuditKit::log([
            'action' => 'invoice.refunded',
            'actor' => [
                'id' => (string) auth()->id(),
                'email' => auth()->user()->email,
            ],
            'target' => ['type' => 'invoice', 'id' => (string) $invoice->id],
            'metadata' => [
                'invoice_number' => $invoice->number,
                'amount' => $invoice->amount,
                'previous_status' => $previousStatus,
            ],
        ]);

        return response()->json($invoice);
    }
}`,
    commonPatterns: [
      'Auditable trait for Eloquent model change tracking',
      'HTTP middleware for automatic request logging',
      'Laravel event/listener integration',
      'Queue-based async event delivery',
      'Laravel Sanctum/Passport auth event capture',
      'Nova admin action logging',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to a Laravel application?',
        answer:
          'Install auditkit/laravel via Composer, publish the config, and add your API key. Use the Auditable trait on Eloquent models for automatic change tracking, or use the AuditKit facade for explicit event logging.',
      },
      {
        question: 'Does AuditKit support Laravel queues?',
        answer:
          'Yes. Set async to true in config/auditkit.php and AuditKit will dispatch events to your configured queue. This keeps your request handling fast while ensuring reliable delivery through Laravel\'s queue system.',
      },
    ],
  },
  {
    slug: 'dotnet',
    name: '.NET',
    language: 'C#',
    description:
      'Integrate AuditKit into your .NET application with the official C# SDK. Middleware, Entity Framework Core interceptors, and ASP.NET Core integration.',
    overview:
      'The AuditKit .NET SDK provides first-class integration with ASP.NET Core and Entity Framework Core. Use middleware for automatic request logging, EF Core interceptors for database change tracking, and the fluent API for explicit event capture. The SDK supports dependency injection, IHostedService for background delivery, and configuration through appsettings.json or environment variables.',
    integrationSteps: [
      {
        step: 1,
        title: 'Install the NuGet package',
        description: 'Add AuditKit to your .NET project.',
        code: 'dotnet add package AuditKit.AspNetCore',
      },
      {
        step: 2,
        title: 'Configure services',
        description: 'Register AuditKit in your DI container.',
        code: `// Program.cs
builder.Services.AddAuditKit(options =>
{
    options.ApiKey = builder.Configuration["AuditKit:ApiKey"];
    options.TenantResolver = context =>
        context.User.FindFirst("org_id")?.Value;
});`,
      },
      {
        step: 3,
        title: 'Add middleware',
        description: 'Register the AuditKit middleware in the pipeline.',
        code: `var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.UseAuditKit();  // Add after auth middleware
app.MapControllers();`,
      },
      {
        step: 4,
        title: 'Log events',
        description: 'Inject IAuditKitClient and log events in controllers or services.',
        code: `[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IAuditKitClient _auditkit;

    public UsersController(IAuditKitClient auditkit)
    {
        _auditkit = auditkit;
    }

    [HttpPost("{id}/role")]
    public async Task<IActionResult> ChangeRole(string id, RoleUpdate model)
    {
        var user = await _userService.ChangeRole(id, model.Role);

        await _auditkit.LogAsync(new AuditEvent
        {
            Action = "user.role_changed",
            Actor = new Actor { Id = User.GetUserId(), Email = User.GetEmail() },
            Target = new Target { Type = "user", Id = id },
            Metadata = new { PreviousRole = user.PreviousRole, NewRole = model.Role },
        });

        return Ok(user);
    }
}`,
      },
    ],
    codeExample: `// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuditKit(options =>
{
    options.ApiKey = builder.Configuration["AuditKit:ApiKey"];
    options.TenantResolver = context =>
        context.User.FindFirst("org_id")?.Value;
    options.EnableEfCoreInterceptor = true;
});

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.UseAuditKit();
app.MapControllers();
app.Run();

// Controllers/InvoiceController.cs
[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IAuditKitClient _auditkit;
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IAuditKitClient auditkit, IInvoiceService service)
    {
        _auditkit = auditkit;
        _invoiceService = service;
    }

    [HttpPost("{id}/refund")]
    public async Task<IActionResult> Refund(string id)
    {
        var invoice = await _invoiceService.GetByIdAsync(id);
        var previousStatus = invoice.Status;
        await _invoiceService.RefundAsync(id);

        await _auditkit.LogAsync(new AuditEvent
        {
            Action = "invoice.refunded",
            Actor = new Actor
            {
                Id = User.GetUserId(),
                Email = User.GetEmail(),
            },
            Target = new Target { Type = "invoice", Id = id },
            Metadata = new
            {
                InvoiceNumber = invoice.Number,
                Amount = invoice.Amount,
                PreviousStatus = previousStatus,
            },
        });

        return Ok(invoice);
    }
}`,
    commonPatterns: [
      'ASP.NET Core middleware for automatic request logging',
      'EF Core interceptors for database change tracking',
      'ASP.NET Core Identity event handlers for auth logging',
      'IHostedService for reliable background delivery',
      'Minimal API integration with endpoint filters',
      'MediatR pipeline behavior for CQRS command logging',
    ],
    faqs: [
      {
        question: 'How do I add audit logging to an ASP.NET Core application?',
        answer:
          'Install AuditKit.AspNetCore from NuGet, call AddAuditKit() in your service configuration, and add UseAuditKit() to your middleware pipeline. Inject IAuditKitClient into controllers or services for explicit event logging.',
      },
      {
        question: 'Does AuditKit support Entity Framework Core?',
        answer:
          'Yes. The AuditKit .NET SDK includes an EF Core interceptor that automatically captures database mutations (insert, update, delete) as audit events with before/after state tracking. Enable it with EnableEfCoreInterceptor = true in your configuration.',
      },
    ],
  },
];

export function getDevFramework(slug: string): DevFramework | undefined {
  return devFrameworks.find((f) => f.slug === slug);
}

export function getAllDevFrameworkSlugs(): string[] {
  return devFrameworks.map((f) => f.slug);
}
