---
layout: ../../layouts/BlogPost.astro
title: "Immutable audit logs in Postgres: what a DB admin can still do"
description: "REVOKE, triggers, pgaudit and hash-chain columns each stop something; none stops a superuser, a restore from backup, or a dropped partition. What an external anchor changes."
lede: "An append-only table with REVOKE UPDATE, DELETE and a trigger stops the application from editing history; it does not stop a superuser, a restore from backup, or a dropped partition. Immutability inside one database is a permission, not a proof."
date: 2026-10-05
tags: [postgres]
---

## Triggers and REVOKE

`REVOKE UPDATE, DELETE ON audit FROM app_role` and a `BEFORE UPDATE OR DELETE` trigger that raises are the standard first step. They stop the application. They do not stop the owner role, any superuser, `ALTER TABLE … DISABLE TRIGGER`, or a session with `session_replication_role = replica`, which skips triggers entirely. The people who hold those are exactly the people an auditor asks about: ISO 27001's A.8.15 guidance says to "ensure that administrators who manage systems cannot modify or delete the logs those systems generate."

## pgaudit

pgaudit logs statements to the Postgres log. It is an audit of the database, written to files the same administrators rotate. It is useful for forensics after the fact and it is not an immutable store.

## A hash chain in SQL

Add `prev_hash` and `event_hash` columns and compute them in a trigger. Now a single edited row breaks the chain. A DBA with a few minutes recomputes every hash from that row forward and the chain is consistent again. Nobody outside the database can tell, because nobody outside has a copy of what the chain used to be.

## The backup problem

Restore last week's backup and the last week of events is gone, with no chain break at all: the chain simply ends earlier. Without an external record of how long the chain was, truncation is invisible.

## What an external anchor changes

Publish a Merkle root over each batch of events to a log the DBA cannot edit. Now the recomputed chain produces a root that does not match the published one, and a truncated chain lacks events the published root covers. Hacker News practitioners put it in one sentence: "If you want immutable logs, you log to an external log server. Anything else seems security theater to me." The external log here is Sigstore Rekor and Bitcoin via OpenTimestamps.

## When to buy, when to self-host

Keep your Postgres audit table; it is good for queries. Add the receipt and the anchor by sending each row to AuditKit, or run AuditKit yourself under AGPL: one container, SQLite, the same verifier. The [comparison page](/compare/postgres) covers pgaudit, immudb, Retraced, the cloud ledgers and the retired Amazon QLDB.
