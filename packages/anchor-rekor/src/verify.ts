// Offline verification of a Rekor receipt. No network unless `online: true`.
import type { KeyObject } from "node:crypto";
import type { AnchorReceipt, Hex } from "@auditkit/core";
import { parseCheckpoint, verifyCheckpoint, checkpointKeyId, type LogKey } from "./checkpoint.js";
import { entryDigest, parseEntryBody, rootBytes, verifyArtifactSignature } from "./entry.js";
import { EMBEDDED_LOG_KEYS } from "./keys.js";
import { decodeProof, type RekorProof } from "./proof.js";
import { leafHash, rootFromInclusionProof } from "./rfc6962.js";

export type Verdict = { ok: true; attested_at: string } | { ok: false; reason: string };

export interface VerifyOptions {
  /** Log keys to accept, in addition to the embedded Sigstore keys. */
  logKeys?: LogKey[];
  /** If set, the entry must have been signed by this key. */
  expectPublicKey?: KeyObject;
  /** Ask the log as well. Default false: pure offline. */
  online?: boolean;
  fetch?: typeof fetch;
}

function fail(reason: string): Verdict {
  return { ok: false, reason };
}

export async function verifyRekorReceipt(root: Hex, receipt: AnchorReceipt, opts: VerifyOptions = {}): Promise<Verdict> {
  if (receipt.kind !== "rekor") return fail(`receipt kind is ${receipt.kind}, not rekor`);
  let proof: RekorProof;
  let artifact: Buffer;
  try {
    proof = decodeProof(receipt.proof);
    artifact = rootBytes(root);
  } catch (e) {
    return fail((e as Error).message);
  }

  // 1. Entry body: digest must be sha256(root), signature must verify under the entry's key.
  const body = Buffer.from(proof.body, "base64");
  let entry;
  try {
    entry = parseEntryBody(body);
  } catch (e) {
    return fail((e as Error).message);
  }
  if (entry.version !== proof.version) return fail("entry version does not match proof metadata");
  if (!entry.digest.equals(entryDigest(artifact))) return fail("entry digest does not match root");
  if (!verifyArtifactSignature(artifact, entry.signature, entry.publicKey)) return fail("entry signature does not verify over root");
  if (opts.expectPublicKey) {
    const want = opts.expectPublicKey.export({ type: "spki", format: "der" });
    const got = entry.publicKey.export({ type: "spki", format: "der" });
    if (!want.equals(got)) return fail("entry was signed by a different key than expected");
  }

  // 2. Checkpoint: parse, then check its signature against a known log key.
  let cp;
  try {
    cp = parseCheckpoint(proof.checkpoint);
  } catch (e) {
    return fail((e as Error).message);
  }
  const keys = [...(opts.logKeys ?? []), ...EMBEDDED_LOG_KEYS];
  const signer = verifyCheckpoint(cp, keys);
  if (!signer) return fail(`checkpoint signature does not verify under any known log key (origin ${cp.origin})`);
  if (proof.api === 2 && cp.origin !== signer.name) return fail("checkpoint origin does not match the log key's name");
  const fullKeyId = checkpointKeyId(signer);
  const claimedKeyId = Buffer.from(proof.logKeyId, "base64");
  if (!claimedKeyId.equals(fullKeyId)) return fail("proof log key id does not match the verifying log key");

  // 3. Inclusion: leaf hash of the stored body must reach the checkpoint root via the proof.
  if (BigInt(proof.treeSize) !== cp.treeSize) return fail("proof tree size does not match checkpoint");
  let computed: Buffer;
  try {
    computed = rootFromInclusionProof(
      leafHash(body),
      BigInt(proof.proofIndex),
      cp.treeSize,
      proof.hashes.map((h) => Buffer.from(h, "base64")),
    );
  } catch (e) {
    return fail((e as Error).message);
  }
  if (!computed.equals(cp.rootHash)) return fail("inclusion proof does not reach the checkpoint root");
  if (!Buffer.from(proof.rootHash, "base64").equals(cp.rootHash)) return fail("proof root hash does not match checkpoint");

  if (opts.online) {
    const online = await checkOnline(proof, body, cp.treeSize, keys, opts.fetch ?? fetch);
    if (online) return fail(online);
  }

  // Rekor v1 attests integration time in the entry; v2 does not (integrated_time is 0 and
  // clients are expected to use an RFC 3161 TSA), so the receipt's own anchor time is reported.
  const attestedAt =
    proof.api === 1 && proof.integratedTime !== undefined
      ? new Date(proof.integratedTime * 1000).toISOString()
      : receipt.anchored_at;
  return { ok: true, attested_at: attestedAt };
}

/** Returns a failure reason, or null if the log agrees. */
async function checkOnline(
  proof: RekorProof,
  body: Buffer,
  treeSize: bigint,
  keys: LogKey[],
  fetchFn: typeof fetch,
): Promise<string | null> {
  const base = proof.logUrl.replace(/\/+$/, "");
  if (proof.api === 1) {
    const res = await fetchFn(`${base}/api/v1/log/entries?logIndex=${proof.logIndex}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return `online: log returned ${res.status} for index ${proof.logIndex}`;
    const json = (await res.json()) as Record<string, { body?: string }>;
    const live = Object.values(json)[0]?.body;
    if (!live) return "online: log returned no entry";
    if (!Buffer.from(live, "base64").equals(body)) return "online: log entry body differs from stored body";
    return null;
  }
  // v2 has no per-entry read API; the best online check without tile fetching is that the
  // log's current signed checkpoint is at least as large as ours and signed by the same key.
  const res = await fetchFn(`${base}/api/v2/checkpoint`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return `online: checkpoint fetch returned ${res.status}`;
  const cp = parseCheckpoint(await res.text());
  if (!verifyCheckpoint(cp, keys)) return "online: current checkpoint signature does not verify";
  if (cp.treeSize < treeSize) return `online: log tree size ${cp.treeSize} is smaller than the proof's ${treeSize}`;
  return null;
}
