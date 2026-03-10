import { Hono } from 'hono';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  graphql,
} from 'graphql';
import { GraphQLJSON } from './graphql-scalars.js';
import { eq, and, desc, gte, lt, gt, ilike, or, count as sqlCount } from 'drizzle-orm';
import { forbidViewerTokens, type AuthContext } from '../middleware/auth.js';
import { auditEvents, merkleRoots } from '../db/schema.js';
import { computeRowHash } from '../services/hash-chain.js';
import type { Database } from '../db/index.js';

const MAX_QUERY_DEPTH = 7;

function getQueryDepth(query: string): number {
  let depth = 0;
  let maxDepth = 0;
  for (const char of query) {
    if (char === '{') {
      depth++;
      if (depth > maxDepth) maxDepth = depth;
    } else if (char === '}') {
      depth--;
    }
  }
  return maxDepth;
}

// ============================================
// GraphQL Types
// ============================================

const AuditEventType = new GraphQLObjectType({
  name: 'AuditEvent',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    actorId: { type: GraphQLString },
    actorName: { type: GraphQLString },
    actorEmail: { type: GraphQLString },
    targetType: { type: GraphQLString },
    targetId: { type: GraphQLString },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    severity: { type: new GraphQLNonNull(GraphQLString) },
    metadata: { type: GraphQLJSON },
    hash: { type: GraphQLString },
    prevHash: { type: GraphQLString },
    signature: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const PageInfoType = new GraphQLObjectType({
  name: 'PageInfo',
  fields: () => ({
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    startCursor: { type: GraphQLString },
    endCursor: { type: GraphQLString },
  }),
});

const EventEdgeType = new GraphQLObjectType({
  name: 'EventEdge',
  fields: () => ({
    node: { type: new GraphQLNonNull(AuditEventType) },
    cursor: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const EventConnectionType = new GraphQLObjectType({
  name: 'EventConnection',
  fields: () => ({
    edges: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EventEdgeType))) },
    pageInfo: { type: new GraphQLNonNull(PageInfoType) },
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const MerkleRootType = new GraphQLObjectType({
  name: 'MerkleRoot',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    rootHash: { type: new GraphQLNonNull(GraphQLString) },
    eventCount: { type: new GraphQLNonNull(GraphQLInt) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const VerificationResultType = new GraphQLObjectType({
  name: 'VerificationResult',
  fields: () => ({
    valid: { type: new GraphQLNonNull(GraphQLBoolean) },
    hash: { type: GraphQLString },
    prevHash: { type: GraphQLString },
    chainIntact: { type: new GraphQLNonNull(GraphQLBoolean) },
    merkleProof: { type: new GraphQLList(GraphQLString) },
  }),
});

// ============================================
// Helpers
// ============================================

function encodeCursor(id: number): string {
  return Buffer.from(String(id)).toString('base64');
}

function decodeCursor(cursor: string): number {
  return Number(Buffer.from(cursor, 'base64').toString());
}

function mapEventToGraphQL(event: typeof auditEvents.$inferSelect) {
  return {
    id: event.eventId,
    action: event.action,
    actorId: event.actorId,
    actorName: event.actorName,
    actorEmail: event.actorEmail,
    targetType: event.targetType,
    targetId: event.targetId,
    tenantId: event.tenantId,
    severity: event.severity,
    metadata: event.metadata,
    hash: event.rowHash,
    prevHash: event.prevHash,
    signature: event.signature,
    createdAt: event.occurredAt.toISOString(),
  };
}

// ============================================
// Schema Builder
// ============================================

function buildSchema(db: Database, projectId: string) {
  const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      events: {
        type: new GraphQLNonNull(EventConnectionType),
        args: {
          tenantId: { type: GraphQLString },
          action: { type: GraphQLString },
          severity: { type: GraphQLString },
          after: { type: GraphQLString },
          before: { type: GraphQLString },
          first: { type: GraphQLInt },
          last: { type: GraphQLInt },
          cursor: { type: GraphQLString },
        },
        resolve: async (_root, args) => {
          const conditions: any[] = [eq(auditEvents.projectId, projectId)];

          if (args.tenantId) {
            conditions.push(eq(auditEvents.tenantId, args.tenantId));
          }
          if (args.action) {
            if (args.action.includes('*')) {
              conditions.push(ilike(auditEvents.action, args.action.replace(/\*/g, '%')));
            } else {
              conditions.push(eq(auditEvents.action, args.action));
            }
          }
          if (args.severity) {
            const severities = args.severity.split(',');
            conditions.push(or(...severities.map((s: string) => eq(auditEvents.severity, s)))!);
          }
          if (args.after) {
            conditions.push(gte(auditEvents.occurredAt, new Date(args.after)));
          }
          if (args.before) {
            conditions.push(lt(auditEvents.occurredAt, new Date(args.before)));
          }

          const limit = args.first ?? args.last ?? 50;
          const clampedLimit = Math.min(limit, 100);

          if (args.cursor) {
            try {
              const cursorId = decodeCursor(args.cursor);
              conditions.push(lt(auditEvents.id, cursorId));
            } catch {
              // Invalid cursor, skip
            }
          }

          // Fetch total count
          const countResult = await db
            .select({ count: sqlCount() })
            .from(auditEvents)
            .where(and(...conditions));
          const totalCount = Number(countResult[0]?.count ?? 0);

          // Fetch events + 1 to check for next page
          const events = await db
            .select()
            .from(auditEvents)
            .where(and(...conditions))
            .orderBy(desc(auditEvents.id))
            .limit(clampedLimit + 1);

          const hasNextPage = events.length > clampedLimit;
          if (hasNextPage) events.pop();

          const edges = events.map((event) => ({
            node: mapEventToGraphQL(event),
            cursor: encodeCursor(event.id),
          }));

          return {
            edges,
            pageInfo: {
              hasNextPage,
              hasPreviousPage: !!args.cursor,
              startCursor: edges.length > 0 ? edges[0].cursor : null,
              endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            },
            totalCount,
          };
        },
      },

      event: {
        type: AuditEventType,
        args: {
          id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_root, args) => {
          const result = await db
            .select()
            .from(auditEvents)
            .where(and(eq(auditEvents.projectId, projectId), eq(auditEvents.eventId, args.id)))
            .limit(1);

          if (result.length === 0) return null;
          return mapEventToGraphQL(result[0]);
        },
      },

      merkleRoots: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MerkleRootType))),
        args: {
          first: { type: GraphQLInt },
          cursor: { type: GraphQLString },
        },
        resolve: async (_root, args) => {
          const conditions: any[] = [eq(merkleRoots.projectId, projectId)];
          const limit = Math.min(args.first ?? 20, 100);

          if (args.cursor) {
            try {
              const cursorDate = Buffer.from(args.cursor, 'base64').toString();
              conditions.push(lt(merkleRoots.createdAt, new Date(cursorDate)));
            } catch {
              // Invalid cursor, skip
            }
          }

          const roots = await db
            .select()
            .from(merkleRoots)
            .where(and(...conditions))
            .orderBy(desc(merkleRoots.createdAt))
            .limit(limit);

          return roots.map((root) => ({
            id: root.id,
            rootHash: root.rootHash,
            eventCount: root.eventCount,
            createdAt: root.createdAt.toISOString(),
          }));
        },
      },

      verify: {
        type: new GraphQLNonNull(VerificationResultType),
        args: {
          eventId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_root, args) => {
          // Fetch the event
          const result = await db
            .select()
            .from(auditEvents)
            .where(and(eq(auditEvents.projectId, projectId), eq(auditEvents.eventId, args.eventId)))
            .limit(1);

          if (result.length === 0) {
            return {
              valid: false,
              hash: null,
              prevHash: null,
              chainIntact: false,
              merkleProof: null,
            };
          }

          const event = result[0];

          // Recompute hash to verify
          const recomputedHash = computeRowHash(
            {
              id: event.id,
              tenantId: event.tenantId,
              action: event.action,
              actorId: event.actorId,
              targetType: event.targetType,
              targetId: event.targetId,
              occurredAt: event.occurredAt,
              sourceIp: event.sourceIp,
              metadata: event.metadata ?? {},
            },
            event.prevHash
          );

          const hashValid = recomputedHash === event.rowHash;

          // Check chain integrity: verify the next event's prevHash links to this event
          let chainIntact = hashValid;
          if (hashValid) {
            const nextEvent = await db
              .select({ prevHash: auditEvents.prevHash })
              .from(auditEvents)
              .where(
                and(
                  eq(auditEvents.projectId, projectId),
                  eq(auditEvents.tenantId, event.tenantId),
                  gt(auditEvents.id, event.id)
                )
              )
              .orderBy(auditEvents.id)
              .limit(1);

            // If there's a next event, check it points back to this event's hash
            if (nextEvent.length > 0) {
              chainIntact = nextEvent[0].prevHash === event.rowHash;
            }
          }

          return {
            valid: hashValid,
            hash: event.rowHash,
            prevHash: event.prevHash,
            chainIntact,
            merkleProof: null, // TODO: Merkle proof extraction is not implemented for GraphQL verify responses yet.
          };
        },
      },
    },
  });

  return new GraphQLSchema({ query: queryType });
}

// ============================================
// Router
// ============================================

export function createGraphQLRouter(db: Database) {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();
  router.use('*', forbidViewerTokens('Viewer tokens cannot access GraphQL endpoints'));

  router.post('/', async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    const { query, variables, operationName } = body;

    if (!query) {
      return c.json({ errors: [{ message: 'Query is required' }] }, 400);
    }

    if (getQueryDepth(query) > MAX_QUERY_DEPTH) {
      return c.json({ errors: [{ message: 'Query depth exceeds maximum allowed depth of 7' }] }, 400);
    }

    const schema = buildSchema(db, auth.projectId);

    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
    });

    return c.json(result);
  });

  // Support GET requests for simple queries
  router.get('/', async (c) => {
    const auth = c.get('auth');
    const query = c.req.query('query');
    const variables = c.req.query('variables');
    const operationName = c.req.query('operationName');

    if (!query) {
      return c.json({ errors: [{ message: 'Query is required' }] }, 400);
    }

    if (getQueryDepth(query) > MAX_QUERY_DEPTH) {
      return c.json({ errors: [{ message: 'Query depth exceeds maximum allowed depth of 7' }] }, 400);
    }

    let parsedVariables: Record<string, unknown> | undefined;
    if (variables) {
      try {
        parsedVariables = JSON.parse(variables);
      } catch {
        return c.json({ errors: [{ message: 'Invalid JSON in variables parameter' }] }, 400);
      }
    }

    const schema = buildSchema(db, auth.projectId);

    const result = await graphql({
      schema,
      source: query,
      variableValues: parsedVariables,
      operationName: operationName ?? undefined,
    });

    return c.json(result);
  });

  return router;
}
