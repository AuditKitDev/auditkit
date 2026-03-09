import { createHash } from 'crypto';
import { eq, and, asc, desc, gt } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { auditEvents, merkleRoots } from '../db/schema.js';
import { logger } from './logger.js';

/**
 * Hash two values together using SHA-256.
 */
function hashPair(a: string, b: string): string {
  return createHash('sha256').update(a + b).digest('hex');
}

/**
 * Build a Merkle tree from a list of leaf hashes.
 * Returns the root hash and the full tree (array of levels, bottom-up).
 */
export function buildMerkleTree(hashes: string[]): { root: string; tree: string[][] } {
  if (hashes.length === 0) {
    return { root: '', tree: [] };
  }

  if (hashes.length === 1) {
    return { root: hashes[0], tree: [hashes] };
  }

  const tree: string[][] = [hashes];
  let currentLevel = hashes;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Odd node: duplicate it
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i]));
      }
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return { root: currentLevel[0], tree };
}

/**
 * Generate a Merkle proof for a leaf at a given index.
 * Returns proof entries with position info: { hash, position } where position
 * indicates whether the sibling is on the 'left' or 'right' side.
 */
export function generateProof(tree: string[][], index: number): Array<{ hash: string; position: 'left' | 'right' }> {
  if (tree.length === 0) return [];

  const proof: Array<{ hash: string; position: 'left' | 'right' }> = [];
  let currentIndex = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const layer = tree[level];
    const isRight = currentIndex % 2 === 1;
    const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < layer.length) {
      proof.push({ hash: layer[siblingIndex], position: isRight ? 'left' : 'right' });
    } else {
      // Odd node case: sibling is itself (duplicate)
      proof.push({ hash: layer[currentIndex], position: 'right' });
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

/**
 * Verify a Merkle proof: given a leaf hash, its proof path, and the expected root,
 * recompute the root and check it matches. Uses positional ordering consistent
 * with buildMerkleTree (left + right concatenation order).
 */
export function verifyProof(leaf: string, proof: Array<{ hash: string; position: 'left' | 'right' } | string>, root: string): boolean {
  if (!leaf || !root) return false;
  if (proof.length === 0) return leaf === root;

  let currentHash = leaf;

  for (let i = 0; i < proof.length; i++) {
    const entry = proof[i];
    if (typeof entry === 'string') {
      // Legacy format fallback: use positional index to determine order
      const sibling = entry;
      if (currentHash <= sibling) {
        currentHash = hashPair(currentHash, sibling);
      } else {
        currentHash = hashPair(sibling, currentHash);
      }
    } else {
      // Positional format: consistent with buildMerkleTree
      if (entry.position === 'left') {
        currentHash = hashPair(entry.hash, currentHash);
      } else {
        currentHash = hashPair(currentHash, entry.hash);
      }
    }
  }

  return currentHash === root;
}

/**
 * Batch events into Merkle trees for a project.
 * Processes unbatched events (events with IDs greater than the last batched toEventId).
 */
export async function batchEventsIntoMerkleTree(
  db: Database,
  projectId: string
): Promise<{ rootId: string; root: string; eventCount: number } | null> {
  // Find the last Merkle root for this project to know where we left off
  const lastRoot = await db
    .select({ toEventId: merkleRoots.toEventId })
    .from(merkleRoots)
    .where(eq(merkleRoots.projectId, projectId))
    .orderBy(desc(merkleRoots.createdAt))
    .limit(1);

  const fromId = lastRoot.length > 0 ? lastRoot[0].toEventId + 1 : 0;

  // Get unbatched events (up to batch size)
  const events = await db
    .select({
      id: auditEvents.id,
      rowHash: auditEvents.rowHash,
    })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.projectId, projectId),
        gt(auditEvents.id, fromId)
      )
    )
    .orderBy(asc(auditEvents.id))
    .limit(100);

  if (events.length === 0) {
    return null;
  }

  const hashes = events.map((e) => e.rowHash);
  const { root, tree } = buildMerkleTree(hashes);

  const [inserted] = await db
    .insert(merkleRoots)
    .values({
      projectId,
      rootHash: root,
      eventCount: events.length,
      fromEventId: events[0].id,
      toEventId: events[events.length - 1].id,
      treeData: tree,
    })
    .returning({ id: merkleRoots.id });

  return { rootId: inserted.id, root, eventCount: events.length };
}

/**
 * Start a background interval that batches events into Merkle trees.
 * Runs every hour for all projects that have unbatched events.
 */
export function startMerkleBatchCron(db: Database): void {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  const interval = setInterval(async () => {
    try {
      // Get all distinct project IDs with events
      const projectRows = await db
        .select({ projectId: auditEvents.projectId })
        .from(auditEvents)
        .groupBy(auditEvents.projectId);

      for (const row of projectRows) {
        try {
          await batchEventsIntoMerkleTree(db, row.projectId);
        } catch (err) {
          logger.error({ err, projectId: row.projectId }, 'Error batching project for Merkle tree');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Merkle cron error');
    }
  }, INTERVAL_MS);
  interval.unref();
}
