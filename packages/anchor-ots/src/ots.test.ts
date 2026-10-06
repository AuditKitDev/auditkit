import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { AnchorReceipt } from "@auditkit/core";
import { OtsAnchor } from "./anchor.js";
import { urlInWhitelist } from "./calendar.js";
import {
  OpTag,
  addOp,
  allAttestations,
  bytesToHex,
  parseDetached,
  parseTimestamp,
  serializeDetached,
  serializeTimestamp,
  type Timestamp,
} from "./ots.js";

const fixture = (name: string) => Uint8Array.from(readFileSync(new URL(`../fixtures/${name}`, import.meta.url)));
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
const sha256 = (s: string) => createHash("sha256").update(s).digest();

// From javascript-opentimestamps/examples/hello-world.txt.ots: the first OTS proof, Bitcoin block 358391.
const helloOts = fixture("hello-world.txt.ots");
const helloRoot = sha256("Hello World!\n").toString("hex");
const block358391 = { merkleroot: "8a1b66ecb7cbd07d8139a7e7d7f2c41aab1f5009b8364aaf61d03ad245e47e00", time: 1432827678 };

// Stamped once against the public calendars with OtsAnchor.anchor(); see fixtures/pending.json.
const pendingOts = fixture("pending.ots");
const pendingMeta = JSON.parse(readFileSync(new URL("../fixtures/pending.json", import.meta.url), "utf8")) as {
  root: string;
  ref: string;
  anchored_at: string;
};
const pendingReceipt: AnchorReceipt = { kind: "ots", ref: pendingMeta.ref, proof: b64(pendingOts), anchored_at: pendingMeta.anchored_at, status: "pending" };

describe("ots codec", () => {
  it("parses the hello-world proof down to its Bitcoin attestation", () => {
    const d = parseDetached(helloOts);
    expect(d.hashOpTag).toBe(OpTag.SHA256);
    expect(bytesToHex(d.digest)).toBe(helloRoot);
    const atts = allAttestations(d.timestamp);
    expect(atts).toHaveLength(1);
    expect(atts[0]!.attestation).toEqual({ type: "bitcoin", height: 358391 });
    // The op path lands on the block's merkle root (header byte order).
    expect(bytesToHex(Uint8Array.from(atts[0]!.stamp.msg).reverse())).toBe(block358391.merkleroot);
  });

  it("parses the pending fixture to calendar attestations", () => {
    const d = parseDetached(pendingOts);
    expect(bytesToHex(d.digest)).toBe(pendingMeta.root);
    const uris = allAttestations(d.timestamp).map((a) => a.attestation).filter((a) => a.type === "pending");
    expect(uris.length).toBeGreaterThan(0);
    for (const a of uris) expect(a.type === "pending" && a.uri).toMatch(/^https:\/\//);
  });

  it("round-trips both fixtures byte for byte", () => {
    for (const bytes of [helloOts, pendingOts]) {
      expect(Buffer.from(serializeDetached(parseDetached(bytes))).equals(bytes)).toBe(true);
    }
  });

  it("round-trips varuints across the LEB128 boundaries", () => {
    for (const height of [0, 1, 127, 128, 300, 16383, 16384, 358391, 2 ** 40 + 5]) {
      const ts: Timestamp = { msg: sha256("x"), attestations: [{ type: "bitcoin", height }], ops: [] };
      const back = parseTimestamp(serializeTimestamp(ts), ts.msg);
      expect(back.attestations).toEqual([{ type: "bitcoin", height }]);
    }
  });

  it("rejects garbage", () => {
    expect(() => parseDetached(helloOts.slice(0, 40))).toThrow(/end of data/);
    expect(() => parseDetached(Uint8Array.from(Buffer.from("not an ots file, just forty bytes of txt")))).toThrow(/magic/);
    expect(() => parseDetached(Uint8Array.from([...helloOts, 0x00]))).toThrow(/trailing/);
  });

  it("matches calendar whitelist globs", () => {
    const wl = ["https://*.calendar.opentimestamps.org"];
    expect(urlInWhitelist("https://alice.btc.calendar.opentimestamps.org", wl)).toBe(true);
    expect(urlInWhitelist("http://alice.btc.calendar.opentimestamps.org", wl)).toBe(false);
    expect(urlInWhitelist("https://evil.example/calendar.opentimestamps.org", wl)).toBe(false);
  });
});

describe("OtsAnchor.verify", () => {
  const helloReceipt: AnchorReceipt = { kind: "ots", ref: "", proof: b64(helloOts), anchored_at: "2015-05-28T15:41:18.000Z", status: "final" };

  it("verifies a final proof against an injected block header", async () => {
    const a = new OtsAnchor({ getBlockHeader: async (h) => (h === 358391 ? block358391 : Promise.reject(new Error("no"))) });
    expect(await a.verify(helloRoot, helloReceipt)).toEqual({
      ok: true,
      level: "bitcoin",
      block_height: 358391,
      attested_at: "2015-05-28T15:41:18.000Z",
    });
  });

  it("fails when the block header merkle root differs", async () => {
    const a = new OtsAnchor({ getBlockHeader: async () => ({ merkleroot: "00".repeat(32) }) });
    expect(await a.verify(helloRoot, helloReceipt)).toEqual({ ok: false, reason: "merkle root mismatch at bitcoin block 358391" });
  });

  it("refuses to call Bitcoin-level without a header source and says why", async () => {
    const r = await new OtsAnchor().verify(helloRoot, helloReceipt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no block header source/);
  });

  it("fails on the wrong digest", async () => {
    const wrong = sha256("Hello World?\n").toString("hex");
    const r = await new OtsAnchor({ getBlockHeader: async () => block358391 }).verify(wrong, helloReceipt);
    expect(r).toEqual({ ok: false, reason: "proof is for a different digest than root" });
  });

  it("verifies a pending proof at calendar level offline", async () => {
    const r = await new OtsAnchor().verify(pendingMeta.root, pendingReceipt);
    expect(r.ok).toBe(true);
    if (r.ok && r.level === "calendar") {
      expect(r.attested_at).toBe(pendingMeta.anchored_at);
      expect(r.calendars.length).toBeGreaterThan(0);
      expect(r.unchecked_bitcoin_heights).toEqual([]);
    } else {
      throw new Error("expected calendar level");
    }
  });

  it("rejects a pending proof for a different root, a corrupt proof, and a bogus final", async () => {
    const a = new OtsAnchor();
    const flipped = (pendingMeta.root[0] === "0" ? "1" : "0") + pendingMeta.root.slice(1);
    expect(await a.verify(flipped, pendingReceipt)).toEqual({ ok: false, reason: "proof is for a different digest than root" });
    const corrupt = { ...pendingReceipt, proof: b64(pendingOts.slice(0, pendingOts.length - 3)) };
    const r = await a.verify(pendingMeta.root, corrupt);
    expect(r.ok).toBe(false);
    expect(await a.verify(pendingMeta.root, { ...pendingReceipt, status: "final" })).toEqual({
      ok: false,
      reason: "receipt says final but the proof has no Bitcoin attestation",
    });
  });
});

describe("OtsAnchor anchor -> upgrade -> verify against a fake calendar", () => {
  const CAL = "https://fake.calendar.test";
  // The fake calendar hashes what it receives with a tag and promises a Bitcoin block.
  const calendarMsgFor = (submitted: Uint8Array) => {
    const ts: Timestamp = { msg: submitted, attestations: [], ops: [] };
    const leaf = addOp(addOp(ts, { tag: OpTag.APPEND, arg: Uint8Array.from(Buffer.from("cal")) }), { tag: OpTag.SHA256 });
    return { ts, leaf };
  };
  let upgraded = false;
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === `${CAL}/digest` && init?.method === "POST") {
      const submitted = new Uint8Array(init.body as Uint8Array);
      const { ts, leaf } = calendarMsgFor(submitted);
      leaf.attestations.push({ type: "pending", uri: CAL });
      return new Response(serializeTimestamp(ts));
    }
    const m = url.match(new RegExp(`^${CAL}/timestamp/([0-9a-f]+)$`));
    if (m && init?.method === "GET") {
      if (!upgraded) return new Response("Pending confirmation in Bitcoin blockchain", { status: 404 });
      const commitment = Uint8Array.from(Buffer.from(m[1]!, "hex"));
      const ts: Timestamp = { msg: commitment, attestations: [], ops: [] };
      addOp(ts, { tag: OpTag.PREPEND, arg: Uint8Array.from(Buffer.from("block")) }).attestations.push({ type: "bitcoin", height: 7 });
      return new Response(serializeTimestamp(ts));
    }
    return new Response("nope", { status: 500 });
  };

  it("runs the full loop", async () => {
    const root = sha256("some tenant root").toString("hex");
    const a = new OtsAnchor({
      calendars: [CAL],
      fetch: fakeFetch,
      getBlockHeader: async (height) => {
        // Expected merkle root = sha256(sha256(root||nonce)||"cal") prepended with "block"; recover it from the proof.
        expect(height).toBe(7);
        return { merkleroot: expectedMerkleRoot!, time: 1_700_000_000 };
      },
    });
    const pending = await a.anchor(root);
    expect(pending.status).toBe("pending");
    expect(pending.ref).toBe(CAL);
    const v1 = await a.verify(root, pending);
    expect(v1.ok && v1.level === "calendar" && v1.calendars).toEqual([CAL]);

    expect(await a.upgrade(pending)).toBe(pending); // calendar still 404s

    upgraded = true;
    const final = await a.upgrade(pending);
    expect(final.status).toBe("final");
    expect(final.proof).not.toBe(pending.proof);
    expect(final.anchored_at).toBe(pending.anchored_at);

    const bitcoinNode = allAttestations(parseDetached(Buffer.from(final.proof, "base64")).timestamp).find((x) => x.attestation.type === "bitcoin")!;
    expect(bitcoinNode.stamp.msg).toHaveLength(37); // "block" + 32: the fake chain is not real Bitcoin
    // Bitcoin-level check needs a 32-byte node; prove the mismatch path first, then the happy path with a 32-byte tree.
    const bad = await a.verify(root, final);
    expect(bad).toEqual({ ok: false, reason: "bitcoin attestation at height 7 is over 37 bytes, not 32" });

    // Re-run with a calendar that returns a 32-byte commitment path.
    upgraded = false;
    expectedMerkleRoot = undefined;
    const fetch32: typeof fetch = async (input, init) => {
      const url = String(input);
      const m = url.match(new RegExp(`^${CAL}/timestamp/([0-9a-f]+)$`));
      if (m && init?.method === "GET" && upgraded) {
        const commitment = Uint8Array.from(Buffer.from(m[1]!, "hex"));
        const ts: Timestamp = { msg: commitment, attestations: [], ops: [] };
        const node = addOp(addOp(ts, { tag: OpTag.APPEND, arg: Uint8Array.from(Buffer.from("sibling")) }), { tag: OpTag.SHA256 });
        node.attestations.push({ type: "bitcoin", height: 7 });
        expectedMerkleRoot = bytesToHex(Uint8Array.from(node.msg).reverse());
        return new Response(serializeTimestamp(ts));
      }
      return fakeFetch(input, init);
    };
    const b = new OtsAnchor({ calendars: [CAL], fetch: fetch32, getBlockHeader: async () => ({ merkleroot: expectedMerkleRoot!, time: 1_700_000_000 }) });
    const p2 = await b.anchor(root);
    upgraded = true;
    const f2 = await b.upgrade(p2);
    expect(f2.status).toBe("final");
    expect(await b.verify(root, f2)).toEqual({ ok: true, level: "bitcoin", block_height: 7, attested_at: "2023-11-14T22:13:20.000Z" });
    expect(await b.verify(root, { ...f2, status: "pending" })).toMatchObject({ ok: true, level: "bitcoin" });
    const c = new OtsAnchor({ calendars: [CAL], fetch: fetch32 });
    expect(await c.verify(root, f2)).toMatchObject({ ok: true, level: "calendar", unchecked_bitcoin_heights: [7] });
  });
  let expectedMerkleRoot: string | undefined;
});
