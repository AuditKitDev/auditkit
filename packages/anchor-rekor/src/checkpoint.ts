// C2SP signed-note / tlog-checkpoint parsing and signature verification.
// https://github.com/C2SP/C2SP/blob/main/tlog-checkpoint.md
// https://github.com/C2SP/C2SP/blob/main/signed-note.md
import { createHash, createPublicKey, verify as cryptoVerify, type KeyObject } from "node:crypto";

export type LogKeyDetails = "PKIX_ED25519" | "PKIX_ECDSA_P256_SHA_256";

export interface LogKey {
  /** Log origin as it appears on the first checkpoint line (v2) or the signer name (v1). */
  name: string;
  keyDetails: LogKeyDetails;
  /** SubjectPublicKeyInfo DER, base64. */
  spkiBase64: string;
}

export interface Checkpoint {
  origin: string;
  treeSize: bigint;
  rootHash: Buffer;
  extensions: string[];
  /** The signed text: everything up to and including the newline before the blank line. */
  text: string;
  signatures: { name: string; keyId: Buffer; signature: Buffer }[];
}

export function parseCheckpoint(envelope: string): Checkpoint {
  const sep = envelope.indexOf("\n\n");
  if (sep < 0) throw new Error("checkpoint: missing blank line before signatures");
  const text = envelope.slice(0, sep + 1);
  const lines = text.split("\n");
  lines.pop(); // trailing empty string after final newline
  if (lines.length < 3) throw new Error("checkpoint: fewer than three body lines");
  const [origin, sizeLine, rootLine, ...extensions] = lines as [string, string, string, ...string[]];
  if (!/^\d+$/.test(sizeLine)) throw new Error(`checkpoint: bad tree size "${sizeLine}"`);
  const rootHash = Buffer.from(rootLine, "base64");
  if (rootHash.length !== 32) throw new Error("checkpoint: root hash is not 32 bytes");
  const signatures = envelope
    .slice(sep + 2)
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => {
      const m = /^— (\S+) (\S+)$/.exec(line);
      if (!m) throw new Error(`checkpoint: malformed signature line "${line}"`);
      const raw = Buffer.from(m[2]!, "base64");
      if (raw.length < 5) throw new Error("checkpoint: signature too short");
      return { name: m[1]!, keyId: raw.subarray(0, 4), signature: raw.subarray(4) };
    });
  if (signatures.length === 0) throw new Error("checkpoint: no signatures");
  return { origin, treeSize: BigInt(sizeLine), rootHash, extensions, text, signatures };
}

export function logKeyObject(key: LogKey): KeyObject {
  return createPublicKey({ key: Buffer.from(key.spkiBase64, "base64"), format: "der", type: "spki" });
}

/** Full (32-byte) checkpoint key ID per the C2SP signed-note spec; the line key ID is its first 4 bytes. */
export function checkpointKeyId(key: LogKey): Buffer {
  const pub = logKeyObject(key);
  if (key.keyDetails === "PKIX_ED25519") {
    const jwk = pub.export({ format: "jwk" });
    const raw = Buffer.from(jwk.x as string, "base64url");
    return createHash("sha256")
      .update(key.name)
      .update(Buffer.from([0x0a, 0x01]))
      .update(raw)
      .digest();
  }
  return createHash("sha256").update(pub.export({ format: "der", type: "spki" })).digest();
}

function verifyNoteSignature(key: LogKey, text: string, signature: Buffer): boolean {
  const pub = logKeyObject(key);
  const data = Buffer.from(text, "utf8");
  if (key.keyDetails === "PKIX_ED25519") return cryptoVerify(null, data, pub, signature);
  return cryptoVerify("sha256", data, { key: pub, dsaEncoding: "der" }, signature);
}

/**
 * Verify the checkpoint carries a valid signature from one of `keys`.
 * Returns the matching key, or null if no signature line matches and verifies.
 */
export function verifyCheckpoint(cp: Checkpoint, keys: LogKey[]): LogKey | null {
  for (const key of keys) {
    const want = checkpointKeyId(key).subarray(0, 4);
    for (const sig of cp.signatures) {
      if (!sig.keyId.equals(want)) continue;
      if (verifyNoteSignature(key, cp.text, sig.signature)) return key;
    }
  }
  return null;
}
