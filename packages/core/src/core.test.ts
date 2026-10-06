import { describe, it, expect } from "vitest";
import { canonicalize } from "./jcs.js";
import { GENESIS, randomSalt, sha256Hex } from "./hash.js";
import { chainEvent, commitPayload, verifyChain, type ChainedEvent } from "./chain.js";
import { buildTree, proofFor, verifyProof } from "./merkle.js";

describe("jcs", () => {
  it("sorts keys at every level", () => {
    const a = canonicalize({ b: { z: 1, a: [3, { y: 2, x: 1 }] }, a: "x" });
    const b = canonicalize({ a: "x", b: { a: [3, { x: 1, y: 2 }], z: 1 } });
    expect(a).toBe(b);
    expect(a).toBe('{"a":"x","b":{"a":[3,{"x":1,"y":2}],"z":1}}');
  });
  it("matches the RFC 8785 number and string rules", () => {
    expect(canonicalize({ n: 1e21, m: 1.0, s: "€\n" })).toBe('{"m":1,"n":1e+21,"s":"€\\n"}');
  });
  it("drops undefined keys and rejects NaN", () => {
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(() => canonicalize({ a: NaN })).toThrow();
  });
});

function makeChain(n: number, tenant = "t1"): ChainedEvent[] {
  const out: ChainedEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      chainEvent(
        {
          id: `ev_${i}`,
          project_id: "p1",
          tenant_id: tenant,
          position: i,
          occurred_at: new Date(1700000000000 + i * 1000).toISOString(),
          actor: "u_1",
          action: "thing.do",
          target: i % 2 ? `obj_${i}` : null,
          payload_commit: commitPayload(randomSalt(), { i }),
        },
        out[i - 1] ?? null,
      ),
    );
  }
  return out;
}

describe("chain", () => {
  it("verifies an honest chain", () => {
    const c = makeChain(50);
    expect(verifyChain(c)).toEqual({ valid: true, count: 50, head: c[49]!.event_hash });
  });
  it("verifies a mid-chain slice given the prior hash", () => {
    const c = makeChain(20);
    expect(verifyChain(c.slice(5, 15), c[4]!.event_hash).valid).toBe(true);
    expect(verifyChain(c.slice(5, 15)).valid).toBe(false);
  });
  it("detects an edited field", () => {
    const c = makeChain(10);
    c[3] = { ...c[3]!, actor: "u_evil" };
    expect(verifyChain(c)).toMatchObject({ valid: false, position: 3, reason: expect.stringContaining("event_hash") });
  });
  it("detects a deleted event", () => {
    const c = makeChain(10);
    c.splice(4, 1);
    expect(verifyChain(c)).toMatchObject({ valid: false, position: 5, reason: expect.stringContaining("gap") });
  });
  it("detects a truncated tail when the expected head is known", () => {
    const c = makeChain(10);
    const v = verifyChain(c.slice(0, 7));
    expect(v.valid && v.head).not.toBe(c[9]!.event_hash);
  });
  it("detects a reordered pair", () => {
    const c = makeChain(10);
    const tmp = c[5]!;
    c[5] = { ...c[6]!, position: 5 };
    c[6] = { ...tmp, position: 6 };
    expect(verifyChain(c).valid).toBe(false);
  });
  it("detects a re-hashed rewrite that forgets the downstream links", () => {
    const c = makeChain(10);
    const { event_hash: _old, ...hdr } = c[2]!;
    const rewritten = chainEvent({ ...hdr, actor: "u_evil" }, c[1]!);
    c[2] = rewritten;
    expect(verifyChain(c)).toMatchObject({ valid: false, position: 3, reason: expect.stringContaining("prev_hash") });
  });
  it("payload commit changes with payload and salt, and erasure keeps the chain valid", () => {
    const salt = randomSalt();
    expect(commitPayload(salt, { a: 1 })).not.toBe(commitPayload(salt, { a: 2 }));
    expect(commitPayload(salt, { a: 1 })).not.toBe(commitPayload(randomSalt(), { a: 1 }));
    const c = makeChain(5);
    // Erasure deletes payload+salt elsewhere; the header's commit stays, so the chain is unchanged.
    expect(verifyChain(c).valid).toBe(true);
  });
  it("refuses a bad first position", () => {
    expect(() =>
      chainEvent(
        { id: "x", project_id: "p", tenant_id: "t", position: 3, occurred_at: "2024-01-01T00:00:00.000Z", actor: "a", action: "b", target: null, payload_commit: sha256Hex("") },
        null,
      ),
    ).toThrow();
    expect(GENESIS).toHaveLength(64);
  });
});

describe("merkle", () => {
  it("proves every leaf for sizes 1..17", () => {
    for (let n = 1; n <= 17; n++) {
      const hashes = Array.from({ length: n }, (_, i) => sha256Hex(`leaf${i}`));
      const tree = buildTree(hashes);
      for (let i = 0; i < n; i++) {
        expect(verifyProof(hashes[i]!, proofFor(tree, i), tree.root)).toBe(true);
      }
      // wrong leaf fails
      expect(verifyProof(sha256Hex("nope"), proofFor(tree, 0), tree.root)).toBe(false);
    }
  });
  it("a node hash cannot be passed off as a leaf", () => {
    const hashes = [sha256Hex("a"), sha256Hex("b"), sha256Hex("c"), sha256Hex("d")];
    const tree = buildTree(hashes);
    const interior = tree.levels[1]![0]!;
    expect(verifyProof(interior, [{ hash: tree.levels[1]![1]!, side: "right" }], tree.root)).toBe(false);
  });
  it("n and n+1 leaves do not share a root", () => {
    const h = Array.from({ length: 3 }, (_, i) => sha256Hex(`x${i}`));
    expect(buildTree(h).root).not.toBe(buildTree([...h, h[2]!]).root);
  });
});
