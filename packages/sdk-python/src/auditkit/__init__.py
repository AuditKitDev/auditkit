"""AuditKit Python SDK."""
from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from base64 import b64encode
from typing import Any, Callable, Iterator, Optional

from .jcs import canonicalize

__all__ = ["AuditKit", "AuditKitError", "client_signable", "canonicalize"]


class AuditKitError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def client_signable(tenant: str, actor: str, action: str, target: Optional[str], occurred_at: str) -> str:
    """Hex sha256 of JCS({tenant, actor, action, target|null, occurred_at}). Sign the raw 32 bytes."""
    doc = {"tenant": tenant, "actor": actor, "action": action, "target": target, "occurred_at": occurred_at}
    return hashlib.sha256(canonicalize(doc).encode("utf-8")).hexdigest()


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
        keep_receipts: Optional[Callable[[dict], None]] = None,
        timeout: float = 10,
        max_attempts: int = 3,
        retry_delay: float = 0.2,
    ):
        self._key = api_key
        self._base = base_url.rstrip("/")
        self._client_key = client_key
        self._keep = keep_receipts
        self._timeout = timeout
        self._max = max_attempts
        self._delay = retry_delay

    def _send(self, path: str, method: str = "GET", body: Any = None, headers: Optional[dict] = None, retry: bool = True):
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
            except (urllib.error.URLError, OSError):
                if attempt >= mx:
                    raise
            time.sleep(self._delay * 2 ** (attempt - 1))
        raise AssertionError("unreachable")

    def _json(self, path: str, **kw: Any) -> Any:
        with self._send(path, **kw) as r:
            return json.loads(r.read())

    def _wire(self, tenant, actor, action, target=None, occurred_at=None, payload=None, idempotency_key=None) -> dict:
        if occurred_at is None and self._client_key is not None:
            occurred_at = _now()
        w: dict = {"tenant": tenant, "actor": actor, "action": action, "idempotency_key": idempotency_key or str(uuid.uuid4())}
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

    def _kept(self, r: dict) -> dict:
        if self._keep:
            self._keep(r)
        return r

    def log(self, tenant, actor, action, target=None, occurred_at=None, payload=None, idempotency_key=None) -> dict:
        w = self._wire(tenant, actor, action, target, occurred_at, payload, idempotency_key)
        return self._kept(self._json("/v1/events", method="POST", body=w, headers={"idempotency-key": w["idempotency_key"]}))

    def log_bulk(self, events: list) -> list:
        """events: dicts with the same keys as log()'s arguments."""
        ws = [self._wire(**e) for e in events]
        return [self._kept(r) for r in self._json("/v1/events/bulk", method="POST", body={"events": ws})["receipts"]]

    def search(self, tenant=None, actor=None, action=None, from_=None, to=None, limit=None, cursor=None) -> dict:
        return self._json("/v1/events" + _qs(tenant=tenant, actor=actor, action=action, **{"from": from_}, to=to, limit=limit, cursor=cursor))

    def get(self, id: str) -> dict:
        return self._json(f"/v1/events/{urllib.parse.quote(id, safe='')}")

    def proof(self, id: str) -> dict:
        return self._json(f"/v1/events/{urllib.parse.quote(id, safe='')}/proof")

    def verify(self, tenant: str, from_: Optional[int] = None, to: Optional[int] = None) -> dict:
        return self._json("/v1/verify" + _qs(tenant=tenant, **{"from": from_}, to=to))

    def export(self, tenant: str, from_: Optional[int] = None, to: Optional[int] = None) -> Iterator[dict]:
        with self._send("/v1/export" + _qs(tenant=tenant, **{"from": from_}, to=to)) as r:
            for line in r:
                line = line.strip()
                if line:
                    yield json.loads(line)

    def tenants(self) -> list:
        return self._json("/v1/tenants")["tenants"]

    def erase(self, id: str) -> dict:
        """Not retried."""
        return self._json(f"/v1/erase/{urllib.parse.quote(id, safe='')}", method="POST", retry=False)
