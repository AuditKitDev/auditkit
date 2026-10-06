# @auditkit/sdk

Zero-dependency TypeScript client for the AuditKit API (Node 22+, global `fetch`).

```ts
import { AuditKit } from "@auditkit/sdk";

const audit = new AuditKit({ apiKey: process.env.AUDITKIT_KEY! });
const receipt = await audit.log({ tenant: "acme", actor: "u_1", action: "invoice.delete", target: "inv_42" });
console.log(receipt.position, receipt.event_hash);
for await (const line of audit.export({ tenant: "acme" })) console.log(line.type); // verify offline with @auditkit/verify
```

Methods: `log`, `logBulk`, `search`, `get`, `proof`, `verify`, `export` (async iterable of NDJSON lines), `tenants`, `erase` (returns `{ erased: true, audit }`; the erasure is logged as a `payload.erased` event), `registerTenantKey(tenant, keyObjectOrSpkiBase64)`, `listTenantKeys`, `revokeTenantKey(tenant, keyId)`, `setTenantPolicy(tenant, { requireClientSig })` (admin scope).
Options: `baseUrl`, `clientKey`, `keepReceipts(receipt)`, `fetch`, `maxAttempts` (3), `retryDelayMs` (200, doubled per retry).
Failures throw `AuditKitError { status, code, message }`.

## Retries

Up to 3 attempts with exponential backoff on 429, 5xx and network errors. Reads retry always. `log` and `logBulk` always send an idempotency key (a `crypto.randomUUID()` per event if you did not pass `idempotencyKey`), so a retry after a lost response replays the original receipt (`duplicate: true`) and never double-logs. `erase` is never retried.

## Client signatures

Pass `clientKey` (an Ed25519 private `KeyObject`) and every event is signed. Register the matching public key first with `registerTenantKey`; the server verifies `client_sig` on ingest and rejects events signed without a registered key (400). `setTenantPolicy(tenant, { requireClientSig: true })` also rejects unsigned events.

The server picks the salt, id and position, so the client cannot sign `event_hash`. It signs the fields it controls:

```
digest     = sha256( JCS({ tenant, actor, action, target, occurred_at }) )   // 32 raw bytes
client_sig = base64( Ed25519.sign(digest) )                                  // over the raw digest, not its hex
```

- `JCS` is RFC 8785. `target` is `null` when absent. `tenant` is the external tenant id you pass, not the server's internal `tenant_id`; a verifier must be given it.
- `occurred_at` is required when signing. The SDK fills it with the current ISO time if you omit `occurredAt`, and sends that exact string. The verifier uses `occurred_at` from the export line.
- `payload` is not covered by `client_sig` (it is covered by the chain through `payload_commit`).

The signed message is defined by `clientSignable` in `@auditkit/core`. The SDK's `clientSignable({ tenant, actor, action, target?, occurredAt })` adapts it (camelCase input) and returns the digest as hex, and `verifyClientSig(publicKey, input, sig)` checks a signature. Import both from `@auditkit/sdk` in verifiers so they use identical bytes.

## Receipts

Receipts carry `tenant_id`, `project_id`, `occurred_at` and `payload_commit`. `verifyReceipt(receipt, serverPublicKey, { actor, action, target? })` recomputes `event_hash` offline and checks `server_sig` against the server's public key (`KeyObject` or base64 SPKI, published at `/.well-known/auditkit.json`).
