"""AuditKit Python SDK — Drop-in audit logs for B2B SaaS."""

__version__ = "0.1.0"

from auditkit.client import AuditKit, AuditKitError, TenantClient
from auditkit.types import (
    AuditActor,
    AuditContext,
    AuditEvent,
    AuditEventInput,
    AuditSearchQuery,
    AuditSearchResponse,
    AuditSeverity,
    AuditTarget,
    BulkIngestResponse,
    ChainVerificationResult,
    IngestResponse,
    Pagination,
    ViewerTokenRequest,
    ViewerTokenResponse,
)

__all__ = [
    "AuditKit",
    "AuditKitError",
    "AuditActor",
    "AuditContext",
    "AuditEvent",
    "AuditEventInput",
    "AuditSearchQuery",
    "AuditSearchResponse",
    "AuditSeverity",
    "AuditTarget",
    "BulkIngestResponse",
    "ChainVerificationResult",
    "IngestResponse",
    "Pagination",
    "TenantClient",
    "ViewerTokenRequest",
    "ViewerTokenResponse",
]
