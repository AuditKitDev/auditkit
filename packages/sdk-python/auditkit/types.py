"""AuditKit type definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional, Sequence, Union


# --- Severity ---

class AuditSeverity(str, Enum):
    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    CRITICAL = "critical"


# --- Actor ---

@dataclass(frozen=True)
class AuditActor:
    id: str
    type: Literal["user", "api_key", "system", "service"] = "user"
    name: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"id": self.id, "type": self.type}
        if self.name is not None:
            d["name"] = self.name
        if self.email is not None:
            d["email"] = self.email
        if self.metadata is not None:
            d["metadata"] = self.metadata
        return d


# --- Target ---

@dataclass(frozen=True)
class AuditTarget:
    type: str
    id: str
    name: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"type": self.type, "id": self.id}
        if self.name is not None:
            d["name"] = self.name
        if self.metadata is not None:
            d["metadata"] = self.metadata
        return d


# --- Context ---

@dataclass(frozen=True)
class AuditContext:
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        if self.ip is not None:
            d["ip"] = self.ip
        if self.user_agent is not None:
            d["user_agent"] = self.user_agent
        if self.request_id is not None:
            d["request_id"] = self.request_id
        if self.session_id is not None:
            d["session_id"] = self.session_id
        return d


# --- Event Input (what the SDK sends) ---

@dataclass
class AuditEventInput:
    action: str
    actor: AuditActor
    tenant_id: Optional[str] = None
    target: Optional[AuditTarget] = None
    context: Optional[AuditContext] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: AuditSeverity = AuditSeverity.INFO
    metadata: Optional[dict[str, Any]] = None
    tags: Optional[list[str]] = None
    is_failure: bool = False
    is_anonymous: bool = False
    error_message: Optional[str] = None
    occurred_at: Optional[Union[datetime, str]] = None
    idempotency_key: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "action": self.action,
            "actor": self.actor.to_dict(),
            "severity": self.severity.value,
        }
        if self.tenant_id is not None:
            d["tenant_id"] = self.tenant_id
        if self.target is not None:
            d["target"] = self.target.to_dict()
        if self.context is not None:
            d["context"] = self.context.to_dict()
        if self.description is not None:
            d["description"] = self.description
        if self.category is not None:
            d["category"] = self.category
        if self.metadata is not None:
            d["metadata"] = self.metadata
        if self.tags is not None:
            d["tags"] = self.tags
        if self.is_failure:
            d["is_failure"] = True
        if self.is_anonymous:
            d["is_anonymous"] = True
        if self.error_message is not None:
            d["error_message"] = self.error_message
        if self.occurred_at is not None:
            if isinstance(self.occurred_at, datetime):
                d["occurred_at"] = self.occurred_at.isoformat()
            else:
                d["occurred_at"] = self.occurred_at
        if self.idempotency_key is not None:
            d["idempotency_key"] = self.idempotency_key
        return d


# --- Event (what the API returns) ---

@dataclass(frozen=True)
class AuditEvent:
    id: str
    event_id: str
    project_id: str
    tenant_id: str
    environment: str
    action: str
    severity: AuditSeverity
    actor_id: str
    actor_type: str
    actor_metadata: dict[str, Any]
    target_metadata: dict[str, Any]
    metadata: dict[str, Any]
    tags: list[str]
    is_failure: bool
    is_anonymous: bool
    occurred_at: str
    ingested_at: str
    row_hash: str
    is_anomalous: bool
    anomaly_reasons: list[str]
    category: Optional[str] = None
    description: Optional[str] = None
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    source_ip: Optional[str] = None
    ip_country: Optional[str] = None
    ip_city: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    error_message: Optional[str] = None
    prev_hash: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AuditEvent":
        return cls(
            id=data["id"],
            event_id=data["eventId"],
            project_id=data["projectId"],
            tenant_id=data["tenantId"],
            environment=data["environment"],
            action=data["action"],
            category=data.get("category"),
            description=data.get("description"),
            severity=AuditSeverity(data.get("severity", "info")),
            actor_id=data["actorId"],
            actor_type=data.get("actorType", "user"),
            actor_name=data.get("actorName"),
            actor_email=data.get("actorEmail"),
            actor_metadata=data.get("actorMetadata", {}),
            target_type=data.get("targetType"),
            target_id=data.get("targetId"),
            target_name=data.get("targetName"),
            target_metadata=data.get("targetMetadata", {}),
            source_ip=data.get("sourceIp"),
            ip_country=data.get("ipCountry"),
            ip_city=data.get("ipCity"),
            user_agent=data.get("userAgent"),
            request_id=data.get("requestId"),
            session_id=data.get("sessionId"),
            is_failure=data.get("isFailure", False),
            is_anonymous=data.get("isAnonymous", False),
            error_message=data.get("errorMessage"),
            metadata=data.get("metadata", {}),
            tags=data.get("tags", []),
            occurred_at=data["occurredAt"],
            ingested_at=data["ingestedAt"],
            prev_hash=data.get("prevHash"),
            row_hash=data["rowHash"],
            is_anomalous=data.get("isAnomalous", False),
            anomaly_reasons=data.get("anomalyReasons", []),
        )


# --- Search ---

@dataclass
class AuditSearchQuery:
    tenant_id: Optional[str] = None
    action: Optional[str] = None
    actor_id: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    severity: Optional[Union[AuditSeverity, Sequence[AuditSeverity]]] = None
    is_anomalous: Optional[bool] = None
    tags: Optional[list[str]] = None
    from_date: Optional[Union[datetime, str]] = None
    to_date: Optional[Union[datetime, str]] = None
    query: Optional[str] = None
    limit: Optional[int] = None
    cursor: Optional[str] = None

    def to_params(self) -> dict[str, str]:
        params: dict[str, str] = {}
        if self.tenant_id:
            params["tenant_id"] = self.tenant_id
        if self.action:
            params["action"] = self.action
        if self.actor_id:
            params["actor_id"] = self.actor_id
        if self.target_type:
            params["target_type"] = self.target_type
        if self.target_id:
            params["target_id"] = self.target_id
        if self.severity is not None:
            if isinstance(self.severity, (list, tuple)):
                params["severity"] = ",".join(s.value for s in self.severity)
            else:
                params["severity"] = self.severity.value
        if self.is_anomalous is not None:
            params["is_anomalous"] = str(self.is_anomalous).lower()
        if self.tags:
            params["tags"] = ",".join(self.tags)
        if self.from_date:
            if isinstance(self.from_date, datetime):
                params["from"] = self.from_date.isoformat()
            else:
                params["from"] = self.from_date
        if self.to_date:
            if isinstance(self.to_date, datetime):
                params["to"] = self.to_date.isoformat()
            else:
                params["to"] = self.to_date
        if self.query:
            params["query"] = self.query
        if self.limit is not None:
            params["limit"] = str(self.limit)
        if self.cursor:
            params["cursor"] = self.cursor
        return params


@dataclass(frozen=True)
class Pagination:
    has_more: bool
    cursor: Optional[str]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Pagination":
        return cls(has_more=data["hasMore"], cursor=data.get("cursor"))


@dataclass(frozen=True)
class AuditSearchResponse:
    data: list[AuditEvent]
    pagination: Pagination

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AuditSearchResponse":
        return cls(
            data=[AuditEvent.from_dict(e) for e in data["data"]],
            pagination=Pagination.from_dict(data["pagination"]),
        )


# --- Ingest Responses ---

@dataclass(frozen=True)
class IngestResponse:
    id: str
    event_id: str
    action: str
    row_hash: str
    ingested_at: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "IngestResponse":
        return cls(
            id=data["id"],
            event_id=data["eventId"],
            action=data["action"],
            row_hash=data["rowHash"],
            ingested_at=data["ingestedAt"],
        )


@dataclass(frozen=True)
class BulkIngestResponse:
    events: list[IngestResponse]
    count: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "BulkIngestResponse":
        return cls(
            events=[IngestResponse.from_dict(e) for e in data["events"]],
            count=data["count"],
        )


# --- Verification ---

@dataclass(frozen=True)
class ChainVerificationResult:
    valid: bool
    events_checked: int
    verified_at: str
    first_event: Optional[str] = None
    last_event: Optional[str] = None
    chain_root_hash: Optional[str] = None
    broken_links: Optional[list[dict[str, str]]] = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ChainVerificationResult":
        return cls(
            valid=data["valid"],
            events_checked=data["eventsChecked"],
            first_event=data.get("firstEvent"),
            last_event=data.get("lastEvent"),
            chain_root_hash=data.get("chainRootHash"),
            verified_at=data["verifiedAt"],
            broken_links=data.get("brokenLinks"),
        )


# --- Viewer Tokens ---

@dataclass
class ViewerTokenRequest:
    """Request to create a viewer token."""
    tenant_id: str
    scopes: Optional[list[str]] = None
    expires_in: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"tenant_id": self.tenant_id}
        if self.scopes:
            d["scopes"] = self.scopes
        if self.expires_in:
            d["expires_in"] = self.expires_in
        return d


@dataclass
class ViewerTokenResponse:
    """Response from creating a viewer token."""
    token: str
    expires_at: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ViewerTokenResponse":
        return cls(
            token=data["token"],
            expires_at=data.get("expires_at", ""),
        )
