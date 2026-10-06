---
layout: ../../layouts/BlogPost.astro
title: "Signed ingest receipts"
description: "Every accepted event returns position, event_hash, prev_hash and an Ed25519 server signature. Keep them, and a later verify proves the service never dropped or reordered an acknowledged event."
lede: "Every log_event returns {id, position, event_hash, prev_hash, server_sig}; keep them and a later verify proves the service never dropped or reordered an acknowledged event, the same idea as certificate transparency's signed certificate timestamps."
date: 2026-10-05
tags: [design]
---

## Format

`server_sig` is an Ed25519 signature over the raw 32 bytes of `event_hash`, made with a private key loaded from the server process's environment and never stored in a database. The public key is published at `/.well-known/auditkit.json` and pinned in the verifier package, so a receipt can be checked by anyone with the key and the event header.

## Why a receipt matters before anchoring

Anchoring is periodic: daily, every 5 minutes or every minute by plan. In the window between ingest and the next tick, the public logs do not yet know about your event. The receipt does: it is the server's signed statement that at position n of your tenant's chain sits this hash. If a later export shows a different hash at n, or ends before n, the verifier's `chain` and `signatures` checks fail and the receipt is the evidence that the server once said otherwise.

## Storing receipts

The TypeScript SDK accepts `keepReceipts(receipt)` and calls it for every accepted event; write them to your own log, a file, or your own database. They are small (an id, two hashes, a position, a signature). The Python SDK returns the same dict from `log`.

## Idempotency

A retry after a lost response must not create a second event. Both SDKs always send an idempotency key (a UUID per event unless you pass one); a replay returns the original receipt with `duplicate: true`. Receipts are therefore stable under retries.

## Dual signing

Pass your own Ed25519 key and the SDK adds `client_sig` over `sha256(JCS({tenant, actor, action, target, occurred_at}))`. The server stores it and includes it in exports. Register the public key for the tenant and the server also verifies each signed event on ingest, and can be told to refuse unsigned ones; but the check that matters is the verifier's, made from the export with your public key, because the server cannot forge entries in your name whether or not it checked them. With both signatures present, neither party can forge the other's entries.
