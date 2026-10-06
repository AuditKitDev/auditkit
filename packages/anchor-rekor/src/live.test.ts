// Writes a real entry to the public Sigstore Rekor log. Run with REKOR_LIVE=1.
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RekorAnchor } from "./rekor.js";
import { decodeProof } from "./proof.js";
import { verifyRekorReceipt } from "./verify.js";

describe.skipIf(!process.env["REKOR_LIVE"])("live Rekor", () => {
  it("anchors a random sha256 and verifies it offline", { timeout: 120_000 }, async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const anchor = new RekorAnchor({ privateKey, publicKey });
    const root = randomBytes(32).toString("hex");
    const receipt = await anchor.anchor(root);
    const proof = decodeProof(receipt.proof);
    console.log(`REKOR_LIVE api=v${proof.api} ref=${receipt.ref} logIndex=${proof.logIndex} treeSize=${proof.treeSize} root=${root}`);
    expect(receipt.status).toBe("final");

    // Offline: a verifier with no keys, no network, only the root and the receipt.
    const offline = await verifyRekorReceipt(root, receipt, {
      fetch: (() => {
        throw new Error("network used during offline verify");
      }) as unknown as typeof fetch,
    });
    expect(offline.ok).toBe(true);
    expect((await anchor.verify(root, receipt)).ok).toBe(true);
    const wrong = await anchor.verify(randomBytes(32).toString("hex"), receipt);
    expect(wrong.ok).toBe(false);

    const online = await anchor.verify(root, receipt, { online: true });
    expect(online.ok).toBe(true);
  });
});
