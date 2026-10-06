// Public Sigstore log keys, embedded so verification works offline.
//
// Both entries copied on 2026-10-05 from Sigstore's TUF-distributed trusted root,
// target `trusted_root.json` (sha256 6494e21ea73fa7ee769f85f57d5a3e6a08725eae1e38c755fc3517c9e6bc0b66):
//   https://tuf-repo-cdn.sigstore.dev/targets/6494e21ea73fa7ee769f85f57d5a3e6a08725eae1e38c755fc3517c9e6bc0b66.trusted_root.json
// The v1 key is also served at https://rekor.sigstore.dev/api/v1/log/publicKey.
// Pass `logKeys` to RekorAnchor to add or replace keys (new shards rotate both URL and key).
import type { LogKey } from "./checkpoint.js";

export const REKOR_V2_LOG: LogKey = {
  name: "log2025-1.rekor.sigstore.dev",
  keyDetails: "PKIX_ED25519",
  spkiBase64: "MCowBQYDK2VwAyEAt8rlp1knGwjfbcXAYPYAkn0XiLz1x8O4t0YkEhie244=",
};

export const REKOR_V1_LOG: LogKey = {
  name: "rekor.sigstore.dev",
  keyDetails: "PKIX_ECDSA_P256_SHA_256",
  spkiBase64:
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2G2Y+2tabdTV5BcGiBIx0a9fAFwrkBbmLSGtks4L3qX6yYY0zufBnhC8Ur/iy55GhWP/9A/bY2LhC30M9+RYtw==",
};

export const EMBEDDED_LOG_KEYS: LogKey[] = [REKOR_V2_LOG, REKOR_V1_LOG];

// Service URLs from Sigstore's signing config, target `signing_config_rekor_v2.v0.2.json`
// (sha256 0f5f38554e29e770d4d5d6f0e1b51fcbf84f61dc6934530a09b7a901eaad5bee), fetched 2026-10-05:
//   https://tuf-repo-cdn.sigstore.dev/targets/0f5f38554e29e770d4d5d6f0e1b51fcbf84f61dc6934530a09b7a901eaad5bee.signing_config_rekor_v2.v0.2.json
// v2 shard valid from 2026-01-01; v1 is the fallback when the shard is unreachable or retired.
export const REKOR_V2_URL = "https://log2025-1.rekor.sigstore.dev";
export const REKOR_V1_URL = "https://rekor.sigstore.dev";
