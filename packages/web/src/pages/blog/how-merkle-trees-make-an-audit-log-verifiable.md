---
layout: ../../layouts/BlogPost.astro
title: "How Merkle trees make an audit log verifiable"
description: "Leaves, roots and inclusion proofs; why AuditKit builds three levels (tenant, project, global) and what an inclusion proof lets a tenant check without the rest of the log."
lede: "A Merkle tree hashes events into leaves and pairs them up to one root; an inclusion proof is the log₂(n) sibling hashes connecting one event to that root, so a tenant can verify one event without the rest of the log."
date: 2026-10-05
tags: [design]
---

## Leaves and roots

AuditKit's tree follows RFC 6962's domain separation: a leaf is `sha256(0x00 ∥ event_hash)` and an interior node is `sha256(0x01 ∥ left ∥ right)`, so a node can never be presented as a leaf. An odd node at any level carries up unchanged, never duplicated, so trees of n and n+1 leaves cannot collide on a duplicated leaf. The root is the single hash at the top.

## Inclusion proofs

To prove event 5 of 8 is in the root you hand over three hashes: its sibling leaf, the sibling of their parent, and the sibling of that node. The checker recomputes upward and compares with the root. `GET /v1/events/:id/proof` returns exactly this as `path_to_tenant_root: [{hash, side}, …]`, and then two more paths.

## Three levels

Every anchor tick AuditKit builds a tenant root over each tenant's new events, a project root over the tenant roots, and one global root over all project roots. The global root is the only thing published. The proof for one event is therefore three paths: event to tenant root, tenant root to project root, project root to global root. A tenant can hand that proof plus the Rekor receipt to their own auditor; the auditor needs no other tenant's data and no other project's.

## Consistency

Because an odd node carries up unchanged, the tree over a batch is deterministic given the leaves, and the verifier can rebuild it from the export: the `roots` check reports `4 of 4 roots rebuilt and chained to their global root`. If one event in the batch were altered, the rebuilt tenant root would differ and the check names the batch and position.

## Per-tenant roots

The export for tenant `acme` contains only acme's events and acme's roots, with the paths from those roots up to the published global roots. The verifier confirms the global root matches the Rekor entry, so acme's auditor learns that acme's events were committed publicly at that tick without learning anything about anyone else.
