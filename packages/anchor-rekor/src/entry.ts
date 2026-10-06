// hashedrekord entry bodies for both API versions. The signed "artifact" is the
// 32 raw bytes of the root; the entry's digest is therefore sha256(root bytes).
// (Rekor checks the ECDSA signature against the digest as a prehash, and
// node:crypto cannot sign a prehash directly, so the root is the message.)
import { createHash, createPublicKey, sign, verify as cryptoVerify, type KeyObject } from "node:crypto";
import { canonicalize, type JsonValue } from "@auditkit/core";

export interface ParsedEntry {
  version: "0.0.1" | "0.0.2";
  /** sha256 digest recorded in the entry, raw bytes. */
  digest: Buffer;
  /** DER ECDSA signature. */
  signature: Buffer;
  publicKey: KeyObject;
}

export function rootBytes(root: string): Buffer {
  if (!/^[0-9a-f]{64}$/.test(root)) throw new Error("root must be 64 lowercase hex chars");
  return Buffer.from(root, "hex");
}

export function entryDigest(artifact: Buffer): Buffer {
  return createHash("sha256").update(artifact).digest();
}

export function signArtifact(artifact: Buffer, privateKey: KeyObject): Buffer {
  return sign("sha256", artifact, { key: privateKey, dsaEncoding: "der" });
}

export function verifyArtifactSignature(artifact: Buffer, signature: Buffer, publicKey: KeyObject): boolean {
  return cryptoVerify("sha256", artifact, { key: publicKey, dsaEncoding: "der" }, signature);
}

export function assertP256(key: KeyObject, role: string): void {
  if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
    throw new Error(`${role} must be an ECDSA P-256 key (Rekor hashedrekord rejects pure Ed25519 for digest-only entries)`);
  }
}

export function v2RequestBody(digest: Buffer, signature: Buffer, publicKey: KeyObject): JsonValue {
  return {
    hashedRekordRequestV002: {
      digest: digest.toString("base64"),
      signature: {
        content: signature.toString("base64"),
        verifier: {
          publicKey: { rawBytes: publicKey.export({ type: "spki", format: "der" }).toString("base64") },
          keyDetails: "PKIX_ECDSA_P256_SHA_256",
        },
      },
    },
  };
}

export function v1RequestBody(digest: Buffer, signature: Buffer, publicKey: KeyObject): JsonValue {
  const pem = publicKey.export({ type: "spki", format: "pem" }) as string;
  return {
    apiVersion: "0.0.1",
    kind: "hashedrekord",
    spec: {
      data: { hash: { algorithm: "sha256", value: digest.toString("hex") } },
      signature: { content: signature.toString("base64"), publicKey: { content: Buffer.from(pem).toString("base64") } },
    },
  };
}

function field(o: unknown, path: string[]): unknown {
  let cur = o;
  for (const k of path) {
    if (typeof cur !== "object" || cur === null || !(k in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function mustString(v: unknown, what: string): string {
  if (typeof v !== "string") throw new Error(`entry body: ${what} missing`);
  return v;
}

/** Parse a canonicalized hashedrekord body (0.0.1 or 0.0.2). Fails closed on unknown kinds/versions. */
export function parseEntryBody(body: Buffer): ParsedEntry {
  const text = body.toString("utf8");
  const json: unknown = JSON.parse(text);
  // The stored body must already be canonical JSON: re-canonicalizing must be a no-op,
  // otherwise the leaf hash we compute would not be the one in the log.
  if (canonicalize(json as JsonValue) !== text) throw new Error("entry body is not canonical JSON");
  if (field(json, ["kind"]) !== "hashedrekord") throw new Error("entry body: unsupported kind");
  const version = field(json, ["apiVersion"]);
  if (version === "0.0.2") {
    const spec = field(json, ["spec", "hashedRekordV002"]);
    if (field(spec, ["data", "algorithm"]) !== "SHA2_256") throw new Error("entry body: unsupported hash algorithm");
    if (field(spec, ["signature", "verifier", "keyDetails"]) !== "PKIX_ECDSA_P256_SHA_256") {
      throw new Error("entry body: unsupported key type");
    }
    const digest = Buffer.from(mustString(field(spec, ["data", "digest"]), "digest"), "base64");
    const signature = Buffer.from(mustString(field(spec, ["signature", "content"]), "signature"), "base64");
    const spki = Buffer.from(mustString(field(spec, ["signature", "verifier", "publicKey", "rawBytes"]), "public key"), "base64");
    return { version, digest, signature, publicKey: createPublicKey({ key: spki, format: "der", type: "spki" }) };
  }
  if (version === "0.0.1") {
    const spec = field(json, ["spec"]);
    if (field(spec, ["data", "hash", "algorithm"]) !== "sha256") throw new Error("entry body: unsupported hash algorithm");
    const digest = Buffer.from(mustString(field(spec, ["data", "hash", "value"]), "digest"), "hex");
    const signature = Buffer.from(mustString(field(spec, ["signature", "content"]), "signature"), "base64");
    const pem = Buffer.from(mustString(field(spec, ["signature", "publicKey", "content"]), "public key"), "base64").toString("utf8");
    return { version, digest, signature, publicKey: createPublicKey(pem) };
  }
  throw new Error(`entry body: unsupported hashedrekord version ${String(version)}`);
}
