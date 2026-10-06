// Seed a realistic project for directory reviewers (or a demo): two tenants, ~200 events over 30 days,
// one erased payload, one anchored batch. Prints a read+write test key once.
// Usage: AUDITKIT_DATA=./data npx tsx scripts/seed-reviewer.ts [--anchor]   (--anchor runs a real Rekor+OTS tick)
import { openRegistry, openProject } from "../src/db.js";
import { loadSigner, loadAnchorKey } from "../src/signing.js";
import { createProject, createKey } from "../src/keys.js";
import { ingest, erase, search } from "../src/events.js";
import { tick } from "../src/anchorLoop.js";
import { migrateAuth } from "../src/auth.js";
import { migrateBilling } from "../src/billing.js";
import { RekorAnchor } from "@auditkit/anchor-rekor";
import { OtsAnchor } from "@auditkit/anchor-ots";

const cfg = { dataDir: process.env.AUDITKIT_DATA ?? "./data", publicHost: process.env.AUDITKIT_PUBLIC_HOST ?? "localhost" };
const reg = openRegistry(cfg);
migrateAuth(reg); migrateBilling(reg);
const signer = loadSigner(cfg.dataDir);
const { id } = createProject(reg, "Reviewer sandbox", "pro");
const db = openProject(cfg, id);

const actors = ["alice@acme.example", "bob@acme.example", "svc-billing", "admin@acme.example"];
const actions: Array<[string, string]> = [
  ["user.login", "session"], ["user.mfa.disable", "user"], ["invoice.create", "invoice"], ["invoice.delete", "invoice"],
  ["export.download", "report"], ["role.grant", "user"], ["api_key.create", "key"], ["record.update", "customer"], ["refund.approve", "refund"],
];
const rnd = (n: number) => Math.floor(Math.random() * n);
const start = Date.now() - 30 * 86_400_000;
const events = Array.from({ length: 200 }, (_, i) => {
  const [action, kind] = actions[rnd(actions.length)]!;
  const tenant = i % 3 === 0 ? "globex" : "acme";
  return {
    tenant, actor: actors[rnd(actors.length)]!, action, target: `${kind}_${1000 + rnd(400)}`,
    occurred_at: new Date(start + i * ((30 * 86_400_000) / 200) + rnd(60_000)).toISOString(),
    payload: { ip: `203.0.113.${rnd(255)}`, ua: "Mozilla/5.0", reason: action.endsWith("delete") ? "customer request" : undefined, amount: action.startsWith("refund") ? rnd(500) : undefined },
  };
});
ingest(db, id, signer, events.slice(0, 150));
const toErase = search(db, { tenant: "acme", action: "invoice.delete", limit: 1 }).events[0];
if (toErase) erase(db, toErase.id);

if (process.argv.includes("--anchor")) {
  const anchors = [new RekorAnchor(loadAnchorKey(cfg.dataDir)), new OtsAnchor()];
  const r = await tick(cfg, reg, anchors, (m) => console.log("[anchor]", m));
  console.log("anchored", r?.globalRoot);
}
ingest(db, id, signer, events.slice(150)); // 50 newer events stay unanchored until the next tick
const { key } = createKey(reg, id, "test", ["read", "write"]);
console.log(`project ${id}\nreviewer key (shown once): ${key}\nerased event: ${toErase?.id ?? "none"}`);
