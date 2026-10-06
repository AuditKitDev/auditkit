import { serve } from "@hono/node-server";
import type { Anchor } from "@auditkit/core";
import { RekorAnchor } from "@auditkit/anchor-rekor";
import { OtsAnchor } from "@auditkit/anchor-ots";
import { openRegistry, type Config } from "./db.js";
import { loadSigner, loadAnchorKey } from "./signing.js";
import { buildApp } from "./app.js";
import { tick, maintain } from "./anchorLoop.js";
import { createProject, createKey } from "./keys.js";

const cfg: Config = { dataDir: process.env.AUDITKIT_DATA ?? "./data", publicHost: process.env.AUDITKIT_PUBLIC_HOST ?? "localhost" };
const port = Number(process.env.PORT ?? 3001);
const interval = Number(process.env.AUDITKIT_ANCHOR_INTERVAL ?? 300);
// Default: both public anchors. AUDITKIT_ANCHORS=none for offline dev, or a comma list.
const wanted = (process.env.AUDITKIT_ANCHORS ?? "rekor,ots").split(",").map((s) => s.trim()).filter((s) => s && s !== "none");

const reg = openRegistry(cfg);
const signer = loadSigner(cfg.dataDir);
const anchors: Anchor[] = [];
if (wanted.includes("rekor")) anchors.push(new RekorAnchor(loadAnchorKey(cfg.dataDir)));
if (wanted.includes("ots")) anchors.push(new OtsAnchor());

const app = buildApp({ cfg, reg, signer, anchorPolicy: { kinds: anchors.map((a) => a.kind), interval_seconds: interval } });

// Dev convenience: first boot with no projects creates one and prints its admin key.
if ((reg.prepare("SELECT COUNT(*) AS n FROM project").get() as { n: number }).n === 0) {
  const { id } = createProject(reg, "dev");
  const { key } = createKey(reg, id, "test", ["admin", "read", "write", "erase"]);
  console.log(`[auditkit] created project ${id}\n[auditkit] admin key (shown once): ${key}`);
}

const log = (m: string) => console.log(`[anchor] ${m}`);
let running = false;
setInterval(() => {
  if (running) return;
  running = true;
  void tick(cfg, reg, anchors, log)
    .then(() => maintain(reg, anchors, log))
    .catch((e: Error) => log(`tick failed: ${e.message}`))
    .finally(() => { running = false; });
}, interval * 1000).unref();

serve({ fetch: app.fetch, port }, () => console.log(`[auditkit] listening on :${port}, anchors: ${anchors.map((a) => a.kind).join(",") || "none"}, every ${interval}s`));
