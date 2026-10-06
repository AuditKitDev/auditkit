// Code shown on the site. TS from packages/sdk/README.md, Python from packages/sdk-python/README.md.
export const TS_QUICKSTART = `// Until @auditkit/sdk is on npm: git clone https://github.com/AuditKitDev/auditkit && pnpm install && pnpm -r build,
// then npm install <clone>/packages/sdk. ESM ("type": "module") and Node 22+.
import { AuditKit } from "@auditkit/sdk";
const audit = new AuditKit({ apiKey: process.env.AUDITKIT_KEY!, baseUrl: process.env.AUDITKIT_URL ?? "https://api.auditkit.dev" });
const receipt = await audit.log({ tenant: "acme", actor: "u_1", action: "invoice.delete", target: "inv_42" });
console.log(receipt.position, receipt.event_hash, receipt.server_sig);`;

export const PY_QUICKSTART = `# Until auditkit-sdk is on PyPI: pip install <clone>/packages/sdk-python  (Python 3.10+)
import os
from auditkit_sdk import AuditKit
audit = AuditKit(api_key=os.environ["AUDITKIT_KEY"], base_url=os.environ.get("AUDITKIT_URL", "https://api.auditkit.dev"))
receipt = audit.log("acme", "u_1", "invoice.delete", target="inv_42")
print(receipt["position"], receipt["event_hash"], receipt["server_sig"])`;

export const CURL_QUICKSTART = `curl -X POST https://api.auditkit.dev/v1/events \\
  -H "Authorization: Bearer $AUDITKIT_KEY" -H "Content-Type: application/json" \\
  -d '{"tenant":"acme","actor":"u_1","action":"invoice.delete","target":"inv_42"}'
# → {"id":"01J…","position":0,"event_hash":"…","prev_hash":"000…","server_sig":"…"}`;

export const PUBLISH_NOTE = "Both SDKs are in the repo and tested; the npm and PyPI packages (auditkit-sdk) publish with v2.0.0. Until then install from the clone as the first line shows. Set AUDITKIT_URL to your own instance when self-hosting.";
export const VERIFY_CMD_REPO = "node packages/verify/dist/cli.js";
export const VERIFY_CLI_NOTE = `Until the package is published, run it from the repo: ${VERIFY_CMD_REPO} <file>. The npx form is the eventual command.`;

export const MCP_CLAUDE_CODE = `claude mcp add --transport http auditkit https://auditkit.dev/mcp
# first use opens a browser: sign in with your email, pick the project, done`;

export const MCP_JSON = `{
  "mcpServers": {
    "auditkit": {
      "type": "http",
      "url": "https://auditkit.dev/mcp",
      "headers": { "Authorization": "Bearer ak_live_…" }
    }
  }
}`;

export const VERIFY_CMDS = `# export a tenant's evidence (SDK, REST or the dashboard)
curl -H "Authorization: Bearer $AUDITKIT_KEY" \\
  "https://api.auditkit.dev/v1/export?tenant=acme" > acme.jsonl

# verify with no call to AuditKit; --online adds a live Rekor/Bitcoin cross-check.
# Until @auditkit/verify is published, run it from the repo (pnpm install && pnpm -r build first):
node packages/verify/dist/cli.js acme.jsonl --pin <server public key, base64 SPKI>
node packages/verify/dist/cli.js acme.jsonl --online --json
# eventual form, once published:
npx @auditkit/verify acme.jsonl --pin <server public key, base64 SPKI>`;

export const ERASE_SNIPPET = `POST /v1/erase/01J9K4…        scope: erase

before   payload_commit 7c1e…   payload {"email":"ann@…"}
after    payload_commit 7c1e…   payload null   erased: true

verify   ok  payloads  1281 payload commitments verify, 3 erased
         ok  chain     1284 events, prev GENESIS → head 9f3c…`;
