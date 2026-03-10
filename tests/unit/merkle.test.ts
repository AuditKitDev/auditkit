import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { buildMerkleTree, generateProof, verifyProof } from '../../apps/api/src/services/merkle.js';

function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hashPair(a: string, b: string): string {
  return createHash('sha256').update(a + b).digest('hex');
}

describe('buildMerkleTree', () => {
  it('returns empty root for empty array', () => {
    const { root, tree } = buildMerkleTree([]);
    expect(root).toBe('');
    expect(tree).toEqual([]);
  });

  it('returns single hash as root for single element', () => {
    const h = hash('leaf_0');
    const { root, tree } = buildMerkleTree([h]);
    expect(root).toBe(h);
    expect(tree).toEqual([[h]]);
  });

  it('builds correct tree for 2 leaves', () => {
    const a = hash('a');
    const b = hash('b');
    const { root, tree } = buildMerkleTree([a, b]);
    expect(tree[0]).toEqual([a, b]);
    expect(root).toBe(hashPair(a, b));
    expect(tree.length).toBe(2);
  });

  it('builds correct tree for 4 leaves', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(hash);
    const { root, tree } = buildMerkleTree(leaves);
    expect(tree[0]).toEqual(leaves);
    const ab = hashPair(leaves[0], leaves[1]);
    const cd = hashPair(leaves[2], leaves[3]);
    expect(tree[1]).toEqual([ab, cd]);
    expect(root).toBe(hashPair(ab, cd));
  });

  it('handles odd number of leaves (duplicates last)', () => {
    const leaves = ['a', 'b', 'c'].map(hash);
    const { root, tree } = buildMerkleTree(leaves);
    expect(tree[0]).toEqual(leaves);
    const ab = hashPair(leaves[0], leaves[1]);
    const cc = hashPair(leaves[2], leaves[2]); // duplicate
    expect(tree[1]).toEqual([ab, cc]);
    expect(root).toBe(hashPair(ab, cc));
  });

  it('handles 8 leaves correctly', () => {
    const leaves = Array.from({ length: 8 }, (_, i) => hash(`leaf_${i}`));
    const { root, tree } = buildMerkleTree(leaves);
    expect(tree[0].length).toBe(8);
    expect(tree[1].length).toBe(4);
    expect(tree[2].length).toBe(2);
    expect(tree[3].length).toBe(1);
    expect(root).toBe(tree[3][0]);
  });
});

describe('generateProof', () => {
  it('returns empty proof for empty tree', () => {
    expect(generateProof([], 0)).toEqual([]);
  });

  it('generates proof for leaf in 4-element tree', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(hash);
    const { tree } = buildMerkleTree(leaves);
    const proof = generateProof(tree, 0);
    expect(proof.length).toBe(2); // log2(4) levels
    expect(proof[0].hash).toBe(leaves[1]); // sibling at level 0
    expect(proof[0].position).toBe('right');
  });

  it('proof for rightmost leaf has correct position', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(hash);
    const { tree } = buildMerkleTree(leaves);
    const proof = generateProof(tree, 3);
    expect(proof[0].position).toBe('left'); // sibling c is to the left
    expect(proof[0].hash).toBe(leaves[2]);
  });
});

describe('verifyProof', () => {
  it('returns false for empty leaf', () => {
    expect(verifyProof('', [], 'abc')).toBe(false);
  });

  it('returns false for empty root', () => {
    expect(verifyProof('abc', [], '')).toBe(false);
  });

  it('returns true for single-leaf tree', () => {
    const h = hash('only');
    expect(verifyProof(h, [], h)).toBe(true);
  });

  it('verifies correct proof for each leaf in 4-element tree', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(hash);
    const { root, tree } = buildMerkleTree(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = generateProof(tree, i);
      expect(verifyProof(leaves[i], proof, root)).toBe(true);
    }
  });

  it('verifies correct proof for odd-count tree', () => {
    const leaves = ['x', 'y', 'z'].map(hash);
    const { root, tree } = buildMerkleTree(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = generateProof(tree, i);
      expect(verifyProof(leaves[i], proof, root)).toBe(true);
    }
  });

  it('rejects proof with wrong leaf', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(hash);
    const { root, tree } = buildMerkleTree(leaves);
    const proof = generateProof(tree, 0);
    expect(verifyProof(hash('wrong'), proof, root)).toBe(false);
  });

  it('rejects proof with wrong root', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(hash);
    const { tree } = buildMerkleTree(leaves);
    const proof = generateProof(tree, 0);
    expect(verifyProof(leaves[0], proof, hash('wrong_root'))).toBe(false);
  });

  it('verifies large tree (100 leaves)', () => {
    const leaves = Array.from({ length: 100 }, (_, i) => hash(`leaf_${i}`));
    const { root, tree } = buildMerkleTree(leaves);
    // Verify a few random leaves
    for (const idx of [0, 42, 99]) {
      const proof = generateProof(tree, idx);
      expect(verifyProof(leaves[idx], proof, root)).toBe(true);
    }
  });
});
