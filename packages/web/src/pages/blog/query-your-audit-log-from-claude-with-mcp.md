---
layout: ../../layouts/BlogPost.astro
title: "Query your audit log from Claude (MCP)"
description: "AuditKit's MCP server: seven tools over Streamable HTTP with the same API key as REST, tool annotations, what is read-only, and how to add it to Claude Code or Claude.ai."
lede: "AuditKit's MCP server exposes seven tools (search_events, get_event, get_proof, verify_range, list_tenants, export_evidence, log_event) over Streamable HTTP from the same process as REST. Add it as a custom connector in Claude.ai, sign in with your email, pick the project, and ask \"who changed billing settings last week, and is the chain intact?\""
date: 2026-10-05
tags: [mcp]
---

## Install

Claude.ai: Settings → Connectors → Add custom connector → URL `https://auditkit.dev/mcp` → sign in with your email → pick the project → done. The server is an OAuth 2.1 authorization server (discovery at `/.well-known/oauth-authorization-server`, dynamic client registration, PKCE), so Claude never sees an API key; the token it gets is scoped to the project you chose.

Claude Code:

```
claude mcp add --transport http auditkit https://auditkit.dev/mcp
```

Any MCP client that reads a JSON config and cannot do OAuth:

```json
{ "mcpServers": { "auditkit": { "type": "http", "url": "https://auditkit.dev/mcp",
  "headers": { "Authorization": "Bearer ak_test_…" } } } }
```

Test keys (`ak_test_`) hit a seeded demo project, so every tool can be exercised before you log anything real.

## The tools

| tool | title | annotations |
|---|---|---|
| `search_events` | Search audit events | read-only |
| `get_event` | Get one audit event | read-only |
| `get_proof` | Get tamper-evidence proof for an event | read-only |
| `verify_range` | Verify chain integrity for a tenant | read-only |
| `list_tenants` | List tenants | read-only |
| `export_evidence` | Export verifier-ready evidence | read-only |
| `log_event` | Record an audit event | writes; destructiveHint false |

Every tool declares `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint`, so an agent (or the person approving its tool calls) can tell a search from a write. There is no erase tool over MCP, on purpose. Scopes apply to OAuth tokens and API keys alike: a read-only principal gets `key lacks write scope` from `log_event`.

## Same process, not a wrapper

The MCP handler is a Hono route in the same server as `/v1`. A fresh stateless server and transport are built per request, bound to the principal's project, whether that is an OAuth token or an API key. Same data, same auth, same rate limits.

## Example conversations

"List tenants and tell me which has the most events." `list_tenants`.

"Show me every `user.role.change` for tenant acme in September." `search_events` with `action` and a time range.

"Is acme's chain intact, and how far is it anchored?" `verify_range` returns `valid: true`, the head hash, `rooted_through` and `anchored_through`.

"Give me the proof for event 01J… so I can send it to their auditor." `get_proof` returns the three Merkle paths and the Rekor and OpenTimestamps receipts.

## Limits

`export_evidence` truncates at 2000 lines over MCP; use `GET /v1/export` for full files. Search returns at most 200 events per call over MCP.
