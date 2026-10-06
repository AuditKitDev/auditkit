// RFC 6962 Merkle tree hashing and inclusion-proof verification, as used by
// Rekor v1 (trillian) and Rekor v2 (tessera). Leaf = SHA-256(0x00 || data),
// node = SHA-256(0x01 || left || right).
import { createHash } from "node:crypto";

export function leafHash(data: Uint8Array): Buffer {
  return createHash("sha256").update(Buffer.from([0x00])).update(data).digest();
}

export function nodeHash(left: Uint8Array, right: Uint8Array): Buffer {
  return createHash("sha256").update(Buffer.from([0x01])).update(left).update(right).digest();
}

function bitLen(n: bigint): number {
  let len = 0;
  while (n > 0n) {
    n >>= 1n;
    len++;
  }
  return len;
}

function popCount(n: bigint): number {
  let c = 0;
  while (n > 0n) {
    c += Number(n & 1n);
    n >>= 1n;
  }
  return c;
}

/**
 * Recompute the tree root from a leaf hash and its inclusion proof
 * (transparency-dev/merkle `VerifyInclusion` algorithm). Throws on a
 * structurally invalid proof; the caller compares the result to the
 * checkpoint's root.
 */
export function rootFromInclusionProof(
  leaf: Uint8Array,
  index: bigint,
  treeSize: bigint,
  hashes: Uint8Array[],
): Buffer {
  if (index < 0n || treeSize <= 0n || index >= treeSize) {
    throw new Error(`leaf index ${index} out of range for tree size ${treeSize}`);
  }
  const inner = bitLen(index ^ (treeSize - 1n));
  const border = popCount(index >> BigInt(inner));
  if (hashes.length !== inner + border) {
    throw new Error(`inclusion proof has ${hashes.length} hashes, expected ${inner + border}`);
  }
  let acc: Buffer = Buffer.from(leaf);
  for (let i = 0; i < inner; i++) {
    const sibling = hashes[i]!;
    acc = (index >> BigInt(i)) & 1n ? nodeHash(sibling, acc) : nodeHash(acc, sibling);
  }
  for (let i = inner; i < hashes.length; i++) {
    acc = nodeHash(hashes[i]!, acc);
  }
  return acc;
}
