import { describe, expect, it } from "vitest";
import { leafHash, nodeHash, rootFromInclusionProof } from "./rfc6962.js";
import { parseCheckpoint } from "./checkpoint.js";
import { decodeProof } from "./proof.js";
import { loadFixture } from "./fixtures.js";

describe("RFC 6962 hashing", () => {
  it("matches the RFC 6962 empty-leaf test vector", () => {
    expect(leafHash(Buffer.alloc(0)).toString("hex")).toBe("6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d");
  });

  it("verifies every leaf of a hand-built 5-leaf tree", () => {
    const leaves = ["a", "b", "c", "d", "e"].map((s) => leafHash(Buffer.from(s)));
    const [a, b, c, d, e] = leaves as [Buffer, Buffer, Buffer, Buffer, Buffer];
    const ab = nodeHash(a, b);
    const cd = nodeHash(c, d);
    const abcd = nodeHash(ab, cd);
    const root = nodeHash(abcd, e);
    const proofs: Buffer[][] = [[b, cd, e], [a, cd, e], [d, ab, e], [c, ab, e], [abcd]];
    proofs.forEach((proof, i) => {
      expect(rootFromInclusionProof(leaves[i]!, BigInt(i), 5n, proof).equals(root)).toBe(true);
    });
    expect(rootFromInclusionProof(a, 0n, 5n, [b, cd, d]).equals(root)).toBe(false);
  });

  it("rejects proofs with the wrong length or index", () => {
    const a = leafHash(Buffer.from("a"));
    expect(() => rootFromInclusionProof(a, 0n, 5n, [a, a])).toThrow(/expected 3/);
    expect(() => rootFromInclusionProof(a, 5n, 5n, [])).toThrow(/out of range/);
  });
});

describe("inclusion proof against real Rekor entries", () => {
  for (const api of [2, 1] as const) {
    it(`v${api} fixture reaches the checkpoint root`, () => {
      const proof = decodeProof(loadFixture(api).receipt.proof);
      const cp = parseCheckpoint(proof.checkpoint);
      const leaf = leafHash(Buffer.from(proof.body, "base64"));
      const hashes = proof.hashes.map((h) => Buffer.from(h, "base64"));
      expect(rootFromInclusionProof(leaf, BigInt(proof.proofIndex), cp.treeSize, hashes).equals(cp.rootHash)).toBe(true);
    });

    it(`v${api} fixture with a tampered body does not reach the root`, () => {
      const proof = decodeProof(loadFixture(api).receipt.proof);
      const cp = parseCheckpoint(proof.checkpoint);
      const body = Buffer.from(proof.body, "base64");
      body[body.length - 3]! ^= 0x01;
      const hashes = proof.hashes.map((h) => Buffer.from(h, "base64"));
      expect(rootFromInclusionProof(leafHash(body), BigInt(proof.proofIndex), cp.treeSize, hashes).equals(cp.rootHash)).toBe(false);
    });
  }
});
