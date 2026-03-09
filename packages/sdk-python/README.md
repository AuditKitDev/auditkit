# AuditKit Python SDK

Drop-in audit logs for B2B SaaS. Python client for the [AuditKit](https://auditkit.dev) API.

## Installation

```bash
pip install auditkit
```

## Quick Start

```python
from auditkit import AuditKit, AuditActor, AuditTarget

client = AuditKit(api_key="ak_live_...", base_url="https://api.auditkit.dev")

# Log an event
response = client.log(
    action="document.updated",
    actor=AuditActor(id="user_123", name="Jane"),
    target=AuditTarget(type="document", id="doc_456"),
    tenant_id="org_acme",
    metadata={"field": "title", "old_value": "Draft", "new_value": "Final"},
)

# Bulk log events
from auditkit.types import AuditEventInput

events = [
    AuditEventInput(action="user.login", actor=AuditActor(id="user_1"), tenant_id="org_acme"),
    AuditEventInput(action="user.login", actor=AuditActor(id="user_2"), tenant_id="org_acme"),
]
client.bulk_log(events)

# Search events
results = client.search("document.updated", tenant_id="org_acme", limit=50)
for event in results.data:
    print(f"{event.action} by {event.actor_id} at {event.occurred_at}")

# Verify integrity
verification = client.verify("evt_abc123")
print(f"Chain valid: {verification.valid}")
```

## Async Usage

```python
import asyncio
from auditkit import AuditKit, AuditActor

async def main():
    async with AuditKit(api_key="ak_live_...") as client:
        await client.async_log(
            action="document.updated",
            actor=AuditActor(id="user_123"),
            tenant_id="org_acme",
        )

        results = await client.async_search("document.updated", tenant_id="org_acme")

asyncio.run(main())
```

## Configuration

```python
client = AuditKit(
    api_key="ak_live_...",
    base_url="https://api.auditkit.dev",   # API base URL
    default_tenant_id="org_acme",           # Default tenant for all calls
    environment="production",               # production | staging | development
    max_retries=3,                          # Retry count with exponential backoff
    timeout=30.0,                           # Request timeout in seconds
    debug=False,                            # Enable debug logging
)
```

## Error Handling

```python
from auditkit import AuditKit, AuditKitError

try:
    client.log(action="test", actor=AuditActor(id="u1"))
except AuditKitError as e:
    print(f"Error {e.code} (HTTP {e.status}): {e}")
```

## License

AGPL-3.0-or-later
