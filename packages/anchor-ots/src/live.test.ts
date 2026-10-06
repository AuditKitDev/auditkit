// Talks to the real public calendars and mempool.space. Run with OTS_LIVE=1.
import { describe, it, expect } from "vitest";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { OtsAnchor, DEFAULT_CALENDARS } from "./anchor.js";
import { allAttestations, parseDetached } from "./ots.js";

describe.skipIf(!process.env["OTS_LIVE"])("live OpenTimestamps", () => {
  it("stamps a random digest, verifies offline, and upgrade stays pending", { timeout: 60_000 }, async () => {
    const root = randomBytes(32).toString("hex");
    const a = new OtsAnchor();
    const receipt = await a.anchor(root);
    const accepted = receipt.ref.split(",");
    console.log("calendars that accepted:", accepted);
    for (const url of accepted) expect(DEFAULT_CALENDARS).toContain(url);
    expect(receipt.status).toBe("pending");
    const uris = allAttestations(parseDetached(Buffer.from(receipt.proof, "base64")).timestamp).map((x) => x.attestation);
    console.log("attestations:", JSON.stringify(uris));
    const v = await a.verify(root, receipt);
    console.log("verify:", JSON.stringify(v));
    expect(v).toMatchObject({ ok: true, stage: "calendar" });
    const up = await a.upgrade(receipt);
    console.log("upgrade right after stamping ->", up.status);
    expect(up.status).toBe("pending");
  });

  it("verifies the hello-world proof to Bitcoin via a public explorer", { timeout: 60_000 }, async () => {
    const proof = readFileSync(new URL("../fixtures/hello-world.txt.ots", import.meta.url)).toString("base64");
    const root = createHash("sha256").update("Hello World!\n").digest("hex");
    const v = await new OtsAnchor({ online: true }).verify(root, { kind: "ots", ref: "", proof, anchored_at: "", status: "final" });
    console.log("online verify:", JSON.stringify(v));
    expect(v).toEqual({ ok: true, stage: "bitcoin", block_height: 358391, attested_at: "2015-05-28T15:41:18.000Z" });
  });
});
