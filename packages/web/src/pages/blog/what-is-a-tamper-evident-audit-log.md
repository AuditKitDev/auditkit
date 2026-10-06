---
layout: ../../layouts/BlogPost.astro
title: "What is a tamper-evident audit log?"
description: "Definition of a tamper-evident audit log, how it differs from tamper-proof, and the three parts it is built from: hash chain, Merkle root, external anchor."
lede: "A tamper-evident audit log is a log where any change, deletion, or reordering after the fact can be detected by someone who does not trust the operator. It is built from three parts: a hash chain that links each event to the previous one, a Merkle root that summarises a batch, and an anchor that publishes that root to a place the operator cannot edit. \"Tamper-proof\" is a stronger claim that no hosted service can honestly make; tamper-evident is what you can verify."
date: 2026-10-05
tags: [definitions]
---

## Evident versus proof

"Tamper-proof" says nobody can change the data. For a hosted service that is false by construction: whoever runs the database can run `UPDATE`. "Tamper-evident" says that if they do, you will find out, and you will find out without asking them. Glossaries define the first term loosely ("designed to resist alteration"); engineering blogs define the second precisely. WorkOS's version: "Tamper-evidence means any modification is detectable, typically through cryptographic hashing that chains each record to the ones before it." That is part one of three.

## Part one: the hash chain

Each event's hash includes the previous event's hash. In AuditKit: `event_hash = sha256(JCS({id, project_id, tenant_id, position, occurred_at, actor, action, target, payload_commit, prev_hash}))`, canonicalised per RFC 8785 so two implementations hash the same bytes. Edit any field and the hash changes; the next event's `prev_hash` no longer matches; everything after it is broken. A chain detects edits to the middle. It does not detect the operator recomputing the whole chain from the edited row forward, and it does not detect truncation of the tail. That needs parts two and three.

## Part two: the Merkle root

Every interval, the new events' hashes become leaves of a Merkle tree (`sha256(0x00 ∥ leaf)`, `sha256(0x01 ∥ left ∥ right)`, RFC 6962 style). The root is one 32-byte value that commits to every event in the batch, and an inclusion proof is the log₂(n) sibling hashes that connect one event to that root. AuditKit builds three levels (tenant root, project root, global root) so one public entry per tick covers every tenant while each tenant still gets its own proof.

## Part three: the external anchor

The root goes somewhere the operator cannot edit. AuditKit writes each global root to Sigstore Rekor, "an immutable, tamper-resistant ledger" with a free public instance, and to OpenTimestamps calendars, which commit it to Bitcoin within hours. Now recomputing the chain does not help the operator: the rebuilt root will not match the one already in Rekor. Truncation does not help either: the public root covers events that the truncated export no longer contains.

## What the operator can still do

Delete everything, and you will know. Read everything that is not erased. Edit events that are newer than the last anchor tick, which is why each event is also acknowledged with a signed receipt at ingest: keep the receipt, and later omission of that event is provable even before the root is anchored. The [security page](/security) lists this in full.

## How to verify one yourself

```
# until @auditkit/verify is published, from the repo (pnpm install && pnpm -r build):
node packages/verify/dist/cli.js export.jsonl --pin <server public key>
# eventual command:
npx @auditkit/verify export.jsonl --pin <server public key>
```

The verifier re-hashes every event, walks the chain, checks the Ed25519 signatures, rebuilds every root and checks each anchor receipt from the proof bytes in the file. It never contacts AuditKit. Exit 0 is VALID. The [docs](/docs#export) describe the checks and the exit codes; the [anchors page](/anchors) lists every root we have published.
