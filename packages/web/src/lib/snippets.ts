// Code shown on the site. TS from packages/sdk/README.md, Python from packages/sdk-python/README.md.
export const TS_QUICKSTART = `import { AuditKit } from "@auditkit/sdk";

const audit = new AuditKit({ apiKey: process.env.AUDITKIT_KEY! });
const receipt = await audit.log({ tenant: "acme", actor: "u_1", action: "invoice.delete", target: "inv_42" });
console.log(receipt.position, receipt.event_hash, receipt.server_sig);`;

export const PY_QUICKSTART = `from auditkit import AuditKit

audit = AuditKit(api_key=os.environ["AUDITKIT_KEY"])
receipt = audit.log("acme", "u_1", "invoice.delete", target="inv_42")
print(receipt["position"], receipt["event_hash"], receipt["server_sig"])`;

export const CURL_QUICKSTART = `curl -X POST https://api.auditkit.dev/v1/events \\
  -H "Authorization: Bearer $AUDITKIT_KEY" -H "Content-Type: application/json" \\
  -d '{"tenant":"acme","actor":"u_1","action":"invoice.delete","target":"inv_42"}'
# → {"id":"01J…","position":0,"event_hash":"…","prev_hash":"000…","server_sig":"…"}`;

export const PUBLISH_NOTE = "Both SDKs are in the repo and tested; the npm and PyPI packages publish with v2.0.0. Until then install from source.";

export const MCP_CLAUDE_CODE = `claude mcp add --transport http auditkit https://auditkit.dev/mcp
# first use opens a browser: sign in with your email, pick the project, done`;

export const MCP_JSON = `{
  "mcpServers": {
    "auditkit": {
      "type": "http",
      "url": "https://auditkit.dev/mcp",
      "headers": { "Authorization": "Bearer ak_test_…" }
    }
  }
}`;

export const VERIFY_CMDS = `# export a tenant's evidence (SDK, REST or the dashboard)
curl -H "Authorization: Bearer $AUDITKIT_KEY" \\
  "https://api.auditkit.dev/v1/export?tenant=acme" > acme.jsonl

# verify with no call to AuditKit; --online adds a live Rekor/Bitcoin cross-check
npx @auditkit/verify acme.jsonl --pin <server public key, base64 SPKI>
npx @auditkit/verify acme.jsonl --online --json`;

export const ERASE_SNIPPET = `POST /v1/erase/01J9K4…        scope: erase

before   payload_commit 7c1e…   payload {"email":"ann@…"}
after    payload_commit 7c1e…   payload null   erased: true

verify   ok  payloads  1281 payload commitments verify, 3 erased
         ok  chain     1284 events, prev GENESIS → head 9f3c…`;
