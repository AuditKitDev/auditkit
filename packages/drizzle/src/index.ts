// ============================================
// @auditkit/drizzle — Drizzle ORM Integration
// ============================================
// Automatically log audit events for Drizzle
// insert/update/delete operations.

import type { AuditKit, LogOptions } from '@auditkit/sdk';

export interface DrizzleAuditConfig {
  /** AuditKit SDK client instance */
  client: AuditKit;

  /** Resolve actor from the current context (e.g. from AsyncLocalStorage) */
  getActor: () => LogOptions['actor'] | undefined;

  /** Resolve tenant ID from the current context */
  getTenantId: () => string | undefined;

  /** Tables to audit. If omitted, all tables are audited. */
  includeTables?: string[];

  /** Tables to skip. Applied after includeTables. */
  excludeTables?: string[];

  /** Map table+operation to a custom action string. Default: "table_name.operation" */
  actionMapper?: (table: string, operation: 'insert' | 'update' | 'delete') => string;
}

type Operation = 'insert' | 'update' | 'delete';

function defaultActionMapper(table: string, operation: Operation): string {
  return `${table}.${operation === 'insert' ? 'created' : operation === 'update' ? 'updated' : 'deleted'}`;
}

function shouldAudit(
  table: string,
  include?: string[],
  exclude?: string[]
): boolean {
  if (include && !include.includes(table)) return false;
  if (exclude && exclude.includes(table)) return false;
  return true;
}

/**
 * Creates a wrapper that intercepts Drizzle operations and logs audit events.
 *
 * Usage:
 * ```ts
 * import { withAudit } from '@auditkit/drizzle';
 * import { auditkit } from './audit';
 *
 * const audit = withAudit({
 *   client: auditkit,
 *   getActor: () => currentUser(),
 *   getTenantId: () => currentTenantId(),
 * });
 *
 * // Wrap individual operations
 * await audit.insert(db.insert(users).values({ name: 'Jane' }));
 * await audit.update(db.update(users).set({ name: 'Jane' }).where(eq(users.id, 1)));
 * await audit.delete(db.delete(users).where(eq(users.id, 1)));
 * ```
 */
export function withAudit(config: DrizzleAuditConfig) {
  const {
    client,
    getActor,
    getTenantId,
    includeTables,
    excludeTables,
    actionMapper = defaultActionMapper,
  } = config;

  async function auditOperation<T>(
    operation: Operation,
    tableName: string,
    execute: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    if (!shouldAudit(tableName, includeTables, excludeTables)) {
      return execute();
    }

    const actor = getActor();
    const tenantId = getTenantId();

    if (!actor || !tenantId) {
      return execute();
    }

    const result = await execute();

    const action = actionMapper(tableName, operation);

    // Fire-and-forget: prevent unhandled promise rejections from audit logging
    client.log(action, {
      actor,
      tenantId,
      category: 'data',
      metadata: {
        table: tableName,
        operation,
        ...meta,
      },
    }).catch(() => {});

    return result;
  }

  return {
    /**
     * Wrap a Drizzle insert query to auto-log an audit event.
     */
    async insert<T>(
      query: { execute: () => Promise<T> },
      tableName: string,
      meta?: Record<string, unknown>
    ): Promise<T> {
      return auditOperation('insert', tableName, () => query.execute(), meta);
    },

    /**
     * Wrap a Drizzle update query to auto-log an audit event.
     */
    async update<T>(
      query: { execute: () => Promise<T> },
      tableName: string,
      meta?: Record<string, unknown>
    ): Promise<T> {
      return auditOperation('update', tableName, () => query.execute(), meta);
    },

    /**
     * Wrap a Drizzle delete query to auto-log an audit event.
     */
    async delete<T>(
      query: { execute: () => Promise<T> },
      tableName: string,
      meta?: Record<string, unknown>
    ): Promise<T> {
      return auditOperation('delete', tableName, () => query.execute(), meta);
    },
  };
}

export type AuditWrapper = ReturnType<typeof withAudit>;
