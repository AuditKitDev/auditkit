"""AuditKit client implementation with async support and retry logic."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime
from typing import Any, Optional, Sequence, Union

import httpx

from auditkit import __version__
from auditkit.types import (
    AuditActor,
    AuditContext,
    AuditEventInput,
    AuditSearchQuery,
    AuditSearchResponse,
    AuditSeverity,
    AuditTarget,
    BulkIngestResponse,
    ChainVerificationResult,
    IngestResponse,
)

logger = logging.getLogger("auditkit")

_DEFAULT_BASE_URL = "https://api.auditkit.dev"
_DEFAULT_MAX_RETRIES = 3
_DEFAULT_TIMEOUT = 30.0
_MAX_BACKOFF = 30.0


class AuditKitError(Exception):
    """Error raised by the AuditKit client."""

    def __init__(
        self,
        message: str,
        code: str = "UNKNOWN",
        status: int = 0,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status = status
        self.details = details or {}

    def __repr__(self) -> str:
        return f"AuditKitError(code={self.code!r}, status={self.status}, message={str(self)!r})"


class AuditKit:
    """AuditKit client for logging and querying audit events.

    Supports both synchronous and asynchronous usage. For async, use the
    ``async_*`` methods or the async context manager.

    Example::

        client = AuditKit(api_key="ak_live_...")

        # Synchronous
        client.log(
            action="document.updated",
            actor=AuditActor(id="user_123", name="Jane"),
            target=AuditTarget(type="document", id="doc_456"),
            tenant_id="org_acme",
        )

        # Async
        async with client:
            await client.async_log(
                action="document.updated",
                actor=AuditActor(id="user_123"),
            )
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = _DEFAULT_BASE_URL,
        default_tenant_id: Optional[str] = None,
        environment: str = "production",
        max_retries: int = _DEFAULT_MAX_RETRIES,
        timeout: float = _DEFAULT_TIMEOUT,
        debug: bool = False,
    ) -> None:
        if not api_key:
            raise ValueError("AuditKit: api_key is required")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._default_tenant_id = default_tenant_id
        self._environment = environment
        self._max_retries = max_retries
        self._timeout = timeout
        self._debug = debug

        self._headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": f"auditkit-python/{__version__}",
            "X-AuditKit-Environment": environment,
        }

        self._sync_client: Optional[httpx.Client] = None
        self._async_client: Optional[httpx.AsyncClient] = None

    # --- Context managers ---

    def __enter__(self) -> "AuditKit":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    async def __aenter__(self) -> "AuditKit":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()

    def close(self) -> None:
        """Close synchronous HTTP client."""
        if self._sync_client is not None:
            self._sync_client.close()
            self._sync_client = None

    async def aclose(self) -> None:
        """Close asynchronous HTTP client."""
        if self._async_client is not None:
            await self._async_client.aclose()
            self._async_client = None

    # --- Lazy client creation ---

    def _get_sync_client(self) -> httpx.Client:
        if self._sync_client is None:
            self._sync_client = httpx.Client(
                base_url=self._base_url,
                headers=self._headers,
                timeout=self._timeout,
            )
        return self._sync_client

    def _get_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self._base_url,
                headers=self._headers,
                timeout=self._timeout,
            )
        return self._async_client

    # --- Synchronous API ---

    def log(
        self,
        action: str,
        actor: AuditActor,
        *,
        target: Optional[AuditTarget] = None,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        description: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[list[str]] = None,
        context: Optional[AuditContext] = None,
        is_failure: bool = False,
        error_message: Optional[str] = None,
        occurred_at: Optional[Union[datetime, str]] = None,
        idempotency_key: Optional[str] = None,
    ) -> IngestResponse:
        """Log a single audit event (synchronous)."""
        event = self._build_event(
            action=action, actor=actor, target=target, tenant_id=tenant_id,
            metadata=metadata, severity=severity, description=description,
            category=category, tags=tags, context=context,
            is_failure=is_failure, error_message=error_message,
            occurred_at=occurred_at, idempotency_key=idempotency_key,
        )
        headers = self._idempotency_headers(idempotency_key)
        data = self._request_sync("POST", "/v1/events", json=event.to_dict(), extra_headers=headers)
        return IngestResponse.from_dict(data)

    def bulk_log(self, events: Sequence[AuditEventInput]) -> BulkIngestResponse:
        """Log multiple audit events at once (synchronous)."""
        payload = {"events": [e.to_dict() for e in events]}
        data = self._request_sync("POST", "/v1/events/bulk", json=payload)
        return BulkIngestResponse.from_dict(data)

    def search(
        self,
        query: Optional[str] = None,
        *,
        tenant_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[str] = None,
        **kwargs: Any,
    ) -> AuditSearchResponse:
        """Search audit events (synchronous)."""
        search_query = AuditSearchQuery(
            query=query,
            tenant_id=tenant_id or self._default_tenant_id,
            limit=limit,
            cursor=offset,
            **kwargs,
        )
        data = self._request_sync("GET", "/v1/events", params=search_query.to_params())
        return AuditSearchResponse.from_dict(data)

    def verify(self, event_id: str) -> ChainVerificationResult:
        """Verify hash chain integrity for a specific event (synchronous)."""
        data = self._request_sync("GET", f"/v1/verify/{event_id}")
        return ChainVerificationResult.from_dict(data)

    def create_viewer_token(
        self,
        tenant_id: str,
        *,
        scopes: Optional[list[str]] = None,
        expires_in: Optional[str] = None,
    ) -> "ViewerTokenResponse":
        """Create a short-lived viewer token for the embedded React viewer (synchronous)."""
        from auditkit.types import ViewerTokenRequest, ViewerTokenResponse
        req = ViewerTokenRequest(tenant_id=tenant_id, scopes=scopes, expires_in=expires_in)
        data = self._request_sync("POST", "/v1/viewer-tokens", json=req.to_dict())
        return ViewerTokenResponse.from_dict(data)

    def for_tenant(self, tenant_id: str) -> "TenantClient":
        """Create a tenant-scoped client. All calls auto-set tenant_id."""
        return TenantClient(self, tenant_id)

    # --- Asynchronous API ---

    async def async_log(
        self,
        action: str,
        actor: AuditActor,
        *,
        target: Optional[AuditTarget] = None,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        description: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[list[str]] = None,
        context: Optional[AuditContext] = None,
        is_failure: bool = False,
        error_message: Optional[str] = None,
        occurred_at: Optional[Union[datetime, str]] = None,
        idempotency_key: Optional[str] = None,
    ) -> IngestResponse:
        """Log a single audit event (asynchronous)."""
        event = self._build_event(
            action=action, actor=actor, target=target, tenant_id=tenant_id,
            metadata=metadata, severity=severity, description=description,
            category=category, tags=tags, context=context,
            is_failure=is_failure, error_message=error_message,
            occurred_at=occurred_at, idempotency_key=idempotency_key,
        )
        headers = self._idempotency_headers(idempotency_key)
        data = await self._request_async("POST", "/v1/events", json=event.to_dict(), extra_headers=headers)
        return IngestResponse.from_dict(data)

    async def async_bulk_log(self, events: Sequence[AuditEventInput]) -> BulkIngestResponse:
        """Log multiple audit events at once (asynchronous)."""
        payload = {"events": [e.to_dict() for e in events]}
        data = await self._request_async("POST", "/v1/events/bulk", json=payload)
        return BulkIngestResponse.from_dict(data)

    async def async_search(
        self,
        query: Optional[str] = None,
        *,
        tenant_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[str] = None,
        **kwargs: Any,
    ) -> AuditSearchResponse:
        """Search audit events (asynchronous)."""
        search_query = AuditSearchQuery(
            query=query,
            tenant_id=tenant_id or self._default_tenant_id,
            limit=limit,
            cursor=offset,
            **kwargs,
        )
        data = await self._request_async("GET", "/v1/events", params=search_query.to_params())
        return AuditSearchResponse.from_dict(data)

    async def async_verify(self, event_id: str) -> ChainVerificationResult:
        """Verify hash chain integrity for a specific event (asynchronous)."""
        data = await self._request_async("GET", f"/v1/verify/{event_id}")
        return ChainVerificationResult.from_dict(data)

    async def async_create_viewer_token(
        self,
        tenant_id: str,
        *,
        scopes: Optional[list[str]] = None,
        expires_in: Optional[str] = None,
    ) -> "ViewerTokenResponse":
        """Create a short-lived viewer token (asynchronous)."""
        from auditkit.types import ViewerTokenRequest, ViewerTokenResponse
        req = ViewerTokenRequest(tenant_id=tenant_id, scopes=scopes, expires_in=expires_in)
        data = await self._request_async("POST", "/v1/viewer-tokens", json=req.to_dict())
        return ViewerTokenResponse.from_dict(data)

    # --- Internal helpers ---

    def _build_event(
        self,
        action: str,
        actor: AuditActor,
        *,
        target: Optional[AuditTarget] = None,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        description: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[list[str]] = None,
        context: Optional[AuditContext] = None,
        is_failure: bool = False,
        error_message: Optional[str] = None,
        occurred_at: Optional[Union[datetime, str]] = None,
        idempotency_key: Optional[str] = None,
    ) -> AuditEventInput:
        return AuditEventInput(
            action=action,
            actor=actor,
            tenant_id=tenant_id or self._default_tenant_id,
            target=target,
            context=context,
            description=description,
            category=category,
            severity=severity,
            metadata=metadata,
            tags=tags,
            is_failure=is_failure,
            error_message=error_message,
            occurred_at=occurred_at,
            idempotency_key=idempotency_key,
        )

    @staticmethod
    def _idempotency_headers(key: Optional[str]) -> dict[str, str]:
        if key:
            return {"Idempotency-Key": key}
        return {}

    def _request_sync(
        self,
        method: str,
        path: str,
        *,
        json: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, str]] = None,
        extra_headers: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        client = self._get_sync_client()
        last_error: Optional[Exception] = None

        for attempt in range(self._max_retries + 1):
            if self._debug:
                logger.debug("%s %s (attempt %d)", method, path, attempt + 1)

            try:
                response = client.request(
                    method,
                    path,
                    json=json,
                    params=params,
                    headers=extra_headers,
                )

                if response.is_success:
                    return response.json()

                body = self._safe_json(response)
                error = AuditKitError(
                    message=body.get("message", f"HTTP {response.status_code}"),
                    code=body.get("code", "HTTP_ERROR"),
                    status=response.status_code,
                    details=body,
                )

                # Don't retry client errors except 429
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    raise error

                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = response.headers.get("retry-after")
                    if retry_after and attempt < self._max_retries:
                        time.sleep(float(retry_after))
                        continue

                last_error = error

            except AuditKitError:
                raise
            except Exception as exc:
                last_error = exc

            if attempt < self._max_retries:
                delay = min(2 ** attempt, _MAX_BACKOFF)
                time.sleep(delay)

        raise last_error or AuditKitError("Unknown error")

    async def _request_async(
        self,
        method: str,
        path: str,
        *,
        json: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, str]] = None,
        extra_headers: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        client = self._get_async_client()
        last_error: Optional[Exception] = None

        for attempt in range(self._max_retries + 1):
            if self._debug:
                logger.debug("%s %s (attempt %d)", method, path, attempt + 1)

            try:
                response = await client.request(
                    method,
                    path,
                    json=json,
                    params=params,
                    headers=extra_headers,
                )

                if response.is_success:
                    return response.json()

                body = self._safe_json(response)
                error = AuditKitError(
                    message=body.get("message", f"HTTP {response.status_code}"),
                    code=body.get("code", "HTTP_ERROR"),
                    status=response.status_code,
                    details=body,
                )

                if 400 <= response.status_code < 500 and response.status_code != 429:
                    raise error

                if response.status_code == 429:
                    retry_after = response.headers.get("retry-after")
                    if retry_after and attempt < self._max_retries:
                        await asyncio.sleep(float(retry_after))
                        continue

                last_error = error

            except AuditKitError:
                raise
            except Exception as exc:
                last_error = exc

            if attempt < self._max_retries:
                delay = min(2 ** attempt, _MAX_BACKOFF)
                await asyncio.sleep(delay)

        raise last_error or AuditKitError("Unknown error")

    @staticmethod
    def _safe_json(response: httpx.Response) -> dict[str, Any]:
        try:
            return response.json()
        except Exception:
            return {}


class TenantClient:
    """Tenant-scoped client that automatically sets tenant_id on all operations."""

    def __init__(self, client: AuditKit, tenant_id: str) -> None:
        self._client = client
        self._tenant_id = tenant_id

    def log(self, action: str, actor: AuditActor, **kwargs: Any) -> IngestResponse:
        return self._client.log(action, actor, tenant_id=self._tenant_id, **kwargs)

    async def async_log(self, action: str, actor: AuditActor, **kwargs: Any) -> IngestResponse:
        return await self._client.async_log(action, actor, tenant_id=self._tenant_id, **kwargs)

    def search(self, query: Optional[str] = None, **kwargs: Any) -> AuditSearchResponse:
        return self._client.search(query, tenant_id=self._tenant_id, **kwargs)

    async def async_search(self, query: Optional[str] = None, **kwargs: Any) -> AuditSearchResponse:
        return await self._client.async_search(query, tenant_id=self._tenant_id, **kwargs)

    def create_viewer_token(self, *, scopes: Optional[list[str]] = None, expires_in: Optional[str] = None) -> "ViewerTokenResponse":
        from auditkit.types import ViewerTokenResponse
        return self._client.create_viewer_token(self._tenant_id, scopes=scopes, expires_in=expires_in)

    async def async_create_viewer_token(self, *, scopes: Optional[list[str]] = None, expires_in: Optional[str] = None) -> "ViewerTokenResponse":
        from auditkit.types import ViewerTokenResponse
        return await self._client.async_create_viewer_token(self._tenant_id, scopes=scopes, expires_in=expires_in)
