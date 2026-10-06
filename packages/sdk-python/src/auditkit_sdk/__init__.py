"""AuditKit Python SDK."""
from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from base64 import b64decode, b64encode
from typing import Any, Callable, Iterator, Optional, Union

from .jcs import canonicalize

__all__ = ["AuditKit", "AuditKitError", "client_signable", "canonicalize", "verify_receipt", "verify_client_sig"]

Receipt = dict[str, Any]
_UNSET: Any = object()


class AuditKitError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def client_signable(tenant: str, actor: str, action: str, target: Optional[str], occurred_at: str) -> str:
    """Hex sha256 of JCS({tenant, actor, action, target|null, occurred_at}). Sign the raw 32 bytes.

    Raises ValueError if any field contains a lone UTF-16 surrogate.
    """
    for k, v in (("tenant", tenant), ("actor", actor), ("action", action), ("target", target), ("occurred_at", occurred_at)):
        if isinstance(v, str):
            try:
                v.encode("utf-8")
            except UnicodeEncodeError:
                raise ValueError(f"client_signable: {k} contains a lone UTF-16 surrogate (not valid Unicode text)") from None
    doc = {"tenant": tenant, "actor": actor, "action": action, "target": target, "occurred_at": occurred_at}
    return hashlib.sha256(canonicalize(doc).encode("utf-8")).hexdigest()


def _load_public_key(key: Any) -> Any:
    from cryptography.hazmat.primitives.serialization import load_der_public_key

    if isinstance(key, str):
        key = b64decode(key)
    if isinstance(key, (bytes, bytearray)):
        return load_der_public_key(bytes(key))
    return key


def _ed25519_ok(public_key: Any, sig_b64: str, message: bytes) -> bool:
    from cryptography.exceptions import InvalidSignature

    try:
        _load_public_key(public_key).verify(b64decode(sig_b64), message)
        return True
    except (InvalidSignature, ValueError):
        return False


def verify_receipt(receipt: Receipt, server_public_key: Union[str, bytes, Any], actor: str, action: str, target: Optional[str] = None, payload: Any = _UNSET) -> bool:
    """Offline receipt check (needs `cryptography`). Recomputes event_hash from the receipt plus the actor/action/target
    you logged, then checks server_sig. When `payload` is given (even None), also recomputes
    payload_commit = sha256(salt + JCS(payload)). server_public_key: base64 SPKI str, DER bytes or an Ed25519PublicKey."""
    r = receipt
    if payload is not _UNSET:
        if hashlib.sha256((r["salt"] + canonicalize(payload)).encode("utf-8")).hexdigest() != r["payload_commit"]:
            return False
    header = {"id": r["id"], "project_id": r["project_id"], "tenant_id": r["tenant_id"], "position": r["position"], "occurred_at": r["occurred_at"],
              "actor": actor, "action": action, "target": target, "payload_commit": r["payload_commit"], "prev_hash": r["prev_hash"]}
    h = hashlib.sha256(canonicalize(header).encode("utf-8")).hexdigest()
    return h == r["event_hash"] and _ed25519_ok(server_public_key, r["server_sig"], bytes.fromhex(h))


def verify_client_sig(public_key: Union[str, bytes, Any], sig_b64: str, tenant: str, actor: str, action: str, target: Optional[str], occurred_at: str) -> bool:
    """Check a client_sig (base64) against an Ed25519 public key (needs `cryptography`)."""
    return _ed25519_ok(public_key, sig_b64, bytes.fromhex(client_signable(tenant, actor, action, target, occurred_at)))


def _qs(**q: Any) -> str:
    s = urllib.parse.urlencode({k: v for k, v in q.items() if v is not None})
    return "?" + s if s else ""


def _now() -> str:
    t = time.time()
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(t)) + f".{int(t * 1000) % 1000:03d}Z"


class AuditKit:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.auditkit.dev",
        client_key: Any = None,
        keep_receipts: Optional[Callable[[Receipt], None]] = None,
        timeout: float = 10,
        max_attempts: int = 3,
        retry_delay: float = 0.2,
    ) -> None:
        self._key = api_key
        self._base = base_url.rstrip("/")
        self._client_key = client_key
        self._keep = keep_receipts
        self._timeout = timeout
        self._max = max_attempts
        self._delay = retry_delay

    def _send(self, path: str, method: str = "GET", body: Any = None, headers: Optional[dict[str, str]] = None, retry: bool = True) -> Any:
        h = {"authorization": f"Bearer {self._key}"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            h["content-type"] = "application/json"
        h.update(headers or {})
        mx = self._max if retry else 1
        for attempt in range(1, mx + 1):
            req = urllib.request.Request(self._base + path, data=data, headers=h, method=method)
            try:
                return urllib.request.urlopen(req, timeout=self._timeout)
            except urllib.error.HTTPError as e:
                if (e.code == 429 or e.code >= 500) and attempt < mx:
                    e.close()
                else:
                    try:
                        j = json.loads(e.read() or b"null")
                    except ValueError:
                        j = None
                    err = (j or {}).get("error") or {} if isinstance(j, dict) else {}
                    raise AuditKitError(e.code, err.get("code") or f"http_{e.code}", err.get("message") or str(e.reason)) from None
            except (urllib.error.URLError, OSError) as e:
                if attempt >= mx:
                    raise AuditKitError(0, "network", f"network error: {e}") from e
            time.sleep(self._delay * 2 ** (attempt - 1))
        raise AssertionError("unreachable")

    def _json(self, path: str, **kw: Any) -> Any:
        with self._send(path, **kw) as r:
            return json.loads(r.read())

    def _wire(self, tenant: str, actor: str, action: str, target: Optional[str] = None, occurred_at: Optional[str] = None, payload: Any = None, idempotency_key: Optional[str] = None) -> dict[str, Any]:
        if occurred_at is None and self._client_key is not None:
            occurred_at = _now()
        w: dict[str, Any] = {"tenant": tenant, "actor": actor, "action": action, "idempotency_key": idempotency_key or str(uuid.uuid4())}
        if target is not None:
            w["target"] = target
        if occurred_at is not None:
            w["occurred_at"] = occurred_at
        if payload is not None:
            w["payload"] = payload
        if self._client_key is not None:
            digest = bytes.fromhex(client_signable(tenant, actor, action, target, occurred_at))
            w["client_sig"] = b64encode(self._client_key.sign(digest)).decode()
        return w

    def _kept(self, r: Receipt) -> Receipt:
        if self._keep:
            self._keep(r)
        return r

    def log(self, tenant: str, actor: str, action: str, target: Optional[str] = None, occurred_at: Optional[str] = None, payload: Any = None, idempotency_key: Optional[str] = None) -> Receipt:
        w = self._wire(tenant, actor, action, target, occurred_at, payload, idempotency_key)
        return self._kept(self._json("/v1/events", method="POST", body=w, headers={"idempotency-key": w["idempotency_key"]}))

    def log_bulk(self, events: list[dict[str, Any]]) -> list[Receipt]:
        """events: dicts with the same keys as log()'s arguments."""
        ws = [self._wire(**e) for e in events]
        return [self._kept(r) for r in self._json("/v1/events/bulk", method="POST", body={"events": ws})["receipts"]]

    def search(self, tenant: Optional[str] = None, actor: Optional[str] = None, action: Optional[str] = None, from_: Optional[str] = None, to: Optional[str] = None, limit: Optional[int] = None, cursor: Optional[str] = None) -> dict[str, Any]:
        return self._json("/v1/events" + _qs(tenant=tenant, actor=actor, action=action, **{"from": from_}, to=to, limit=limit, cursor=cursor))

    def get(self, id: str) -> dict[str, Any]:
        return self._json(f"/v1/events/{urllib.parse.quote(id, safe='')}")

    def proof(self, id: str) -> dict[str, Any]:
        return self._json(f"/v1/events/{urllib.parse.quote(id, safe='')}/proof")

    def verify(self, tenant: str, from_: Optional[int] = None, to: Optional[int] = None) -> dict[str, Any]:
        return self._json("/v1/verify" + _qs(tenant=tenant, **{"from": from_}, to=to))

    def export(self, tenant: str, from_: Optional[int] = None, to: Optional[int] = None) -> Iterator[dict[str, Any]]:
        with self._send("/v1/export" + _qs(tenant=tenant, **{"from": from_}, to=to)) as r:
            for line in r:
                line = line.strip()
                if line:
                    yield json.loads(line)

    def tenants(self) -> list[dict[str, Any]]:
        return self._json("/v1/tenants")["tenants"]

    def register_tenant_key(self, tenant: str, public_key: Union[str, bytes, bytearray]) -> dict[str, Any]:
        """public_key: DER SPKI bytes, or a base64 str of them. Needed before sending client_sig."""
        pk = b64encode(public_key).decode() if isinstance(public_key, (bytes, bytearray)) else public_key
        return self._json(f"/v1/tenants/{urllib.parse.quote(tenant, safe='')}/keys", method="POST", body={"public_key": pk}, retry=False)

    def list_tenant_keys(self, tenant: str) -> list[dict[str, Any]]:
        return self._json(f"/v1/tenants/{urllib.parse.quote(tenant, safe='')}/keys")["keys"]

    def revoke_tenant_key(self, tenant: str, key_id: str) -> dict[str, Any]:
        return self._json(f"/v1/tenants/{urllib.parse.quote(tenant, safe='')}/keys/{urllib.parse.quote(key_id, safe='')}", method="DELETE", retry=False)

    def set_tenant_policy(self, tenant: str, require_client_sig: bool) -> dict[str, Any]:
        """Admin scope. When true, unsigned events for the tenant are refused."""
        return self._json(f"/v1/tenants/{urllib.parse.quote(tenant, safe='')}/policy", method="POST", body={"require_client_sig": require_client_sig}, retry=False)

    def erase(self, id: str) -> dict[str, Any]:
        """Returns {"erased": True, "audit": receipt}. Not retried."""
        return self._json(f"/v1/erase/{urllib.parse.quote(id, safe='')}", method="POST", retry=False)
