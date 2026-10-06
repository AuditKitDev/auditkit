// Server Ed25519 key. The private key comes from AUDITKIT_SIGNING_KEY (base64 PKCS8).
// In dev, one is generated and written to <dataDir>/signing.key so restarts keep it.
// The public key is published at /.well-known/auditkit.json and pinned in the verifier.
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Signer {
  sign(hex: string): string; // base64 signature over the raw 32 bytes
  verify(hex: string, sigB64: string): boolean;
  publicKeySpkiB64: string;
}

export function loadSigner(dataDir: string, envKey = process.env.AUDITKIT_SIGNING_KEY): Signer {
  let priv: KeyObject;
  if (envKey) {
    priv = createPrivateKey({ key: Buffer.from(envKey, "base64"), format: "der", type: "pkcs8" });
  } else {
    const path = join(dataDir, "signing.key");
    if (!existsSync(path)) {
      const { privateKey } = generateKeyPairSync("ed25519");
      writeFileSync(path, privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"), { mode: 0o600 });
    }
    priv = createPrivateKey({ key: Buffer.from(readFileSync(path, "utf8"), "base64"), format: "der", type: "pkcs8" });
  }
  const pub = createPublicKey(priv);
  return {
    sign: (hex) => sign(null, Buffer.from(hex, "hex"), priv).toString("base64"),
    verify: (hex, sigB64) => verify(null, Buffer.from(hex, "hex"), pub, Buffer.from(sigB64, "base64")),
    publicKeySpkiB64: pub.export({ format: "der", type: "spki" }).toString("base64"),
  };
}

export function verifyWithSpki(spkiB64: string, hex: string, sigB64: string): boolean {
  const pub = createPublicKey({ key: Buffer.from(spkiB64, "base64"), format: "der", type: "spki" });
  return verify(null, Buffer.from(hex, "hex"), pub, Buffer.from(sigB64, "base64"));
}

/** ECDSA P-256 key used only to sign Rekor entries (Rekor v2 rejects Ed25519). Separate from the receipt key. */
export function loadAnchorKey(dataDir: string, envKey = process.env.AUDITKIT_ANCHOR_KEY): { privateKey: KeyObject; publicKey: KeyObject } {
  let privateKey: KeyObject;
  if (envKey) {
    privateKey = createPrivateKey({ key: Buffer.from(envKey, "base64"), format: "der", type: "pkcs8" });
  } else {
    const path = join(dataDir, "anchor.key");
    if (!existsSync(path)) {
      const kp = generateKeyPairSync("ec", { namedCurve: "P-256" });
      writeFileSync(path, kp.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"), { mode: 0o600 });
    }
    privateKey = createPrivateKey({ key: Buffer.from(readFileSync(path, "utf8"), "base64"), format: "der", type: "pkcs8" });
  }
  return { privateKey, publicKey: createPublicKey(privateKey) };
}
