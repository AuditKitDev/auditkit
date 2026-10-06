---
layout: ../../layouts/BlogPost.astro
title: "Crypto-shredding: immutable logs and the right to erasure"
description: "How a per-event salt lets an audit log honour GDPR Article 17 erasure while the hash chain, Merkle roots and public anchors stay valid, following the EDPB's Guidelines 02/2025 pattern."
lede: "Crypto-shredding satisfies GDPR Article 17 by destroying the key or salt that makes personal data readable, leaving the commitment in place. In an audit log the chain commits to hash(salt ∥ payload); delete salt and payload and the chain, Merkle roots and anchors still verify. The record of the event survives; the personal data does not."
date: 2026-10-05
tags: [gdpr, design]
---

## Article 17 and logs

The right to erasure does not stop at logs. The EDPB's Guidelines 02/2025 on blockchains are explicit that "technical impossibility cannot be invoked to justify non-compliance with GDPR requirements". The same guidelines describe the compliant pattern: "store only a salted or keyed hash of the personal data on the blockchain. The unhashed data itself, as well as the secret key or the long random salt used, are stored confidentially off the chain." After deletion, "the hash should not be linkable to the original data, provided that the algorithm has not been broken, the keys have not been compromised or leaked, and the salt was not leaked".

AuditKit is not a blockchain, but the structure is the same: an immutable commitment and a deletable secret.

## Per-event salt

Each event gets a 16-byte random salt. The payload row stores `(event_id, salt, json)`. The event header, which is what the chain hashes, stores only `payload_commit = sha256(salt ∥ JCS(payload))`. The chain, the Merkle roots and the public anchors are computed over headers, so they never see the payload bytes.

`POST /v1/erase/:id` (scope `erase`) deletes the payload row and, in the same transaction, appends a `payload.erased` event to the tenant's chain with the erased id as target. The erasure is therefore itself audited: signed, chained, anchored. Plan retention does the same thing on a timer for payloads older than the window and logs `payload.retention_shred`.

## What the verifier sees after erasure

An export line for an erased event carries `payload_commit` and `erased: true` and no payload. The verifier's `payloads` check reports it: `1281 payload commitments verify, 3 erased`. The `chain`, `roots` and `anchors` checks are unaffected because nothing they hash has changed. The verdict is still VALID.

## Limits

- `actor`, `action`, `target` and `occurred_at` are header fields. They are in the chain and cannot be erased. Use opaque identifiers (user ids, not emails) for subjects who may ask for erasure.
- While the salt exists, the EDPB says the hash is still personal data. Erasure must delete the salt, and AuditKit does. Copy on this site says "salt and payload are destroyed", not "the hash is anonymous".
- Backups: the ICO notes that erased data may remain in a backup "until it is overwritten". AuditKit backups are file copies of SQLite databases; the retention of those copies is on the [privacy page](/privacy).

## Retention versus erasure

Retention is the same mechanism on a schedule: Free keeps payloads 30 days, Pro one year, Business three years; headers and hashes are kept so that a five-year-old export still verifies and still shows who did what, when. Erasure is retention applied to one event, now.
