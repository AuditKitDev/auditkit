import type { KeyObject } from "node:crypto";
import type { Anchor, AnchorReceipt, Hex } from "@auditkit/core";
import { checkpointKeyId, parseCheckpoint, verifyCheckpoint, type LogKey } from "./checkpoint.js";
import { assertP256, entryDigest, rootBytes, signArtifact, v1RequestBody, v2RequestBody } from "./entry.js";
import { HttpError, postJsonWithRetry, type RetryOptions } from "./http.js";
import { EMBEDDED_LOG_KEYS, REKOR_V1_URL, REKOR_V2_URL } from "./keys.js";
import { encodeProof, type RekorProof } from "./proof.js";
import { verifyRekorReceipt, type Verdict } from "./verify.js";

export interface RekorAnchorOptions {
  /** ECDSA P-256. Required for `anchor`, not for `verify`. */
  privateKey?: KeyObject;
  /** ECDSA P-256. Required for `anchor`; if given, `verify` also requires the entry to carry this key. */
  publicKey?: KeyObject;
  /**
   * Log to write to. Default: the Rekor v2 shard from Sigstore's signing config, falling back to
   * Rekor v1 at rekor.sigstore.dev if the shard is unreachable or rejects the API. Setting this
   * disables the fallback; set `apiVersion` to match the instance.
   */
  baseUrl?: string;
  apiVersion?: 1 | 2;
  /** Extra or replacement log keys (e.g. a new shard, or a private Rekor). */
  logKeys?: LogKey[];
  fetch?: typeof fetch;
  retry?: RetryOptions;
  now?: () => Date;
}

interface V2Response {
  logIndex: string;
  logId?: { keyId?: string };
  kindVersion?: { kind?: string; version?: string };
  inclusionProof: { logIndex: string; rootHash: string; treeSize: string; hashes: string[]; checkpoint: { envelope: string } };
  canonicalizedBody: string;
}

interface V1Entry {
  body: string;
  integratedTime: number;
  logID: string;
  logIndex: number;
  verification: { inclusionProof: { checkpoint: string; hashes: string[]; logIndex: number; rootHash: string; treeSize: number } };
}

export class RekorAnchor implements Anchor {
  readonly kind = "rekor" as const;
  private readonly privateKey: KeyObject | undefined;
  private readonly publicKey: KeyObject | undefined;
  private readonly targets: { url: string; api: 1 | 2 }[];
  private readonly logKeys: LogKey[];
  private readonly fetchFn: typeof fetch;
  private readonly retry: RetryOptions;
  private readonly now: () => Date;

  constructor(opts: RekorAnchorOptions = {}) {
    if (opts.privateKey) assertP256(opts.privateKey, "privateKey");
    if (opts.publicKey) assertP256(opts.publicKey, "publicKey");
    this.privateKey = opts.privateKey;
    this.publicKey = opts.publicKey;
    this.targets = opts.baseUrl
      ? [{ url: opts.baseUrl.replace(/\/+$/, ""), api: opts.apiVersion ?? 2 }]
      : opts.apiVersion === 1
        ? [{ url: REKOR_V1_URL, api: 1 }]
        : [{ url: REKOR_V2_URL, api: 2 }, { url: REKOR_V1_URL, api: 1 }];
    this.logKeys = [...(opts.logKeys ?? []), ...EMBEDDED_LOG_KEYS];
    this.fetchFn = opts.fetch ?? fetch;
    this.retry = opts.retry ?? {};
    this.now = opts.now ?? (() => new Date());
  }

  async anchor(root: Hex): Promise<AnchorReceipt> {
    if (!this.privateKey || !this.publicKey) throw new Error("RekorAnchor.anchor needs privateKey and publicKey");
    const artifact = rootBytes(root);
    const digest = entryDigest(artifact);
    const signature = signArtifact(artifact, this.privateKey);
    const errors: string[] = [];
    for (const target of this.targets) {
      try {
        const receipt =
          target.api === 2
            ? await this.anchorV2(target.url, digest, signature)
            : await this.anchorV1(target.url, digest, signature);
        const verdict = await verifyRekorReceipt(root, receipt, { logKeys: this.logKeys, expectPublicKey: this.publicKey });
        if (!verdict.ok) throw new Error(`log response failed offline verification: ${verdict.reason}`);
        return receipt;
      } catch (e) {
        errors.push(`${target.url} (v${target.api}): ${(e as Error).message}`);
      }
    }
    throw new Error(`rekor anchor failed: ${errors.join("; ")}`);
  }

  private async anchorV2(baseUrl: string, digest: Buffer, signature: Buffer): Promise<AnchorReceipt> {
    const { status, text } = await postJsonWithRetry(
      this.fetchFn,
      `${baseUrl}/api/v2/log/entries`,
      v2RequestBody(digest, signature, this.publicKey!),
      this.retry,
    );
    if (status !== 201 && status !== 200) throw new HttpError(status, text, baseUrl);
    const res = JSON.parse(text) as V2Response;
    const cp = parseCheckpoint(res.inclusionProof.checkpoint.envelope);
    const signer = verifyCheckpoint(cp, this.logKeys);
    const proof: RekorProof = {
      v: 1,
      api: 2,
      logUrl: baseUrl,
      logIndex: Number(res.logIndex),
      proofIndex: Number(res.inclusionProof.logIndex),
      treeSize: Number(res.inclusionProof.treeSize),
      rootHash: res.inclusionProof.rootHash,
      hashes: res.inclusionProof.hashes,
      checkpoint: res.inclusionProof.checkpoint.envelope,
      logKeyId: res.logId?.keyId ?? (signer ? checkpointKeyId(signer).toString("base64") : ""),
      body: res.canonicalizedBody,
      kind: "hashedrekord",
      version: "0.0.2",
    };
    return {
      kind: "rekor",
      ref: `${cp.origin}/${proof.logIndex}`,
      proof: encodeProof(proof),
      anchored_at: this.now().toISOString(),
      status: "final",
    };
  }

  private async anchorV1(baseUrl: string, digest: Buffer, signature: Buffer): Promise<AnchorReceipt> {
    const { status, text } = await postJsonWithRetry(
      this.fetchFn,
      `${baseUrl}/api/v1/log/entries`,
      v1RequestBody(digest, signature, this.publicKey!),
      this.retry,
    );
    if (status !== 201 && status !== 200 && status !== 409) throw new HttpError(status, text, baseUrl);
    const res = JSON.parse(text) as Record<string, V1Entry>;
    const [entryId, entry] = Object.entries(res)[0] ?? [];
    if (!entryId || !entry) throw new Error("rekor v1 returned no entry");
    const ip = entry.verification.inclusionProof;
    const proof: RekorProof = {
      v: 1,
      api: 1,
      logUrl: baseUrl,
      logIndex: entry.logIndex,
      proofIndex: ip.logIndex,
      treeSize: ip.treeSize,
      rootHash: Buffer.from(ip.rootHash, "hex").toString("base64"),
      hashes: ip.hashes.map((h) => Buffer.from(h, "hex").toString("base64")),
      checkpoint: ip.checkpoint,
      logKeyId: Buffer.from(entry.logID, "hex").toString("base64"),
      body: entry.body,
      kind: "hashedrekord",
      version: "0.0.1",
      entryId,
      integratedTime: entry.integratedTime,
    };
    return {
      kind: "rekor",
      ref: `${entry.logIndex}/${entryId}`,
      proof: encodeProof(proof),
      anchored_at: new Date(entry.integratedTime * 1000).toISOString(),
      status: "final",
    };
  }

  /** Rekor is final on write. */
  async upgrade(receipt: AnchorReceipt): Promise<AnchorReceipt> {
    return receipt;
  }

  verify(root: Hex, receipt: AnchorReceipt, opts: { online?: boolean } = {}): Promise<Verdict> {
    const o: Parameters<typeof verifyRekorReceipt>[2] = { logKeys: this.logKeys, fetch: this.fetchFn };
    if (this.publicKey) o.expectPublicKey = this.publicKey;
    if (opts.online) o.online = true;
    return verifyRekorReceipt(root, receipt, o);
  }
}
