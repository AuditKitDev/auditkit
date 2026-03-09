import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { forbidViewerTokens, type AuthContext } from '../middleware/auth.js';
import { tenants, merkleRoots, auditEvents } from '../db/schema.js';
import { verifyChain } from '../services/hash-chain.js';
import { generateProof, verifyProof } from '../services/merkle.js';
import { verifyEventSignature } from '../services/event-signing.js';
import type { Database } from '../db/index.js';

export function createVerifyRouter(db: Database) {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();
  router.use('*', forbidViewerTokens('Viewer tokens cannot access verification endpoints'));

  // GET /v1/verify — Verify hash chain integrity
  router.get('/', async (c) => {
    const auth = c.get('auth');
    const query = c.req.query();

    if (!query.tenant_id) {
      return c.json({ code: 'MISSING_PARAM', message: 'tenant_id query parameter is required' }, 400);
    }

    // Resolve tenant
    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(
        and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, query.tenant_id))
      )
      .limit(1);

    if (tenant.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && isNaN(from.getTime())) {
      return c.json({ code: 'INVALID_DATE', message: 'Invalid "from" date format' }, 400);
    }
    if (to && isNaN(to.getTime())) {
      return c.json({ code: 'INVALID_DATE', message: 'Invalid "to" date format' }, 400);
    }

    const result = await verifyChain(db, tenant[0].id, from, to);

    return c.json({
      valid: result.valid,
      events_checked: result.eventsChecked,
      first_event: result.firstEvent,
      last_event: result.lastEvent,
      chain_root_hash: result.chainRootHash,
      verified_at: new Date().toISOString(),
      broken_links: result.brokenLinks.length > 0 ? result.brokenLinks : undefined,
    });
  });

  // ==========================================
  // GET /v1/verify/merkle-roots — List all Merkle roots for a project
  // ==========================================
  router.get('/merkle-roots', async (c) => {
    const auth = c.get('auth');

    const roots = await db
      .select({
        id: merkleRoots.id,
        rootHash: merkleRoots.rootHash,
        eventCount: merkleRoots.eventCount,
        fromEventId: merkleRoots.fromEventId,
        toEventId: merkleRoots.toEventId,
        createdAt: merkleRoots.createdAt,
      })
      .from(merkleRoots)
      .where(eq(merkleRoots.projectId, auth.projectId))
      .orderBy(desc(merkleRoots.createdAt));

    return c.json({
      data: roots.map((r) => ({
        id: r.id,
        root_hash: r.rootHash,
        event_count: r.eventCount,
        from_event_id: r.fromEventId,
        to_event_id: r.toEventId,
        created_at: r.createdAt.toISOString(),
      })),
    });
  });

  // ==========================================
  // GET /v1/verify/merkle/:rootId — Get Merkle root and proof for a specific event
  // ==========================================
  router.get('/merkle/:rootId', async (c) => {
    const auth = c.get('auth');
    const rootId = c.req.param('rootId');
    const eventIdParam = c.req.query('event_id');

    // Look up the Merkle root
    const rootResult = await db
      .select()
      .from(merkleRoots)
      .where(
        and(eq(merkleRoots.id, rootId), eq(merkleRoots.projectId, auth.projectId))
      )
      .limit(1);

    if (rootResult.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Merkle root not found' }, 404);
    }

    const merkleRoot = rootResult[0];

    const response: Record<string, unknown> = {
      id: merkleRoot.id,
      root_hash: merkleRoot.rootHash,
      event_count: merkleRoot.eventCount,
      from_event_id: merkleRoot.fromEventId,
      to_event_id: merkleRoot.toEventId,
      created_at: merkleRoot.createdAt.toISOString(),
    };

    // If event_id is provided, generate a proof for that event
    if (eventIdParam) {
      const event = await db
        .select({ id: auditEvents.id, rowHash: auditEvents.rowHash })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventId, eventIdParam),
            eq(auditEvents.projectId, auth.projectId)
          )
        )
        .limit(1);

      if (event.length === 0) {
        return c.json({ code: 'NOT_FOUND', message: 'Event not found' }, 404);
      }

      const eventId = event[0].id;
      if (eventId < merkleRoot.fromEventId || eventId > merkleRoot.toEventId) {
        return c.json(
          { code: 'OUT_OF_RANGE', message: 'Event is not included in this Merkle root' },
          400
        );
      }

      // Find the index of this event within the batch
      const tree = merkleRoot.treeData as string[][];
      const leafIndex = tree[0].indexOf(event[0].rowHash);

      if (leafIndex === -1) {
        return c.json(
          { code: 'NOT_FOUND', message: 'Event hash not found in Merkle tree' },
          404
        );
      }

      const proof = generateProof(tree, leafIndex);
      const verified = verifyProof(event[0].rowHash, proof, merkleRoot.rootHash);

      response.proof = {
        event_id: eventIdParam,
        leaf_hash: event[0].rowHash,
        proof_path: proof,
        verified,
      };
    }

    return c.json(response);
  });

  // ==========================================
  // GET /v1/verify/signature/:eventId — Verify event signature
  // ==========================================
  router.get('/signature/:eventId', async (c) => {
    const auth = c.get('auth');
    const eventId = c.req.param('eventId');

    const event = await db
      .select({
        eventId: auditEvents.eventId,
        rowHash: auditEvents.rowHash,
        signature: auditEvents.signature,
        signingKeyId: auditEvents.signingKeyId,
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.eventId, eventId),
          eq(auditEvents.projectId, auth.projectId)
        )
      )
      .limit(1);

    if (event.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Event not found' }, 404);
    }

    const evt = event[0];

    if (!evt.signature || !evt.signingKeyId) {
      return c.json({
        event_id: evt.eventId,
        signed: false,
        message: 'Event was not signed',
      });
    }

    const result = await verifyEventSignature(
      db,
      evt.rowHash,
      evt.signature,
      evt.signingKeyId
    );

    return c.json({
      event_id: evt.eventId,
      signed: true,
      valid: result.valid,
      signing_key_id: evt.signingKeyId,
      public_key: result.publicKey,
      verified_at: new Date().toISOString(),
    });
  });

  return router;
}
