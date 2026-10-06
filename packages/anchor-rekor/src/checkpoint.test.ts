import { describe, expect, it } from "vitest";
import { checkpointKeyId, parseCheckpoint, verifyCheckpoint } from "./checkpoint.js";
import { EMBEDDED_LOG_KEYS, REKOR_V1_LOG, REKOR_V2_LOG } from "./keys.js";
import { decodeProof } from "./proof.js";
import { loadFixture } from "./fixtures.js";

const V2_ENVELOPE =
  "log2025-1.rekor.sigstore.dev\n139911860\nEliTHtnx44DhEBH+5qIXBtQsSpc54Avam7mIYEvxnTA=\n\n" +
  "— log2025-1.rekor.sigstore.dev zxGZFcOra4Y7QpuiQen+CmnUvDZbxSXfBOXJzL+HKIeR9aC58QTfao58ABqkhVyBhQDseS+TZdDNpcnZhoRxkh7IbQ0=\n" +
  "— witness.stagemole.eu Z/euoAAAAABqxF18wrJCADsJ1G5Lc2JaRjZqqBwjpNqH24yQse4iJ4rKS6b5MtvHP+IbKYXwaWuWokdGA+BubLFi+TrwK7xpKr6XBw==\n";

describe("checkpoint parsing", () => {
  it("parses origin, size, root and every signature line", () => {
    const cp = parseCheckpoint(V2_ENVELOPE);
    expect(cp.origin).toBe("log2025-1.rekor.sigstore.dev");
    expect(cp.treeSize).toBe(139911860n);
    expect(cp.rootHash.toString("base64")).toBe("EliTHtnx44DhEBH+5qIXBtQsSpc54Avam7mIYEvxnTA=");
    expect(cp.text).toBe("log2025-1.rekor.sigstore.dev\n139911860\nEliTHtnx44DhEBH+5qIXBtQsSpc54Avam7mIYEvxnTA=\n");
    expect(cp.signatures.map((s) => s.name)).toEqual(["log2025-1.rekor.sigstore.dev", "witness.stagemole.eu"]);
    expect(cp.signatures[0]!.keyId.toString("hex")).toBe("cf119915");
    expect(cp.signatures[0]!.signature.length).toBe(64);
  });

  it("rejects malformed envelopes", () => {
    expect(() => parseCheckpoint("origin\n1\nabc\n")).toThrow(/blank line/);
    expect(() => parseCheckpoint("origin\nx\nAAAA\n\n— o AAAAAAAA\n")).toThrow(/tree size/);
    expect(() => parseCheckpoint("origin\n1\nAAAA\n\n— o AAAAAAAA\n")).toThrow(/32 bytes/);
    expect(() => parseCheckpoint(`origin\n1\n${Buffer.alloc(32).toString("base64")}\n\n`)).toThrow(/no signatures/);
  });

  it("derives key ids that match Sigstore's trusted root logId and the signature lines", () => {
    // trusted_root.json tlogs[].logId.keyId for each instance
    expect(checkpointKeyId(REKOR_V2_LOG).toString("base64")).toBe("zxGZFVvd0FEmjR8WrFwMdcAJ9vtaY/QXf44Y1wUeP6A=");
    expect(checkpointKeyId(REKOR_V1_LOG).toString("base64")).toBe("wNI9atQGlz+VWfO6LRygH4QUfY/8W4RFwiT5i5WRgB0=");
  });

  it("verifies the log signature on a real v2 checkpoint", () => {
    const cp = parseCheckpoint(V2_ENVELOPE);
    expect(verifyCheckpoint(cp, EMBEDDED_LOG_KEYS)).toBe(REKOR_V2_LOG);
  });

  it("verifies the ECDSA log signature on a real v1 checkpoint", () => {
    const cp = parseCheckpoint(decodeProof(loadFixture(1).receipt.proof).checkpoint);
    expect(cp.origin.startsWith("rekor.sigstore.dev - ")).toBe(true);
    expect(verifyCheckpoint(cp, EMBEDDED_LOG_KEYS)).toBe(REKOR_V1_LOG);
  });

  it("rejects a checkpoint whose tree size was edited", () => {
    const cp = parseCheckpoint(V2_ENVELOPE.replace("139911860", "139911861"));
    expect(verifyCheckpoint(cp, EMBEDDED_LOG_KEYS)).toBeNull();
  });

  it("rejects a checkpoint signed by an unknown key", () => {
    const cp = parseCheckpoint(V2_ENVELOPE);
    expect(verifyCheckpoint(cp, [REKOR_V1_LOG])).toBeNull();
  });
});
