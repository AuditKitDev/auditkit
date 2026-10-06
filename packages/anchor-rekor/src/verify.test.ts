import { createPublicKey, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RekorAnchor } from "./rekor.js";
import { verifyRekorReceipt } from "./verify.js";
import { decodeProof, encodeProof } from "./proof.js";
import { loadFixture } from "./fixtures.js";

function withProof(receipt: ReturnType<typeof loadFixture>["receipt"], edit: (p: ReturnType<typeof decodeProof>) => void) {
  const p = decodeProof(receipt.proof);
  edit(p);
  return { ...receipt, proof: encodeProof(p) };
}

for (const api of [2, 1] as const) {
  describe(`offline verification of a real Rekor v${api} receipt`, () => {
    const fx = loadFixture(api);

    it("accepts the receipt with no network and no keys", async () => {
      const v = await verifyRekorReceipt(fx.root, fx.receipt);
      expect(v).toEqual({ ok: true, attested_at: expect.any(String) });
    });

    it("accepts the receipt through RekorAnchor.verify with the signer's public key", async () => {
      const anchor = new RekorAnchor({ publicKey: createPublicKey(fx.publicKeyPem) });
      expect((await anchor.verify(fx.root, fx.receipt)).ok).toBe(true);
    });

    it("rejects a different root", async () => {
      const other = fx.root.replace(/^./, fx.root.startsWith("0") ? "1" : "0");
      const v = await verifyRekorReceipt(other, fx.receipt);
      expect(v).toEqual({ ok: false, reason: "entry digest does not match root" });
    });

    it("rejects a tampered digest inside the entry body", async () => {
      const tampered = withProof(fx.receipt, (p) => {
        const body = JSON.parse(Buffer.from(p.body, "base64").toString()) as Record<string, unknown>;
        const text = JSON.stringify(body);
        const digest = api === 2 ? (body as { spec: { hashedRekordV002: { data: { digest: string } } } }).spec.hashedRekordV002.data.digest : (body as { spec: { data: { hash: { value: string } } } }).spec.data.hash.value;
        const flipped = api === 2 ? Buffer.from(digest, "base64").map((b, i) => (i === 0 ? b ^ 1 : b)) : Buffer.from(digest, "hex").map((b, i) => (i === 0 ? b ^ 1 : b));
        const replacement = api === 2 ? Buffer.from(flipped).toString("base64") : Buffer.from(flipped).toString("hex");
        p.body = Buffer.from(text.replace(digest, replacement)).toString("base64");
      });
      const v = await verifyRekorReceipt(fx.root, tampered);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.reason).toMatch(/digest does not match root/);
    });

    it("rejects an inclusion proof pointing at another leaf index", async () => {
      const tampered = withProof(fx.receipt, (p) => {
        p.proofIndex -= 1;
      });
      const v = await verifyRekorReceipt(fx.root, tampered);
      expect(v).toEqual({ ok: false, reason: "inclusion proof does not reach the checkpoint root" });
    });

    it("rejects a checkpoint with a forged root hash", async () => {
      const tampered = withProof(fx.receipt, (p) => {
        const lines = p.checkpoint.split("\n");
        lines[2] = Buffer.alloc(32, 7).toString("base64");
        p.checkpoint = lines.join("\n");
      });
      const v = await verifyRekorReceipt(fx.root, tampered);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.reason).toMatch(/checkpoint signature does not verify/);
    });

    it("rejects the receipt when the caller expects a different signing key", async () => {
      const { publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
      const v = await verifyRekorReceipt(fx.root, fx.receipt, { expectPublicKey: publicKey });
      expect(v).toEqual({ ok: false, reason: "entry was signed by a different key than expected" });
    });

    it("rejects a receipt of another kind", async () => {
      const v = await verifyRekorReceipt(fx.root, { ...fx.receipt, kind: "ots" });
      expect(v.ok).toBe(false);
    });
  });
}

describe("RekorAnchor construction", () => {
  it("rejects non-P-256 keys", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    expect(() => new RekorAnchor({ privateKey, publicKey })).toThrow(/P-256/);
  });

  it("upgrade returns the receipt unchanged", async () => {
    const fx = loadFixture(2);
    expect(await new RekorAnchor().upgrade(fx.receipt)).toBe(fx.receipt);
  });
});
