// Merkle tree over event hashes, RFC 6962 style: leaves and interior nodes use
// different hash prefixes so a node can never be presented as a leaf.
import { sha256Hex, type Hex } from "./hash.js";

const LEAF = "00";
const NODE = "01";

export function leafHash(eventHash: Hex): Hex {
  return sha256Hex(Buffer.from(LEAF + eventHash, "hex"));
}

function nodeHash(left: Hex, right: Hex): Hex {
  return sha256Hex(Buffer.from(NODE + left + right, "hex"));
}

export interface ProofStep {
  hash: Hex;
  side: "left" | "right"; // side the sibling sits on
}

export interface MerkleTree {
  root: Hex;
  levels: Hex[][]; // levels[0] are leaf hashes
}

export function buildTree(eventHashes: Hex[]): MerkleTree {
  if (eventHashes.length === 0) throw new Error("merkle: empty tree");
  const levels: Hex[][] = [eventHashes.map(leafHash)];
  while (levels[levels.length - 1]!.length > 1) {
    const cur = levels[levels.length - 1]!;
    const next: Hex[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const l = cur[i]!;
      // Odd node carries up unchanged (RFC 6962), never duplicated, so a tree of n
      // and a tree of n+1 leaves cannot collide on the duplicated leaf.
      next.push(i + 1 < cur.length ? nodeHash(l, cur[i + 1]!) : l);
    }
    levels.push(next);
  }
  return { root: levels[levels.length - 1]![0]!, levels };
}

export function proofFor(tree: MerkleTree, index: number): ProofStep[] {
  const steps: ProofStep[] = [];
  let i = index;
  for (let lvl = 0; lvl < tree.levels.length - 1; lvl++) {
    const layer = tree.levels[lvl]!;
    const sib = i % 2 === 1 ? i - 1 : i + 1;
    if (sib < layer.length) steps.push({ hash: layer[sib]!, side: i % 2 === 1 ? "left" : "right" });
    i = Math.floor(i / 2);
  }
  return steps;
}

export function verifyProof(eventHashValue: Hex, proof: ProofStep[], root: Hex): boolean {
  let h = leafHash(eventHashValue);
  for (const step of proof) {
    h = step.side === "left" ? nodeHash(step.hash, h) : nodeHash(h, step.hash);
  }
  return h === root;
}
