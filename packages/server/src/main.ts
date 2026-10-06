import { serve } from "@hono/node-server";
import type { Anchor } from "@auditkit/core";
import { RekorAnchor } from "@auditkit/anchor-rekor";
import { OtsAnchor } from "@auditkit/anchor-ots";
import { openRegistry, openProject, type Config } from "./db.js";
import { loadSigner, loadAnchorKey } from "./signing.js";
import { buildApp } from "./app.js";
import { tick, maintain, applyRetention, resetProjectData } from "./anchorLoop.js";
import { createProject, createKey } from "./keys.js";
import { migrateAuth, makeMailer } from "./auth.js";
import { migrateBilling, billingFromEnv } from "./billing.js";
import { migrateOAuth } from "./oauth.js";
import { planOf } from "./plans.js";

const cfg: Config = { dataDir: process.env.AUDITKIT_DATA ?? "./data", publicHost: process.env.AUDITKIT_PUBLIC_HOST ?? "localhost" };
const port = Number(process.env.PORT ?? 3001);
const interval = Number(process.env.AUDITKIT_ANCHOR_INTERVAL ?? 300);
const siteUrl = process.env.AUDITKIT_SITE_URL ?? `http://localhost:${port}`;
// Default: both public anchors. AUDITKIT_ANCHORS=none for offline dev, or a comma list.
const wanted = (process.env.AUDITKIT_ANCHORS ?? "rekor,ots").split(",").map((s) => s.trim()).filter((s) => s && s !== "none");

const reg = openRegistry(cfg);
migrateAuth(reg);
migrateBilling(reg);
migrateOAuth(reg);
const signer = loadSigner(cfg.dataDir);
const anchors: Anchor[] = [];
if (wanted.includes("rekor")) anchors.push(new RekorAnchor(loadAnchorKey(cfg.dataDir)));
if (wanted.includes("ots")) anchors.push(new OtsAnchor());

// The public demo on the homepage writes here. Reset nightly by dropping and recreating its file.
const DEMO = "demo";
if (!reg.prepare("SELECT 1 FROM project WHERE id = ?").get(DEMO)) {
  reg.prepare("INSERT INTO project (id, name, plan, created_at) VALUES (?, 'Public demo', 'business', ?)").run(DEMO, new Date().toISOString());
}
openProject(cfg, DEMO);

const app = buildApp({
  cfg, reg, signer,
  anchorPolicy: { kinds: anchors.map((a) => a.kind), interval_seconds: interval },
  web: { mailer: makeMailer(), billing: billingFromEnv(siteUrl), siteUrl, secureCookies: siteUrl.startsWith("https://"), demoProjectId: DEMO },
});

// Dev convenience: first boot with no user projects creates one and prints its admin key.
if ((reg.prepare("SELECT COUNT(*) AS n FROM project WHERE id != ?").get(DEMO) as { n: number }).n === 0) {
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

// Nightly at 03:00 UTC the public demo starts from an empty chain.
let lastDemoReset = "";
setInterval(() => {
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  if (d.getUTCHours() === 3 && lastDemoReset !== day) { lastDemoReset = day; resetProjectData(cfg, DEMO); console.log("[demo] reset"); }
}, 10 * 60 * 1000).unref();

setInterval(() => {
  const n = applyRetention(cfg, reg, (plan) => planOf(plan).retention_days);
  if (n) console.log(`[retention] shredded ${n} payloads`);
}, 6 * 3600 * 1000).unref();

serve({ fetch: app.fetch, port }, () =>
  console.log(`[auditkit] listening on :${port}, site ${siteUrl}, anchors: ${anchors.map((a) => a.kind).join(",") || "none"}, every ${interval}s`),
);
