// The receipt's `proof` field: base64 of this JSON. Everything an offline
// verifier needs; nothing here is trusted until checked against the checkpoint.
export interface RekorProof {
  v: 1;
  /** Rekor API that produced the entry. */
  api: 1 | 2;
  /** Base URL of the log instance the entry was written to. */
  logUrl: string;
  /** Log index (v2: the only index; v1: the global index used as the entry's ref). */
  logIndex: number;
  /** Index used in the inclusion proof (v1 shards use a shard-local index). */
  proofIndex: number;
  treeSize: number;
  /** base64 */
  rootHash: string;
  /** base64 sibling hashes, leaf to root. */
  hashes: string[];
  /** Signed checkpoint envelope (C2SP signed note). */
  checkpoint: string;
  /** base64. v2: full checkpoint key id; v1: sha256(log SPKI). */
  logKeyId: string;
  /** base64 canonicalized entry body as stored in the log. */
  body: string;
  kind: "hashedrekord";
  version: "0.0.1" | "0.0.2";
  /** v1 only. */
  entryId?: string;
  /** v1 only: log-attested integration time, unix seconds. */
  integratedTime?: number;
}

export function encodeProof(p: RekorProof): string {
  return Buffer.from(JSON.stringify(p), "utf8").toString("base64");
}

export function decodeProof(s: string): RekorProof {
  const parsed: unknown = JSON.parse(Buffer.from(s, "base64").toString("utf8"));
  if (typeof parsed !== "object" || parsed === null) throw new Error("rekor proof is not an object");
  const p = parsed as Record<string, unknown>;
  const str = (k: string) => {
    if (typeof p[k] !== "string") throw new Error(`rekor proof: ${k} missing`);
    return p[k] as string;
  };
  const num = (k: string) => {
    if (typeof p[k] !== "number" || !Number.isSafeInteger(p[k])) throw new Error(`rekor proof: ${k} missing`);
    return p[k] as number;
  };
  if (p["v"] !== 1) throw new Error("rekor proof: unsupported version");
  if (p["api"] !== 1 && p["api"] !== 2) throw new Error("rekor proof: unsupported api");
  if (p["kind"] !== "hashedrekord") throw new Error("rekor proof: unsupported kind");
  if (p["version"] !== "0.0.1" && p["version"] !== "0.0.2") throw new Error("rekor proof: unsupported entry version");
  if (!Array.isArray(p["hashes"]) || !p["hashes"].every((h) => typeof h === "string")) {
    throw new Error("rekor proof: hashes missing");
  }
  const out: RekorProof = {
    v: 1,
    api: p["api"],
    logUrl: str("logUrl"),
    logIndex: num("logIndex"),
    proofIndex: num("proofIndex"),
    treeSize: num("treeSize"),
    rootHash: str("rootHash"),
    hashes: p["hashes"] as string[],
    checkpoint: str("checkpoint"),
    logKeyId: str("logKeyId"),
    body: str("body"),
    kind: "hashedrekord",
    version: p["version"],
  };
  if (typeof p["entryId"] === "string") out.entryId = p["entryId"];
  if (typeof p["integratedTime"] === "number") out.integratedTime = p["integratedTime"];
  return out;
}
