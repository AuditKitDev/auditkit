// ============================================
// @auditkit/sdk — Client-side Hash Verification
// ============================================

import { createHash } from 'crypto';

export interface HashableFields {
  id: string;
  tenantId: string;
  action: string;
  actorId: string;
  targetType: string | null;
  targetId: string | null;
  occurredAt: string;
  sourceIp: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Canonicalize metadata by sorting keys deterministically.
 * Matches the jsonb normalization behavior in Postgres.
 */
function canonicalizeMetadata(metadata: Record<string, unknown>): string {
  const sorted = Object.keys(metadata)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = metadata[key];
        return acc;
      },
      {} as Record<string, unknown>
    );
  return JSON.stringify(sorted);
}

/**
 * Compute SHA-256 hash of an audit event chained to the previous hash.
 * Uses null byte (\x00) as separator to prevent delimiter collision.
 */
export function computeRowHash(event: HashableFields, prevHash: string | null): string {
  const canonical = [
    event.id,
    event.tenantId,
    event.action,
    event.actorId,
    event.targetType ?? '',
    event.targetId ?? '',
    event.occurredAt,
    event.sourceIp ?? '',
    canonicalizeMetadata(event.metadata),
    prevHash ?? 'GENESIS',
  ].join('\x00');

  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Verify that a hash matches the expected computation.
 */
export function verifyHash(event: HashableFields, prevHash: string | null, expectedHash: string): boolean {
  return computeRowHash(event, prevHash) === expectedHash;
}
