import { Hono } from 'hono';
import { eq, and, desc, gte, lt, ilike, inArray } from 'drizzle-orm';
import type { SessionUser, SessionProject } from '../middleware/session-auth.js';
import { auditEvents, tenants, exportJobs } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { uploadExport, getExportDownloadUrl, isS3Configured } from '../services/export-storage.js';
import { logger } from '../services/logger.js';

interface ExportFilters {
  date_from?: string;
  date_to?: string;
  tenant_id?: string;
  action?: string;
  severity?: string;
}

export function createExportRouter(db: Database) {
  const router = new Hono<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>();

  // ==========================================
  // POST /dashboard/exports — create export job
  // ==========================================
  router.post('/', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = body.project_id || userProjects[0].id;

    // Validate project ownership
    if (!userProjects.some((p) => p.id === projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'You do not have access to this project' }, 403);
    }

    const format: string = body.format || 'json';

    if (format !== 'csv' && format !== 'json') {
      return c.json({ code: 'INVALID_FORMAT', message: 'format must be "csv" or "json"' }, 400);
    }

    const filters: ExportFilters = {
      date_from: body.date_from ?? undefined,
      date_to: body.date_to ?? undefined,
      tenant_id: body.tenant_id ?? undefined,
      action: body.action ?? undefined,
      severity: body.severity ?? undefined,
    };

    // Create the export job
    const [job] = await db
      .insert(exportJobs)
      .values({
        projectId,
        status: 'processing',
        format,
        filters: filters as Record<string, unknown>,
      })
      .returning();

    // TODO: Move export processing to a background worker (e.g. BullMQ) to avoid
    // request timeouts on large exports. Currently processes synchronously.
    try {
      const data = await queryFilteredEvents(db, projectId, filters);
      let fileContent: string;
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';

      if (format === 'csv') {
        fileContent = generateCSV(data);
      } else {
        fileContent = JSON.stringify({ data, count: data.length }, null, 2);
      }

      let storedValue: string;

      if (isS3Configured()) {
        const extension = format === 'csv' ? 'csv' : 'json';
        const s3Key = `exports/${projectId}/${job.id}.${extension}`;
        const s3Uri = await uploadExport(s3Key, fileContent, contentType);
        storedValue = s3Uri;
      } else {
        // Fall back to storing content in DB (for local dev)
        storedValue = fileContent;
      }

      await db
        .update(exportJobs)
        .set({
          status: 'completed',
          fileUrl: storedValue,
          completedAt: new Date(),
        })
        .where(eq(exportJobs.id, job.id));

      return c.json(
        {
          id: job.id,
          project_id: projectId,
          status: 'completed',
          format,
          filters,
          created_at: job.createdAt.toISOString(),
          completed_at: new Date().toISOString(),
        },
        201
      );
    } catch (err) {
      await db
        .update(exportJobs)
        .set({ status: 'failed' })
        .where(eq(exportJobs.id, job.id));

      logger.error({ err }, 'Export job failed');
      return c.json({ code: 'EXPORT_FAILED', message: 'Export processing failed' }, 500);
    }
  });

  // ==========================================
  // GET /dashboard/exports — list export jobs
  // ==========================================
  router.get('/', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = c.req.query('project_id') || userProjects[0].id;

    // Validate project ownership
    if (!userProjects.some((p) => p.id === projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'You do not have access to this project' }, 403);
    }

    const jobs = await db
      .select({
        id: exportJobs.id,
        projectId: exportJobs.projectId,
        status: exportJobs.status,
        format: exportJobs.format,
        filters: exportJobs.filters,
        createdAt: exportJobs.createdAt,
        completedAt: exportJobs.completedAt,
      })
      .from(exportJobs)
      .where(eq(exportJobs.projectId, projectId))
      .orderBy(desc(exportJobs.createdAt))
      .limit(50);

    return c.json({
      data: jobs.map((j) => ({
        id: j.id,
        project_id: j.projectId,
        status: j.status,
        format: j.format,
        filters: j.filters,
        created_at: j.createdAt.toISOString(),
        completed_at: j.completedAt?.toISOString() ?? null,
      })),
    });
  });

  // ==========================================
  // GET /dashboard/exports/:id/download — download export
  // ==========================================
  router.get('/:id/download', async (c) => {
    const userProjects = c.get('projects');
    const exportId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const result = await db
      .select()
      .from(exportJobs)
      .where(and(eq(exportJobs.id, exportId), inArray(exportJobs.projectId, projectIds)))
      .limit(1);

    if (result.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Export job not found' }, 404);
    }

    const job = result[0];

    if (job.status !== 'completed' || !job.fileUrl) {
      return c.json(
        { code: 'NOT_READY', message: `Export is ${job.status}` },
        job.status === 'failed' ? 410 : 202
      );
    }

    // If stored in S3, generate a pre-signed URL and redirect
    if (job.fileUrl.startsWith('s3://')) {
      const s3Key = job.fileUrl.replace(/^s3:\/\/[^/]+\//, '');
      const downloadUrl = await getExportDownloadUrl(s3Key);
      return c.redirect(downloadUrl, 302);
    }

    // Otherwise, serve content directly (backward compat / local dev)
    const contentType = job.format === 'csv' ? 'text/csv' : 'application/json';
    const extension = job.format === 'csv' ? 'csv' : 'json';

    return new Response(job.fileUrl, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="auditkit-export-${job.id}.${extension}"`,
      },
    });
  });

  return router;
}

// --- Helper: query filtered events ---
async function queryFilteredEvents(
  db: Database,
  projectId: string,
  filters: ExportFilters
) {
  const conditions = [eq(auditEvents.projectId, projectId)];

  if (filters.date_from) {
    conditions.push(gte(auditEvents.occurredAt, new Date(filters.date_from)));
  }

  if (filters.date_to) {
    conditions.push(lt(auditEvents.occurredAt, new Date(filters.date_to)));
  }

  if (filters.tenant_id) {
    // Resolve external tenant ID to internal
    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(
        and(eq(tenants.projectId, projectId), eq(tenants.externalId, filters.tenant_id))
      )
      .limit(1);

    if (tenant.length > 0) {
      conditions.push(eq(auditEvents.tenantId, tenant[0].id));
    }
  }

  if (filters.action) {
    if (filters.action.includes('*')) {
      const pattern = filters.action.replace(/\*/g, '%');
      conditions.push(ilike(auditEvents.action, pattern));
    } else {
      conditions.push(eq(auditEvents.action, filters.action));
    }
  }

  if (filters.severity) {
    conditions.push(eq(auditEvents.severity, filters.severity));
  }

  const events = await db
    .select({
      eventId: auditEvents.eventId,
      action: auditEvents.action,
      category: auditEvents.category,
      severity: auditEvents.severity,
      actorId: auditEvents.actorId,
      actorName: auditEvents.actorName,
      actorEmail: auditEvents.actorEmail,
      targetType: auditEvents.targetType,
      targetId: auditEvents.targetId,
      targetName: auditEvents.targetName,
      sourceIp: auditEvents.sourceIp,
      description: auditEvents.description,
      metadata: auditEvents.metadata,
      occurredAt: auditEvents.occurredAt,
      isFailure: auditEvents.isFailure,
      isAnomalous: auditEvents.isAnomalous,
    })
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(10000);

  return events.map((e) => ({
    event_id: e.eventId,
    action: e.action,
    category: e.category,
    severity: e.severity,
    actor_id: e.actorId,
    actor_name: e.actorName,
    actor_email: e.actorEmail,
    target_type: e.targetType,
    target_id: e.targetId,
    target_name: e.targetName,
    source_ip: e.sourceIp,
    description: e.description,
    metadata: e.metadata,
    occurred_at: e.occurredAt.toISOString(),
    is_failure: e.isFailure,
    is_anomalous: e.isAnomalous,
  }));
}

// --- Helper: escape CSV field with formula injection protection ---
function escapeCsvField(val: unknown): string {
  let str = String(val ?? '');
  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// --- Helper: generate CSV ---
function generateCSV(
  data: Array<Record<string, unknown>>
): string {
  if (data.length === 0) return '';

  const headers = [
    'event_id',
    'action',
    'category',
    'severity',
    'actor_id',
    'actor_name',
    'actor_email',
    'target_type',
    'target_id',
    'target_name',
    'source_ip',
    'description',
    'occurred_at',
    'is_failure',
    'is_anomalous',
  ];

  const rows = data.map((row) =>
    headers
      .map((h) => escapeCsvField(row[h]))
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
