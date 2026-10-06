// Customer-path smoke test against a running AuditKit (default production). Needs a live key with
// read+write+erase scopes. Exits non-zero on the first failure. Writes nothing to the repo.
// Usage: AUDITKIT_API_KEY=ak_live_... node scripts/smoke-prod.mjs [https://api.auditkit.dev]
import { AuditKit, verifyReceipt } from "@auditkit/sdk";
import { verifyExport } from "@auditkit/verify";
import { generateKeyPairSync } from "node:crypto";

const baseUrl = process.argv[2] ?? "https://api.auditkit.dev";
const key = process.env.AUDITKIT_API_KEY;
if (!key) { console.error("AUDITKIT_API_KEY required"); process.exit(64); }
const must = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exit(1); } console.log("ok  ", msg); };
const tenant = `smoke_${Date.now().toString(36)}`;
const audit = new AuditKit({ apiKey: key, baseUrl });

const wk = await (await fetch(`${baseUrl}/.well-known/auditkit.json`)).json();
must(wk.server_public_key && wk.anchor_public_key, "well-known publishes server and anchor keys");
const r1 = await audit.log({ tenant, actor: "u_1", action: "invoice.delete", target: "inv_1", payload: { amount: 10 } });
const r2 = await audit.log({ tenant, actor: "u_2", action: "user.mfa.disable" });
must(r2.prev_hash === r1.event_hash && r2.position === 1, "events chain in order");
must(verifyReceipt(r1, wk.server_public_key, { actor: "u_1", action: "invoice.delete", target: "inv_1", payload: { amount: 10 } }), "receipt verifies offline against the published key");

const good = generateKeyPairSync("ed25519"), wrong = generateKeyPairSync("ed25519");
await audit.registerTenantKey(tenant, good.publicKey);
must((await new AuditKit({ apiKey: key, baseUrl, clientKey: good.privateKey }).log({ tenant, actor: "u_3", action: "doc.sign" })).position === 2, "customer-signed event accepted");
must(await new AuditKit({ apiKey: key, baseUrl, clientKey: wrong.privateKey }).log({ tenant, actor: "u_3", action: "doc.sign" }).then(() => false, (e) => e.status === 400), "wrong customer key rejected");
await audit.setTenantPolicy(tenant, { requireClientSig: true });
must(await audit.log({ tenant, actor: "u_3", action: "doc.sign" }).then(() => false, (e) => e.status === 400), "unsigned event rejected once the policy requires signatures");
await audit.setTenantPolicy(tenant, { requireClientSig: false });

const er = await audit.erase(r1.id);
must(er.erased && er.audit.position === 3, "erasure is appended to the chain");
must((await audit.get(r1.id)).erased === true, "erased event has no payload");
must((await audit.verify({ tenant })).valid === true, "server-side verify VALID");
const dup = await audit.log({ tenant, actor: "u_4", action: "job.run", idempotencyKey: "smoke-1" });
const dup2 = await audit.log({ tenant, actor: "u_4", action: "job.run", idempotencyKey: "smoke-1" });
must(dup.id === dup2.id && dup2.duplicate === true, "idempotency replay returns the same receipt");

// Anchoring follows the project's plan cadence (free: daily after the first root). Wait one loop interval
// plus slack; if nothing is anchored by then, that is the plan, not a fault: verify what we have.
const waitMs = (wk.anchor_interval_seconds + 30) * 1000;
console.log(`     waiting up to ${Math.round(waitMs / 1000)}s for an anchor tick (plan cadence may be longer)…`);
let v;
for (let t = 0; t < waitMs; t += 5000) { v = await audit.verify({ tenant }); if (v.anchored_through >= 0) break; await new Promise((r) => setTimeout(r, 5000)); }
const anchored = v.anchored_through >= 0;
console.log(anchored ? `ok   anchored through position ${v.anchored_through}` : "     not anchored within the window (plan cadence); checking chain, signatures and roots only");
const lines = [];
for await (const l of audit.export({ tenant })) lines.push(l);
const report = await verifyExport(lines, { pinnedServerKey: wk.server_public_key, pinnedAnchorKey: wk.anchor_public_key });
must(report.verdict === (anchored ? "VALID" : "VALID_UNANCHORED"), `offline verifier: ${report.verdict} (${report.anchors.map((a) => `${a.kind}:${a.status}`).join(", ") || "no receipts yet"})`);
if (anchored) must(report.anchors.some((a) => a.kind === "rekor" && a.status === "verified"), "Rekor receipt verified offline, bound to the published anchor key");
const tampered = lines.map((l) => (l.type === "event" && l.position === 1 ? { ...l, actor: "evil" } : l));
must((await verifyExport(tampered, { pinnedServerKey: wk.server_public_key })).verdict === "INVALID", "tampered export is INVALID");
console.log("\nSMOKE PASSED against", baseUrl);
