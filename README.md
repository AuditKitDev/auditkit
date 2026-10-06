# AuditKit

Tamper-evident audit log for B2B SaaS. Events are hash-chained per tenant, signed, batched into Merkle trees, and the roots are published to two public logs AuditKit does not control: [Sigstore Rekor](https://docs.sigstore.dev/logging/overview/) and [OpenTimestamps](https://opentimestamps.org/). An export can be verified offline, with AuditKit's servers switched off, by `@auditkit/verify`.

Live: https://api.auditkit.dev (API, dashboard and docs). AuditKit audits itself; the platform's own chain is public at https://api.auditkit.dev/audit.

## What is in this repository

| Package | What it is |
|---|---|
| `packages/core` | RFC 8785 canonicalization, hash chain, RFC 6962 Merkle trees, the `Anchor` contract and the export format. |
| `packages/server` | The service: REST `/v1`, passwordless dashboard API, MCP server at `/mcp` with an OAuth 2.1 authorization server, anchor loop, SQLite storage (one file per project). |
| `packages/anchor-rekor`, `packages/anchor-ots` | Anchor implementations with offline verification. |
| `packages/verify` | `auditkit-verify <export.jsonl>`: rebuilds every hash and root and checks the public-log receipts without contacting AuditKit. |
| `packages/sdk` | TypeScript SDK. `packages/sdk-python` is the Python SDK (`auditkit-sdk` on PyPI, `import auditkit_sdk`). |
| `packages/web` | The static site and dashboard (Astro). |
| `deploy/` | Dockerfile, compose file, nginx site and deploy script for a single VPS. |
| `docs/` | Contract docs, research, the claims ledger (`docs/claims.md`: every claim on the site mapped to the code or source that proves it), QA and review reports. |

## Run it locally

```sh
pnpm install
pnpm -r --filter '!@auditkit/web' build
AUDITKIT_DATA=./data AUDITKIT_ANCHORS=none pnpm --filter @auditkit/server start   # admin key lands in ./data/first-admin-key.txt
pnpm --filter @auditkit/web dev                                                   # site on :4321, proxies to :3001
```

`AUDITKIT_ANCHORS=rekor,ots` publishes real anchors; both public logs are free and need no account.

## Log an event

```ts
import { AuditKit } from "@auditkit/sdk";
const audit = new AuditKit({ apiKey: process.env.AUDITKIT_API_KEY, baseUrl: "https://api.auditkit.dev" });
const receipt = await audit.log({ tenant: "acme", actor: "u_17", action: "invoice.delete", target: "inv_42", payload: { amount: 10 } });
```

Export and verify offline:

```sh
curl -H "Authorization: Bearer $AUDITKIT_API_KEY" "https://api.auditkit.dev/v1/export?tenant=acme" > acme.jsonl
node packages/verify/dist/cli.js acme.jsonl      # VALID / VALID_UNANCHORED / INVALID, exit 0 / 2 / 1
```

## Connect it to Claude

Claude.ai → Settings → Connectors → Add custom connector → `https://api.auditkit.dev/mcp`, sign in with your email, pick the project. Claude Code: `claude mcp add --transport http auditkit https://api.auditkit.dev/mcp`.

## Tests

```sh
pnpm -r --filter '!@auditkit/web' test
cd packages/sdk-python && python -m pytest
pnpm --filter @auditkit/server smoke:prod        # customer-path smoke test against a running instance (needs AUDITKIT_API_KEY)
```

## License

AGPL-3.0-only. See `LICENSE`.
