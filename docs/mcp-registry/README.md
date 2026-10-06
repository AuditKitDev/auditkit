# Official MCP Registry: publishing `dev.auditkit/auditkit`

`server.json` in this folder is the manifest for AuditKit's remote MCP server at `https://auditkit.dev/mcp`. Written 2026-10-06 against the registry docs fetched the same day (citations at the end). Steps tagged [OWNER] need the owner's DNS panel or accounts; the rest the board can run.

## Why this name and this auth method

- The remote URL is on `auditkit.dev`, so the server is published under the domain namespace `dev.auditkit/*` with DNS authentication. The registry docs recommend this when the URL is on a domain you control, so readers can see that name and URL belong to the same publisher.
- Fallback: `io.github.AuditKitDev/auditkit` with `mcp-publisher login github`. That needs the logged-in GitHub user to be an **Owner** of the `AuditKitDev` org (ordinary membership is not enough). If the DNS route is blocked, change `name` in `server.json` and skip steps 2–3.
- Only `remotes` is set; there is no `packages` entry, so no npm `mcpName` marker is needed.
- The registry has no field for OAuth. Clients discover it the standard way: a `401` from `/mcp` with `WWW-Authenticate: Bearer resource_metadata=…`, then `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` (`packages/server/src/oauth.ts`). It is described under `_meta."io.modelcontextprotocol.registry/publisher-provided"`, the one `_meta` key the registry preserves. No `headers` entry is declared: declaring a required `Authorization` header would make clients prompt for an API key instead of running OAuth.
- `description` is 99 characters (limit 100). `repository.id` is GitHub's numeric id for `AuditKitDev/auditkit` (`gh api repos/AuditKitDev/auditkit --jq .id` → `1177303765`, 2026-10-06).

## Prerequisites (check before step 1)

- [ ] `https://auditkit.dev/mcp` is publicly reachable. A `401` with `WWW-Authenticate` is correct; `404` is not. [2026-10-06 13:40Z: the apex still serves the v1 site and `/mcp` returns 404; `https://api.auditkit.dev/mcp` returns 401. Deploy v2 to the apex (`deploy/nginx-auditkit.conf`) first, or change `remotes[0].url` to `https://api.auditkit.dev/mcp`.]
- [ ] `https://auditkit.dev/icon.svg` resolves after the v2 deploy (`packages/web/public/icon.svg`); otherwise delete `icons`.
- [ ] `version` matches what you ship. The server reports `2.0.0` to MCP clients (`packages/server/src/mcp.ts`); the packages are `2.0.0-alpha.0`. Set both to the same value at publish time.
- [ ] Each remote URL may be used by one server name only; publishing fails if another entry already claims `https://auditkit.dev/mcp`.
- [ ] OpenSSL 3 (`openssl version` on this box: 3.6.4). `mcp-publisher` is not installed here yet (step 1).

## Commands

Run from `docs/mcp-registry/`. Keep `key.pem` out of git (it is the DNS proof key; losing it means a new TXT record).

```bash
# 1. Install mcp-publisher (Linux/macOS)
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
mcp-publisher --help

# 2. Generate the Ed25519 proof key and print the TXT record
MY_DOMAIN="auditkit.dev"
openssl genpkey -algorithm Ed25519 -out key.pem
PUBLIC_KEY="$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
echo "${MY_DOMAIN}. IN TXT \"v=MCPv1; k=ed25519; p=${PUBLIC_KEY}\""
```

```
# 3. [OWNER] Add this TXT record in the DNS panel for auditkit.dev
#    Host/name:  @            (the apex, auditkit.dev itself; NOT _mcp-auth or any selector)
#    Type:       TXT
#    Value:      v=MCPv1; k=ed25519; p=<PUBLIC_KEY from step 2>
#    Wait for propagation (minutes). Check with:  dig +short TXT auditkit.dev
#    If the key is ever rotated, delete the old record; a stale one is tried first and fails the login.
```

```bash
# 4. Log in with DNS auth
MY_DOMAIN="auditkit.dev"
PRIVATE_KEY="$(openssl pkey -in key.pem -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain "${MY_DOMAIN}" --private-key "${PRIVATE_KEY}"

# 5. Validate and publish
mcp-publisher validate
mcp-publisher publish

# 6. Confirm
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=dev.auditkit/auditkit"
```

Alternative to the TXT record: HTTP auth serves the same string from `https://auditkit.dev/.well-known/mcp-registry-auth` and logs in with `mcp-publisher login http --domain auditkit.dev --private-key "${PRIVATE_KEY}"`. On this deployment nginx routes every `/.well-known/` path to the API process (`deploy/nginx-auditkit.conf`), so that needs a route in the Hono app; the TXT record is less work.

Re-publishing a new version: bump `version` in `server.json`, `mcp-publisher login dns …` again, `mcp-publisher publish`. Retiring a version: `mcp-publisher status`.

## Citations (fetched 2026-10-06; quotes verbatim)

| source | claim | quote | fetched_at |
|---|---|---|---|
| https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/modelcontextprotocol-io/quickstart.mdx | Remote-only servers publish metadata with `remotes` and no package. | "Your `server.json` must include a `remotes` entry and can omit `packages`" | 2026-10-06T13:38:11Z |
| same | Description limit. | "The Registry limits the `description` field to 100 characters." | 2026-10-06T13:38:11Z |
| same | Install command for `mcp-publisher`. | "curl -L \"https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s \| tr '[:upper:]' '[:lower:]')_$(uname -m \| sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz\" \| tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/" | 2026-10-06T13:38:11Z |
| same | Publish and confirm commands. | "mcp-publisher publish" / "curl \"https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.my-username/weather\"" | 2026-10-06T13:38:11Z |
| same | Schema URL. | "\"$schema\": \"https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json\"" | 2026-10-06T13:38:11Z |
| https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/modelcontextprotocol-io/authentication.mdx | Domain auth name form. | "If you choose domain-based authentication, your server's name in `server.json` **MUST** be of the form `com.example.*/*`, where `com.example` is the reverse-DNS form of your domain name." | 2026-10-06T13:38:11Z |
| same | GitHub org namespace needs Owner. | "To publish under an **organization** namespace (`io.github.<orgname>/*`), you must be an **Owner** of that organization. Ordinary org membership is no longer sufficient" | 2026-10-06T13:38:11Z |
| same | TXT record goes on the apex. | "The TXT record must be placed on the **apex** of your domain (e.g. `example.com`), **not** under a selector like `_mcp-auth.example.com` or `_mcp-registry.example.com`." | 2026-10-06T13:38:11Z |
| same | Stale records break login. | "If you rotate keys, also remember to remove the previous TXT record from the apex — a stale record left behind will be tried first and cause verification to fail." | 2026-10-06T13:38:11Z |
| same | Key and TXT generation (Ed25519). | "openssl genpkey -algorithm Ed25519 -out key.pem" / "PUBLIC_KEY=\"$(openssl pkey -in key.pem -pubout -outform DER \| tail -c 32 \| base64)\"" / "echo \"${MY_DOMAIN}. IN TXT \\\"v=MCPv1; k=ed25519; p=${PUBLIC_KEY}\\\"\"" | 2026-10-06T13:38:11Z |
| same | DNS login command. | "PRIVATE_KEY=\"$(openssl pkey -in key.pem -noout -text \| grep -A3 \"priv:\" \| tail -n +2 \| tr -d ' :\\n')\"" / "mcp-publisher login dns --domain \"${MY_DOMAIN}\" --private-key \"${PRIVATE_KEY}\"" | 2026-10-06T13:38:11Z |
| same | HTTP alternative. | "HTTP authentication is a domain-based authentication method that relies on a `/.well-known/mcp-registry-auth` file hosted on your domain." | 2026-10-06T13:38:11Z |
| same | OpenSSL 3 needed for Ed25519. | "The Ed25519 codepath requires **OpenSSL 3.0 or later**." | 2026-10-06T13:38:11Z |
| https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/modelcontextprotocol-io/remote-servers.mdx | Remote URL must be public. | "A remote server **MUST** be publicly accessible at its specified URL." | 2026-10-06T13:39:10Z |
| same | Registry checks the namespace, not the URL; domain auth recommended for own domain. | "It does **not** verify that you control the remote URL, regardless of authentication method" / "If your remote URL is on a domain you control, consider using DNS or HTTP authentication so the server name reflects that domain." | 2026-10-06T13:39:10Z |
| same | One name per URL. | "Each remote URL can be used by only one server name. Publishing fails if another server already uses the same URL." | 2026-10-06T13:39:10Z |
| same | Transport. | "Remote servers should use the Streamable HTTP transport. The SSE transport is [deprecated]" | 2026-10-06T13:39:10Z |
| same | Headers are for API keys. | "MCP clients can be instructed to send specific HTTP headers by adding the `headers` property to the `remotes` entry" | 2026-10-06T13:39:10Z |
| https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/official-registry-requirements.md | Only one `_meta` key survives. | "only data under the specific key `io.modelcontextprotocol.registry/publisher-provided` will be preserved" | 2026-10-06T13:39:10Z |
| same | Namespaced subkeys inside it are a convention. | "grouping keys under reverse-DNS subkeys is a useful convention to avoid accidental collisions" / "This is **not enforced**" | 2026-10-06T13:39:10Z |
| https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json | Required fields; name pattern; version form; icon types. | required: `["name", "description", "version"]`; name `"pattern": "^[a-zA-Z0-9.-]+/[a-zA-Z0-9._-]+$"`; version "SHOULD follow semantic versioning (e.g., '1.0.2', '2.1.0-alpha')"; icon `mimeType` enum includes `"image/svg+xml"`; `repository.id`: "For GitHub, use: gh api repos/<owner>/<repo> --jq '.id'" | 2026-10-06T13:38:11Z |
| https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/generic-server-json.md | Remote example shape. | "\"remotes\": [ { \"type\": \"streamable-http\", \"url\": \"https://mcp-fs.anonymous.modelcontextprotocol.io/http\" } ]" | 2026-10-06T13:38:11Z |

Not fetched (do not rely on): `publish-a-server.mdx` (404), `package-types.mdx`, `github-actions.mdx`, the registry moderation policy (quoted only in `docs/research/gtm.md` §4.3).
