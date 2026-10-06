---
layout: ../../layouts/BlogPost.astro
title: "Sigstore Rekor and OpenTimestamps as public anchors"
description: "What Rekor and OpenTimestamps are, what each one proves, why AuditKit uses both, and how to read the anchors page."
lede: "Rekor is Sigstore's append-only transparency log; OpenTimestamps commits hashes to Bitcoin via free calendar servers. AuditKit writes one root per interval to both, so a proof survives even if AuditKit does not. Rekor proves inclusion; OpenTimestamps proves time."
date: 2026-10-05
tags: [anchoring]
---

## Rekor

Sigstore describes Rekor as "an immutable, tamper-resistant ledger" and runs a free public instance at `rekor.sigstore.dev`. Entries are Merkle-tree leaves; the log publishes signed checkpoints, and any entry comes with an inclusion proof to a checkpoint. AuditKit writes each global root as a `hashedrekord` entry and stores the entry, the inclusion proof and the checkpoint in the anchor receipt, so the verifier can check inclusion from the file alone and, with `--online`, re-fetch the entry for a live cross-check.

What Rekor does not give you is a trustworthy timestamp of your root. The verifier does not treat Rekor's integrated time as evidence, and this site does not claim Rekor timestamps.

## OpenTimestamps

OpenTimestamps calendar servers accept a hash, aggregate many hashes into one Merkle tree, and commit that tree's root into a Bitcoin transaction. The `.ots` proof is the path from your hash to the Bitcoin block's Merkle root. AuditKit submits each global root, stores the proof with `status: pending`, and upgrades it to `final` once the Bitcoin attestation exists; that lands within hours, not instantly. The verifier checks the proof's arithmetic offline and, with `--online`, fetches the block header from a public explorer to confirm the Merkle root. The attested time is the block time.

## Why both

Rekor is fast and final on write, but it is one organisation's log. Bitcoin is nobody's, but it is slow. Using both gives a proof that is immediate and a proof that is independent of any single operator. If either service is unavailable the anchor loop retries with backoff and the root's status is visible on the [anchors page](/anchors).

## Reading /anchors

Each row is one global root: its hash, when it was built, how many projects it covers, the Rekor log index (linked to Sigstore's search), and the OpenTimestamps status. A root reveals nothing about events; it is a hash of hashes. Your project's own last anchor is on its dashboard, and a single event's path to its root is at `GET /v1/events/:id/proof`.
