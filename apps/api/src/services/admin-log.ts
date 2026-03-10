import { adminActivityLogs } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { logger } from './logger.js';

let _db: Database | null = null;

export function initAdminLog(db: Database) {
  _db = db;
}

export async function logAdminActivity(params: {
  actorId?: string;
  actorEmail: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (!_db) return;

  try {
    await _db.insert(adminActivityLogs).values({
      actorId: params.actorId ?? null,
      actorEmail: params.actorEmail,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (err) {
    logger.warn({ err, action: params.action }, 'Failed to write admin activity log');
  }
}
