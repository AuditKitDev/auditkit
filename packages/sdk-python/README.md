# auditkit (Python)

Stdlib-only client for the AuditKit API (Python 3.10+). Client signing needs `pip install auditkit[sign]`.

```python
from auditkit import AuditKit

audit = AuditKit(api_key="ak_live_...")
receipt = audit.log("acme", "u_1", "invoice.delete", target="inv_42")
print(receipt["position"], receipt["event_hash"])
for line in audit.export("acme"): print(line["type"])  # verify offline with @auditkit/verify
```

Methods: `log`, `log_bulk`, `search`, `get`, `proof`, `verify`, `export` (iterator of NDJSON dicts), `tenants`, `erase` (returns `{"erased": True, "audit": receipt}`), `register_tenant_key(tenant, public_key)` (DER SPKI bytes or base64 str), `list_tenant_keys`, `revoke_tenant_key(tenant, key_id)`, `set_tenant_policy(tenant, require_client_sig)` (admin scope).
Failures raise `AuditKitError(status, code, message)`.

Retries: 3 attempts, exponential backoff (0.2s doubled) on 429, 5xx and network errors. `log` and `log_bulk` always send an idempotency key (uuid4 per event unless given), so retries never double-log. `erase` is never retried.

## Client signatures

Register the public key with `register_tenant_key` first: the server rejects events signed without a registered key (400). Then pass `client_key` (a `cryptography` Ed25519 private key) and every event is signed; `occurred_at` is filled with the current UTC time if omitted.
`client_sig = base64(Ed25519.sign(sha256(JCS({tenant, actor, action, target|null, occurred_at}))))`, signing the 32 raw digest bytes.
`client_signable(tenant, actor, action, target, occurred_at)` returns that digest as hex. `payload` is not signed.
