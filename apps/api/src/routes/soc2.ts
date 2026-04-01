import { Hono } from 'hono';
import { createHash } from 'crypto';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import type { SessionUser, SessionProject } from '../middleware/session-auth.js';
import type { Database } from '../db/index.js';
import {
  evidence,
  evidenceTags,
  controls,
  controlFrameworks,
  policies,
  policyVersions,
  policyAcknowledgments,
  accessReviews,
  accessReviewEntries,
  vendors,
  vendorDocuments,
  risks,
  incidents,
  personnel,
} from '../db/schema.js';
import { SOC2_CONTROLS } from '@auditkit/shared';

function getValidProjectId(projectId: string | undefined, userProjects: { id: string }[]): string | null {
  const id = projectId || userProjects[0]?.id;
  if (!id) return null;
  if (!userProjects.some(p => p.id === id)) return null;
  return id;
}

export function createSoc2Router(db: Database) {
  const router = new Hono<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>();

  // ============================================
  // Evidence Vault
  // ============================================

  // GET /evidence — list evidence for project
  router.get('/evidence', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const controlId = c.req.query('control_id');
    const type = c.req.query('type');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(evidence.projectId, projectId)];
    if (type) conditions.push(eq(evidence.type, type));

    let query = db
      .select()
      .from(evidence)
      .where(and(...conditions))
      .orderBy(desc(evidence.createdAt))
      .limit(limit)
      .offset(offset);

    // If filtering by control_id, join through evidence_tags
    let rows;
    if (controlId) {
      rows = await db
        .select({
          id: evidence.id,
          projectId: evidence.projectId,
          title: evidence.title,
          description: evidence.description,
          type: evidence.type,
          fileUrl: evidence.fileUrl,
          externalUrl: evidence.externalUrl,
          fileName: evidence.fileName,
          fileSize: evidence.fileSize,
          fileHash: evidence.fileHash,
          chainHash: evidence.chainHash,
          collectedBy: evidence.collectedBy,
          autoSource: evidence.autoSource,
          auditPeriodStart: evidence.auditPeriodStart,
          auditPeriodEnd: evidence.auditPeriodEnd,
          createdAt: evidence.createdAt,
          updatedAt: evidence.updatedAt,
        })
        .from(evidence)
        .innerJoin(evidenceTags, eq(evidenceTags.evidenceId, evidence.id))
        .where(and(eq(evidence.projectId, projectId), eq(evidenceTags.controlId, controlId), ...(type ? [eq(evidence.type, type)] : [])))
        .orderBy(desc(evidence.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await query;
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(evidence)
      .where(eq(evidence.projectId, projectId));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        auditPeriodStart: r.auditPeriodStart?.toISOString() || null,
        auditPeriodEnd: r.auditPeriodEnd?.toISOString() || null,
      })),
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  });

  // POST /evidence — create evidence record
  router.post('/evidence', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.title?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'title is required' }, 400);
    }
    if (!body.type?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'type is required' }, 400);
    }

    const chainHash = createHash('sha256')
      .update(`${body.fileHash || ''}-${Date.now()}`)
      .digest('hex');

    const [record] = await db
      .insert(evidence)
      .values({
        projectId,
        title: body.title,
        description: body.description,
        type: body.type,
        fileUrl: body.fileUrl,
        externalUrl: body.externalUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        fileHash: body.fileHash,
        chainHash,
        collectedBy: user.id,
      })
      .returning();

    return c.json({
      data: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        auditPeriodStart: record.auditPeriodStart?.toISOString() || null,
        auditPeriodEnd: record.auditPeriodEnd?.toISOString() || null,
      },
    }, 201);
  });

  // GET /evidence/stats — evidence statistics
  router.get('/evidence/stats', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const [totalResult] = await db
      .select({ count: count() })
      .from(evidence)
      .where(eq(evidence.projectId, projectId));

    const byType = await db
      .select({ type: evidence.type, count: count() })
      .from(evidence)
      .where(eq(evidence.projectId, projectId))
      .groupBy(evidence.type);

    const byFramework = await db
      .select({ framework: evidenceTags.framework, count: count() })
      .from(evidenceTags)
      .innerJoin(evidence, eq(evidence.id, evidenceTags.evidenceId))
      .where(eq(evidence.projectId, projectId))
      .groupBy(evidenceTags.framework);

    // Controls without evidence (gaps)
    const gaps = await db
      .select({
        id: controls.id,
        criteriaId: controls.criteriaId,
        title: controls.title,
        framework: controls.framework,
      })
      .from(controls)
      .leftJoin(evidenceTags, eq(evidenceTags.controlId, controls.id))
      .where(and(eq(controls.projectId, projectId), sql`${evidenceTags.id} IS NULL`));

    return c.json({
      data: {
        total: totalResult.count,
        byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
        byFramework: Object.fromEntries(byFramework.map((r) => [r.framework, r.count])),
        gaps,
      },
    });
  });

  // GET /evidence/:id — get single evidence with tags
  router.get('/evidence/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [record] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, id));

    if (!record) return c.json({ code: 'NOT_FOUND', message: 'Evidence not found' }, 404);
    if (!userProjects.some(p => p.id === record.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const tags = await db
      .select()
      .from(evidenceTags)
      .where(eq(evidenceTags.evidenceId, id));

    return c.json({
      data: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        auditPeriodStart: record.auditPeriodStart?.toISOString() || null,
        auditPeriodEnd: record.auditPeriodEnd?.toISOString() || null,
        tags,
      },
    });
  });

  // PUT /evidence/:id — update evidence
  router.put('/evidence/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(evidence).where(eq(evidence.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Evidence not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(evidence)
      .set({
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        auditPeriodStart: body.auditPeriodStart ? new Date(body.auditPeriodStart) : existing.auditPeriodStart,
        auditPeriodEnd: body.auditPeriodEnd ? new Date(body.auditPeriodEnd) : existing.auditPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(evidence.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        auditPeriodStart: updated.auditPeriodStart?.toISOString() || null,
        auditPeriodEnd: updated.auditPeriodEnd?.toISOString() || null,
      },
    });
  });

  // DELETE /evidence/:id — delete evidence
  router.delete('/evidence/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [existing] = await db.select().from(evidence).where(eq(evidence.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Evidence not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(evidence).where(eq(evidence.id, id));
    return c.json({ data: { id } });
  });

  // POST /evidence/:id/tags — add control tag to evidence
  router.post('/evidence/:id/tags', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(evidence).where(eq(evidence.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Evidence not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!body.framework?.trim() || !body.criteriaId?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'framework and criteriaId are required' }, 400);
    }

    const [tag] = await db
      .insert(evidenceTags)
      .values({
        evidenceId: id,
        controlId: body.controlId,
        framework: body.framework,
        criteriaId: body.criteriaId,
      })
      .returning();

    return c.json({ data: tag }, 201);
  });

  // DELETE /evidence/:id/tags/:tagId — remove tag
  router.delete('/evidence/:id/tags/:tagId', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const tagId = c.req.param('tagId');

    const [existing] = await db.select().from(evidence).where(eq(evidence.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Evidence not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(evidenceTags).where(and(eq(evidenceTags.id, tagId), eq(evidenceTags.evidenceId, id)));
    return c.json({ data: { id: tagId } });
  });

  // ============================================
  // Controls
  // ============================================

  // GET /controls — list controls for project (auto-seed if empty)
  router.get('/controls', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const framework = c.req.query('framework') || 'soc2';

    let rows = await db
      .select()
      .from(controls)
      .where(and(eq(controls.projectId, projectId), eq(controls.framework, framework)))
      .orderBy(controls.criteriaId);

    // Auto-seed from controlFrameworks if none exist for this project
    if (rows.length === 0) {
      let templates = await db
        .select()
        .from(controlFrameworks)
        .where(eq(controlFrameworks.framework, framework));

      // If controlFrameworks table is also empty, seed it from shared constants
      if (templates.length === 0 && framework === 'soc2') {
        await db.insert(controlFrameworks).values(
          SOC2_CONTROLS.map((c) => ({
            framework: c.framework,
            criteriaId: c.criteriaId,
            title: c.title,
            description: c.description,
            category: c.category,
          }))
        ).onConflictDoNothing();

        templates = await db
          .select()
          .from(controlFrameworks)
          .where(eq(controlFrameworks.framework, framework));
      }

      if (templates.length > 0) {
        // Enrich with whatAuditorsWant and evidenceGuidance from shared constants
        const soc2Map = new Map(SOC2_CONTROLS.map(c => [c.criteriaId, c]));

        await db.insert(controls).values(
          templates.map((t) => {
            const shared = soc2Map.get(t.criteriaId);
            return {
              projectId,
              framework: t.framework,
              criteriaId: t.criteriaId,
              title: t.title,
              description: t.description,
              whatAuditorsWant: shared?.whatAuditorsWant ?? null,
              evidenceGuidance: shared?.evidenceGuidance ?? null,
            };
          })
        );

        rows = await db
          .select()
          .from(controls)
          .where(and(eq(controls.projectId, projectId), eq(controls.framework, framework)))
          .orderBy(controls.criteriaId);
      }
    }

    return c.json({
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });

  // GET /controls/readiness — readiness stats
  router.get('/controls/readiness', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const framework = c.req.query('framework') || 'soc2';

    const [totalResult] = await db
      .select({ count: count() })
      .from(controls)
      .where(and(eq(controls.projectId, projectId), eq(controls.framework, framework)));

    const byStatus = await db
      .select({ status: controls.implementationStatus, count: count() })
      .from(controls)
      .where(and(eq(controls.projectId, projectId), eq(controls.framework, framework)))
      .groupBy(controls.implementationStatus);

    const byCategory = await db
      .select({
        category: sql<string>`COALESCE(${controlFrameworks.category}, 'uncategorized')`,
        total: count(),
        ready: sql<number>`COUNT(CASE WHEN ${controls.implementationStatus} = 'ready' THEN 1 END)`,
        verified: sql<number>`COUNT(CASE WHEN ${controls.implementationStatus} = 'verified' THEN 1 END)`,
        in_progress: sql<number>`COUNT(CASE WHEN ${controls.implementationStatus} = 'in_progress' THEN 1 END)`,
        not_started: sql<number>`COUNT(CASE WHEN ${controls.implementationStatus} = 'not_started' THEN 1 END)`,
      })
      .from(controls)
      .leftJoin(controlFrameworks, and(
        eq(controlFrameworks.framework, controls.framework),
        eq(controlFrameworks.criteriaId, controls.criteriaId),
      ))
      .where(and(eq(controls.projectId, projectId), eq(controls.framework, framework)))
      .groupBy(sql`COALESCE(${controlFrameworks.category}, 'uncategorized')`);

    const total = totalResult.count;
    const readyCount = byStatus.filter(s => s.status === 'ready' || s.status === 'verified').reduce((sum, s) => sum + s.count, 0);
    const percentReady = total > 0 ? Math.round((readyCount / total) * 100) : 0;

    return c.json({
      data: {
        total,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s.count])),
        percentReady,
        byCategory,
      },
    });
  });

  // GET /controls/:id — single control with linked evidence
  router.get('/controls/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [control] = await db.select().from(controls).where(eq(controls.id, id));
    if (!control) return c.json({ code: 'NOT_FOUND', message: 'Control not found' }, 404);
    if (!userProjects.some(p => p.id === control.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const linkedEvidence = await db
      .select({
        id: evidence.id,
        title: evidence.title,
        type: evidence.type,
        fileName: evidence.fileName,
        createdAt: evidence.createdAt,
      })
      .from(evidence)
      .innerJoin(evidenceTags, eq(evidenceTags.evidenceId, evidence.id))
      .where(eq(evidenceTags.controlId, id));

    return c.json({
      data: {
        ...control,
        createdAt: control.createdAt.toISOString(),
        updatedAt: control.updatedAt.toISOString(),
        evidence: linkedEvidence.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    });
  });

  // PUT /controls/:id — update control
  router.put('/controls/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(controls).where(eq(controls.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Control not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(controls)
      .set({
        implementationStatus: body.implementationStatus ?? existing.implementationStatus,
        ownerId: body.ownerId ?? existing.ownerId,
        notes: body.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(controls.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  // ============================================
  // Policies
  // ============================================

  // GET /policies — list policies for project
  router.get('/policies', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rows = await db
      .select()
      .from(policies)
      .where(eq(policies.projectId, projectId))
      .orderBy(desc(policies.createdAt));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        nextReviewDate: r.nextReviewDate?.toISOString() || null,
      })),
    });
  });

  // POST /policies — create policy with initial version
  router.post('/policies', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.title?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'title is required' }, 400);
    }

    const [policy] = await db
      .insert(policies)
      .values({
        projectId,
        title: body.title,
        slug: body.slug,
        category: body.category,
        ownerId: user.id,
      })
      .returning();

    // Create initial version if content provided
    if (body.content) {
      const [version] = await db
        .insert(policyVersions)
        .values({
          policyId: policy.id,
          versionNumber: 1,
          content: body.content,
          changeSummary: 'Initial version',
        })
        .returning();

      await db
        .update(policies)
        .set({ currentVersionId: version.id })
        .where(eq(policies.id, policy.id));

      policy.currentVersionId = version.id;
    }

    return c.json({
      data: {
        ...policy,
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
        nextReviewDate: policy.nextReviewDate?.toISOString() || null,
      },
    }, 201);
  });

  // GET /policies/:id — get policy with versions and acknowledgment count
  router.get('/policies/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    if (!policy) return c.json({ code: 'NOT_FOUND', message: 'Policy not found' }, 404);
    if (!userProjects.some(p => p.id === policy.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const versions = await db
      .select()
      .from(policyVersions)
      .where(eq(policyVersions.policyId, id))
      .orderBy(desc(policyVersions.versionNumber));

    const [ackResult] = await db
      .select({ count: count() })
      .from(policyAcknowledgments)
      .where(eq(policyAcknowledgments.policyId, id));

    return c.json({
      data: {
        ...policy,
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
        nextReviewDate: policy.nextReviewDate?.toISOString() || null,
        versions: versions.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
          approvedAt: v.approvedAt?.toISOString() || null,
        })),
        acknowledgmentCount: ackResult.count,
      },
    });
  });

  // PUT /policies/:id — update policy metadata
  router.put('/policies/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(policies).where(eq(policies.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Policy not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(policies)
      .set({
        title: body.title ?? existing.title,
        category: body.category ?? existing.category,
        status: body.status ?? existing.status,
        reviewFrequency: body.reviewFrequency ?? existing.reviewFrequency,
        nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : existing.nextReviewDate,
        updatedAt: new Date(),
      })
      .where(eq(policies.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        nextReviewDate: updated.nextReviewDate?.toISOString() || null,
      },
    });
  });

  // POST /policies/:id/versions — create new version
  router.post('/policies/:id/versions', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    if (!policy) return c.json({ code: 'NOT_FOUND', message: 'Policy not found' }, 404);
    if (!userProjects.some(p => p.id === policy.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!body.content?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'content is required' }, 400);
    }

    // Get latest version number
    const [latest] = await db
      .select({ versionNumber: policyVersions.versionNumber })
      .from(policyVersions)
      .where(eq(policyVersions.policyId, id))
      .orderBy(desc(policyVersions.versionNumber))
      .limit(1);

    const nextVersion = (latest?.versionNumber || 0) + 1;

    const [version] = await db
      .insert(policyVersions)
      .values({
        policyId: id,
        versionNumber: nextVersion,
        content: body.content,
        changeSummary: body.changeSummary,
      })
      .returning();

    // Update current version pointer
    await db
      .update(policies)
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(eq(policies.id, id));

    return c.json({
      data: {
        ...version,
        createdAt: version.createdAt.toISOString(),
        approvedAt: version.approvedAt?.toISOString() || null,
      },
    }, 201);
  });

  // POST /policies/:id/approve — approve current version
  router.post('/policies/:id/approve', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const id = c.req.param('id');

    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    if (!policy) return c.json({ code: 'NOT_FOUND', message: 'Policy not found' }, 404);
    if (!userProjects.some(p => p.id === policy.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!policy.currentVersionId) {
      return c.json({ code: 'BAD_REQUEST', message: 'No current version to approve' }, 400);
    }

    const [version] = await db
      .update(policyVersions)
      .set({
        approvedBy: user.id,
        approvedAt: new Date(),
      })
      .where(eq(policyVersions.id, policy.currentVersionId))
      .returning();

    // Set policy status to active
    await db
      .update(policies)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(policies.id, id));

    return c.json({
      data: {
        ...version,
        createdAt: version.createdAt.toISOString(),
        approvedAt: version.approvedAt?.toISOString() || null,
      },
    });
  });

  // POST /policies/:id/acknowledge — current user acknowledges the policy
  router.post('/policies/:id/acknowledge', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const id = c.req.param('id');

    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    if (!policy) return c.json({ code: 'NOT_FOUND', message: 'Policy not found' }, 404);
    if (!userProjects.some(p => p.id === policy.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!policy.currentVersionId) {
      return c.json({ code: 'BAD_REQUEST', message: 'No current version to acknowledge' }, 400);
    }

    const [ack] = await db
      .insert(policyAcknowledgments)
      .values({
        policyId: id,
        policyVersionId: policy.currentVersionId,
        userId: user.id,
      })
      .onConflictDoNothing()
      .returning();

    if (!ack) {
      return c.json({ code: 'CONFLICT', message: 'Already acknowledged this version' }, 409);
    }

    return c.json({
      data: {
        ...ack,
        acknowledgedAt: ack.acknowledgedAt.toISOString(),
      },
    }, 201);
  });

  // GET /policies/:id/acknowledgments — list who acknowledged
  router.get('/policies/:id/acknowledgments', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    if (!policy) return c.json({ code: 'NOT_FOUND', message: 'Policy not found' }, 404);
    if (!userProjects.some(p => p.id === policy.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const acks = await db
      .select()
      .from(policyAcknowledgments)
      .where(eq(policyAcknowledgments.policyId, id))
      .orderBy(desc(policyAcknowledgments.acknowledgedAt));

    return c.json({
      data: acks.map((a) => ({
        ...a,
        acknowledgedAt: a.acknowledgedAt.toISOString(),
      })),
    });
  });

  // ============================================
  // Access Reviews
  // ============================================

  // GET /access-reviews — list reviews for project
  router.get('/access-reviews', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rows = await db
      .select()
      .from(accessReviews)
      .where(eq(accessReviews.projectId, projectId))
      .orderBy(desc(accessReviews.createdAt));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        periodStart: r.periodStart?.toISOString() || null,
        periodEnd: r.periodEnd?.toISOString() || null,
        dueDate: r.dueDate?.toISOString() || null,
        completedAt: r.completedAt?.toISOString() || null,
      })),
    });
  });

  // POST /access-reviews — create review
  router.post('/access-reviews', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.title?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'title is required' }, 400);
    }

    const [review] = await db
      .insert(accessReviews)
      .values({
        projectId,
        title: body.title,
        reviewerId: user.id,
        periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      })
      .returning();

    return c.json({
      data: {
        ...review,
        createdAt: review.createdAt.toISOString(),
        periodStart: review.periodStart?.toISOString() || null,
        periodEnd: review.periodEnd?.toISOString() || null,
        dueDate: review.dueDate?.toISOString() || null,
        completedAt: review.completedAt?.toISOString() || null,
      },
    }, 201);
  });

  // GET /access-reviews/:id — get review with entries
  router.get('/access-reviews/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [review] = await db.select().from(accessReviews).where(eq(accessReviews.id, id));
    if (!review) return c.json({ code: 'NOT_FOUND', message: 'Access review not found' }, 404);
    if (!userProjects.some(p => p.id === review.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const entries = await db
      .select()
      .from(accessReviewEntries)
      .where(eq(accessReviewEntries.reviewId, id));

    return c.json({
      data: {
        ...review,
        createdAt: review.createdAt.toISOString(),
        periodStart: review.periodStart?.toISOString() || null,
        periodEnd: review.periodEnd?.toISOString() || null,
        dueDate: review.dueDate?.toISOString() || null,
        completedAt: review.completedAt?.toISOString() || null,
        entries: entries.map((e) => ({
          ...e,
          lastActive: e.lastActive?.toISOString() || null,
          decisionAt: e.decisionAt?.toISOString() || null,
        })),
      },
    });
  });

  // PUT /access-reviews/:id — update review
  router.put('/access-reviews/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(accessReviews).where(eq(accessReviews.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Access review not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(accessReviews)
      .set({
        status: body.status ?? existing.status,
        completedAt: body.completedAt ? new Date(body.completedAt) : existing.completedAt,
      })
      .where(eq(accessReviews.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        periodStart: updated.periodStart?.toISOString() || null,
        periodEnd: updated.periodEnd?.toISOString() || null,
        dueDate: updated.dueDate?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
      },
    });
  });

  // POST /access-reviews/:id/entries — add entry
  router.post('/access-reviews/:id/entries', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [review] = await db.select().from(accessReviews).where(eq(accessReviews.id, id));
    if (!review) return c.json({ code: 'NOT_FOUND', message: 'Access review not found' }, 404);
    if (!userProjects.some(p => p.id === review.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!body.userEmail?.trim() || !body.userName?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'userEmail and userName are required' }, 400);
    }

    const [entry] = await db
      .insert(accessReviewEntries)
      .values({
        reviewId: id,
        userEmail: body.userEmail,
        userName: body.userName,
        system: body.system,
        role: body.role,
        lastActive: body.lastActive ? new Date(body.lastActive) : undefined,
      })
      .returning();

    return c.json({
      data: {
        ...entry,
        lastActive: entry.lastActive?.toISOString() || null,
        decisionAt: entry.decisionAt?.toISOString() || null,
      },
    }, 201);
  });

  // POST /access-reviews/:id/entries/bulk — bulk add entries
  router.post('/access-reviews/:id/entries/bulk', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [review] = await db.select().from(accessReviews).where(eq(accessReviews.id, id));
    if (!review) return c.json({ code: 'NOT_FOUND', message: 'Access review not found' }, 404);
    if (!userProjects.some(p => p.id === review.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return c.json({ code: 'BAD_REQUEST', message: 'entries array is required' }, 400);
    }

    const entries = await db
      .insert(accessReviewEntries)
      .values(
        body.entries.map((e: any) => ({
          reviewId: id,
          userEmail: e.userEmail,
          userName: e.userName,
          system: e.system,
          role: e.role,
          lastActive: e.lastActive ? new Date(e.lastActive) : undefined,
        }))
      )
      .returning();

    return c.json({
      data: entries.map((e) => ({
        ...e,
        lastActive: e.lastActive?.toISOString() || null,
        decisionAt: e.decisionAt?.toISOString() || null,
      })),
    }, 201);
  });

  // PUT /access-reviews/:id/entries/:entryId — update entry decision
  router.put('/access-reviews/:id/entries/:entryId', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const id = c.req.param('id');
    const entryId = c.req.param('entryId');
    const body = await c.req.json();

    const [review] = await db.select().from(accessReviews).where(eq(accessReviews.id, id));
    if (!review) return c.json({ code: 'NOT_FOUND', message: 'Access review not found' }, 404);
    if (!userProjects.some(p => p.id === review.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(accessReviewEntries)
      .set({
        decision: body.decision,
        decisionBy: user.id,
        decisionAt: new Date(),
        notes: body.notes,
      })
      .where(and(eq(accessReviewEntries.id, entryId), eq(accessReviewEntries.reviewId, id)))
      .returning();

    if (!updated) return c.json({ code: 'NOT_FOUND', message: 'Entry not found' }, 404);

    return c.json({
      data: {
        ...updated,
        lastActive: updated.lastActive?.toISOString() || null,
        decisionAt: updated.decisionAt?.toISOString() || null,
      },
    });
  });

  // ============================================
  // Vendors
  // ============================================

  // GET /vendors — list vendors for project
  router.get('/vendors', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rows = await db
      .select()
      .from(vendors)
      .where(eq(vendors.projectId, projectId))
      .orderBy(desc(vendors.createdAt));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        lastAssessedAt: r.lastAssessedAt?.toISOString() || null,
        nextReviewDate: r.nextReviewDate?.toISOString() || null,
      })),
    });
  });

  // POST /vendors — create vendor
  router.post('/vendors', async (c) => {
    const userProjects = c.get('projects');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.name?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'name is required' }, 400);
    }

    const [vendor] = await db
      .insert(vendors)
      .values({
        projectId,
        name: body.name,
        category: body.category,
        criticality: body.criticality,
        dataAccessLevel: body.dataAccessLevel,
        website: body.website,
        contactEmail: body.contactEmail,
        status: body.status,
        notes: body.notes,
      })
      .returning();

    return c.json({
      data: {
        ...vendor,
        createdAt: vendor.createdAt.toISOString(),
        updatedAt: vendor.updatedAt.toISOString(),
        lastAssessedAt: vendor.lastAssessedAt?.toISOString() || null,
        nextReviewDate: vendor.nextReviewDate?.toISOString() || null,
      },
    }, 201);
  });

  // GET /vendors/:id — get vendor with documents
  router.get('/vendors/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!vendor) return c.json({ code: 'NOT_FOUND', message: 'Vendor not found' }, 404);
    if (!userProjects.some(p => p.id === vendor.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const docs = await db
      .select()
      .from(vendorDocuments)
      .where(eq(vendorDocuments.vendorId, id))
      .orderBy(desc(vendorDocuments.createdAt));

    return c.json({
      data: {
        ...vendor,
        createdAt: vendor.createdAt.toISOString(),
        updatedAt: vendor.updatedAt.toISOString(),
        lastAssessedAt: vendor.lastAssessedAt?.toISOString() || null,
        nextReviewDate: vendor.nextReviewDate?.toISOString() || null,
        documents: docs.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          expiresAt: d.expiresAt?.toISOString() || null,
        })),
      },
    });
  });

  // PUT /vendors/:id — update vendor
  router.put('/vendors/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Vendor not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(vendors)
      .set({
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        criticality: body.criticality ?? existing.criticality,
        dataAccessLevel: body.dataAccessLevel ?? existing.dataAccessLevel,
        website: body.website ?? existing.website,
        contactEmail: body.contactEmail ?? existing.contactEmail,
        status: body.status ?? existing.status,
        notes: body.notes ?? existing.notes,
        lastAssessedAt: body.lastAssessedAt ? new Date(body.lastAssessedAt) : existing.lastAssessedAt,
        nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : existing.nextReviewDate,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        lastAssessedAt: updated.lastAssessedAt?.toISOString() || null,
        nextReviewDate: updated.nextReviewDate?.toISOString() || null,
      },
    });
  });

  // DELETE /vendors/:id — delete vendor
  router.delete('/vendors/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [existing] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Vendor not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(vendors).where(eq(vendors.id, id));
    return c.json({ data: { id } });
  });

  // POST /vendors/:id/documents — add document
  router.post('/vendors/:id/documents', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!vendor) return c.json({ code: 'NOT_FOUND', message: 'Vendor not found' }, 404);
    if (!userProjects.some(p => p.id === vendor.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    if (!body.title?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'title is required' }, 400);
    }
    if (!body.type?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'type is required' }, 400);
    }

    const [doc] = await db
      .insert(vendorDocuments)
      .values({
        vendorId: id,
        type: body.type,
        title: body.title,
        fileUrl: body.fileUrl,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        uploadedBy: user.id,
      })
      .returning();

    return c.json({
      data: {
        ...doc,
        createdAt: doc.createdAt.toISOString(),
        expiresAt: doc.expiresAt?.toISOString() || null,
      },
    }, 201);
  });

  // DELETE /vendors/:id/documents/:docId — remove document
  router.delete('/vendors/:id/documents/:docId', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const docId = c.req.param('docId');

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!vendor) return c.json({ code: 'NOT_FOUND', message: 'Vendor not found' }, 404);
    if (!userProjects.some(p => p.id === vendor.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(vendorDocuments).where(and(eq(vendorDocuments.id, docId), eq(vendorDocuments.vendorId, id)));
    return c.json({ data: { id: docId } });
  });

  // ============================================
  // Risks
  // ============================================

  // GET /risks — list risks for project
  router.get('/risks', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rows = await db
      .select()
      .from(risks)
      .where(eq(risks.projectId, projectId))
      .orderBy(desc(risks.createdAt));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });

  // POST /risks — create risk
  router.post('/risks', async (c) => {
    const userProjects = c.get('projects');
    const user = c.get('user');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.title?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'title is required' }, 400);
    }

    const [risk] = await db
      .insert(risks)
      .values({
        projectId,
        title: body.title,
        description: body.description,
        category: body.category,
        likelihood: body.likelihood,
        impact: body.impact,
        treatment: body.treatment,
        treatmentPlan: body.treatmentPlan,
        ownerId: user.id,
      })
      .returning();

    return c.json({
      data: {
        ...risk,
        createdAt: risk.createdAt.toISOString(),
        updatedAt: risk.updatedAt.toISOString(),
      },
    }, 201);
  });

  // GET /risks/matrix — risk matrix (count by likelihood x impact)
  router.get('/risks/matrix', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const matrix = await db
      .select({
        likelihood: risks.likelihood,
        impact: risks.impact,
        count: count(),
      })
      .from(risks)
      .where(and(eq(risks.projectId, projectId), eq(risks.status, 'open')))
      .groupBy(risks.likelihood, risks.impact);

    return c.json({
      data: {
        matrix: matrix.map((m) => ({
          likelihood: m.likelihood,
          impact: m.impact,
          count: m.count,
        })),
      },
    });
  });

  // GET /risks/:id — get single risk
  router.get('/risks/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [risk] = await db.select().from(risks).where(eq(risks.id, id));
    if (!risk) return c.json({ code: 'NOT_FOUND', message: 'Risk not found' }, 404);
    if (!userProjects.some(p => p.id === risk.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    return c.json({
      data: {
        ...risk,
        createdAt: risk.createdAt.toISOString(),
        updatedAt: risk.updatedAt.toISOString(),
      },
    });
  });

  // PUT /risks/:id — update risk
  router.put('/risks/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(risks).where(eq(risks.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Risk not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(risks)
      .set({
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        category: body.category ?? existing.category,
        likelihood: body.likelihood ?? existing.likelihood,
        impact: body.impact ?? existing.impact,
        treatment: body.treatment ?? existing.treatment,
        treatmentPlan: body.treatmentPlan ?? existing.treatmentPlan,
        status: body.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(risks.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  // DELETE /risks/:id — delete risk
  router.delete('/risks/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [existing] = await db.select().from(risks).where(eq(risks.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Risk not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(risks).where(eq(risks.id, id));
    return c.json({ data: { id } });
  });

  // ============================================
  // Incidents
  // ============================================

  // GET /incidents — list incidents for project
  router.get('/incidents', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.projectId, projectId))
      .orderBy(desc(incidents.createdAt));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        detectedAt: r.detectedAt.toISOString(),
        acknowledgedAt: r.acknowledgedAt?.toISOString() || null,
        mitigatedAt: r.mitigatedAt?.toISOString() || null,
        resolvedAt: r.resolvedAt?.toISOString() || null,
        rcaCompletedAt: r.rcaCompletedAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });

  // POST /incidents — create incident
  router.post('/incidents', async (c) => {
    const userProjects = c.get('projects');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.title?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'title is required' }, 400);
    }

    const [incident] = await db
      .insert(incidents)
      .values({
        projectId,
        title: body.title,
        severity: body.severity,
        description: body.description,
        impactDescription: body.impactDescription,
        assignedTo: body.assignedTo,
      })
      .returning();

    return c.json({
      data: {
        ...incident,
        detectedAt: incident.detectedAt.toISOString(),
        acknowledgedAt: incident.acknowledgedAt?.toISOString() || null,
        mitigatedAt: incident.mitigatedAt?.toISOString() || null,
        resolvedAt: incident.resolvedAt?.toISOString() || null,
        rcaCompletedAt: incident.rcaCompletedAt?.toISOString() || null,
        createdAt: incident.createdAt.toISOString(),
        updatedAt: incident.updatedAt.toISOString(),
      },
    }, 201);
  });

  // GET /incidents/:id — get single incident
  router.get('/incidents/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!incident) return c.json({ code: 'NOT_FOUND', message: 'Incident not found' }, 404);
    if (!userProjects.some(p => p.id === incident.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    return c.json({
      data: {
        ...incident,
        detectedAt: incident.detectedAt.toISOString(),
        acknowledgedAt: incident.acknowledgedAt?.toISOString() || null,
        mitigatedAt: incident.mitigatedAt?.toISOString() || null,
        resolvedAt: incident.resolvedAt?.toISOString() || null,
        rcaCompletedAt: incident.rcaCompletedAt?.toISOString() || null,
        createdAt: incident.createdAt.toISOString(),
        updatedAt: incident.updatedAt.toISOString(),
      },
    });
  });

  // PUT /incidents/:id — update incident (status transitions set timestamps)
  router.put('/incidents/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Incident not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    // Build update with status-based timestamp transitions
    const updates: Record<string, any> = {
      title: body.title ?? existing.title,
      severity: body.severity ?? existing.severity,
      description: body.description ?? existing.description,
      impactDescription: body.impactDescription ?? existing.impactDescription,
      customersAffected: body.customersAffected ?? existing.customersAffected,
      rcaSummary: body.rcaSummary ?? existing.rcaSummary,
      rootCause: body.rootCause ?? existing.rootCause,
      assignedTo: body.assignedTo ?? existing.assignedTo,
      updatedAt: new Date(),
    };

    if (body.status && body.status !== existing.status) {
      updates.status = body.status;
      const now = new Date();
      switch (body.status) {
        case 'acknowledged':
          updates.acknowledgedAt = existing.acknowledgedAt || now;
          break;
        case 'mitigating':
          updates.acknowledgedAt = existing.acknowledgedAt || now;
          updates.mitigatedAt = existing.mitigatedAt || now;
          break;
        case 'resolved':
          updates.acknowledgedAt = existing.acknowledgedAt || now;
          updates.mitigatedAt = existing.mitigatedAt || now;
          updates.resolvedAt = existing.resolvedAt || now;
          break;
        case 'rca_complete':
          updates.acknowledgedAt = existing.acknowledgedAt || now;
          updates.mitigatedAt = existing.mitigatedAt || now;
          updates.resolvedAt = existing.resolvedAt || now;
          updates.rcaCompletedAt = existing.rcaCompletedAt || now;
          break;
      }
    }

    const [updated] = await db
      .update(incidents)
      .set(updates)
      .where(eq(incidents.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        detectedAt: updated.detectedAt.toISOString(),
        acknowledgedAt: updated.acknowledgedAt?.toISOString() || null,
        mitigatedAt: updated.mitigatedAt?.toISOString() || null,
        resolvedAt: updated.resolvedAt?.toISOString() || null,
        rcaCompletedAt: updated.rcaCompletedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  // DELETE /incidents/:id — delete incident
  router.delete('/incidents/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [existing] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Incident not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(incidents).where(eq(incidents.id, id));
    return c.json({ data: { id } });
  });

  // ============================================
  // Personnel
  // ============================================

  // GET /personnel — list personnel for project
  router.get('/personnel', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const statusFilter = c.req.query('status');
    const conditions = [eq(personnel.projectId, projectId)];
    if (statusFilter) conditions.push(eq(personnel.status, statusFilter));

    const rows = await db
      .select()
      .from(personnel)
      .where(and(...conditions))
      .orderBy(desc(personnel.createdAt));

    return c.json({
      data: rows.map((r) => ({
        ...r,
        hireDate: r.hireDate?.toISOString() || null,
        terminationDate: r.terminationDate?.toISOString() || null,
        backgroundCheckDate: r.backgroundCheckDate?.toISOString() || null,
        trainingDate: r.trainingDate?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });

  // POST /personnel — create personnel record
  router.post('/personnel', async (c) => {
    const userProjects = c.get('projects');
    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.name?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'name is required' }, 400);
    }
    if (!body.email?.trim()) {
      return c.json({ code: 'BAD_REQUEST', message: 'email is required' }, 400);
    }

    const [person] = await db
      .insert(personnel)
      .values({
        projectId,
        name: body.name,
        email: body.email,
        role: body.role,
        department: body.department,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        backgroundCheckCompleted: body.backgroundCheckCompleted || false,
        backgroundCheckDate: body.backgroundCheckDate ? new Date(body.backgroundCheckDate) : undefined,
        trainingCompleted: body.trainingCompleted || false,
        trainingDate: body.trainingDate ? new Date(body.trainingDate) : undefined,
        policyAcknowledged: body.policyAcknowledged || false,
      })
      .returning();

    return c.json({
      data: {
        ...person,
        hireDate: person.hireDate?.toISOString() || null,
        terminationDate: person.terminationDate?.toISOString() || null,
        backgroundCheckDate: person.backgroundCheckDate?.toISOString() || null,
        trainingDate: person.trainingDate?.toISOString() || null,
        createdAt: person.createdAt.toISOString(),
        updatedAt: person.updatedAt.toISOString(),
      },
    }, 201);
  });

  // GET /personnel/stats — personnel statistics
  router.get('/personnel/stats', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const [totalResult] = await db
      .select({ count: count() })
      .from(personnel)
      .where(eq(personnel.projectId, projectId));

    const [activeResult] = await db
      .select({ count: count() })
      .from(personnel)
      .where(and(eq(personnel.projectId, projectId), eq(personnel.status, 'active')));

    const [bgCheckResult] = await db
      .select({ count: count() })
      .from(personnel)
      .where(and(eq(personnel.projectId, projectId), eq(personnel.backgroundCheckCompleted, true)));

    const [trainingResult] = await db
      .select({ count: count() })
      .from(personnel)
      .where(and(eq(personnel.projectId, projectId), eq(personnel.trainingCompleted, true)));

    const [policyAckResult] = await db
      .select({ count: count() })
      .from(personnel)
      .where(and(eq(personnel.projectId, projectId), eq(personnel.policyAcknowledged, true)));

    return c.json({
      data: {
        total: totalResult.count,
        active: activeResult.count,
        backgroundChecksDone: bgCheckResult.count,
        trainingDone: trainingResult.count,
        policiesAcknowledged: policyAckResult.count,
      },
    });
  });

  // GET /personnel/:id — get single person
  router.get('/personnel/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [person] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!person) return c.json({ code: 'NOT_FOUND', message: 'Personnel not found' }, 404);
    if (!userProjects.some(p => p.id === person.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    return c.json({
      data: {
        ...person,
        hireDate: person.hireDate?.toISOString() || null,
        terminationDate: person.terminationDate?.toISOString() || null,
        backgroundCheckDate: person.backgroundCheckDate?.toISOString() || null,
        trainingDate: person.trainingDate?.toISOString() || null,
        createdAt: person.createdAt.toISOString(),
        updatedAt: person.updatedAt.toISOString(),
      },
    });
  });

  // PUT /personnel/:id — update personnel
  router.put('/personnel/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Personnel not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    const [updated] = await db
      .update(personnel)
      .set({
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        role: body.role ?? existing.role,
        department: body.department ?? existing.department,
        hireDate: body.hireDate ? new Date(body.hireDate) : existing.hireDate,
        terminationDate: body.terminationDate ? new Date(body.terminationDate) : existing.terminationDate,
        backgroundCheckCompleted: body.backgroundCheckCompleted ?? existing.backgroundCheckCompleted,
        backgroundCheckDate: body.backgroundCheckDate ? new Date(body.backgroundCheckDate) : existing.backgroundCheckDate,
        trainingCompleted: body.trainingCompleted ?? existing.trainingCompleted,
        trainingDate: body.trainingDate ? new Date(body.trainingDate) : existing.trainingDate,
        policyAcknowledged: body.policyAcknowledged ?? existing.policyAcknowledged,
        status: body.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(personnel.id, id))
      .returning();

    return c.json({
      data: {
        ...updated,
        hireDate: updated.hireDate?.toISOString() || null,
        terminationDate: updated.terminationDate?.toISOString() || null,
        backgroundCheckDate: updated.backgroundCheckDate?.toISOString() || null,
        trainingDate: updated.trainingDate?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  // DELETE /personnel/:id — delete personnel
  router.delete('/personnel/:id', async (c) => {
    const userProjects = c.get('projects');
    const id = c.req.param('id');

    const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
    if (!existing) return c.json({ code: 'NOT_FOUND', message: 'Personnel not found' }, 404);
    if (!userProjects.some(p => p.id === existing.projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    }

    await db.delete(personnel).where(eq(personnel.id, id));
    return c.json({ data: { id } });
  });

  // ============================================
  // Dashboard Overview
  // ============================================

  // GET /overview — SOC 2 readiness overview
  router.get('/overview', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    // Control readiness
    const [totalControls] = await db
      .select({ count: count() })
      .from(controls)
      .where(eq(controls.projectId, projectId));

    const [readyControls] = await db
      .select({ count: count() })
      .from(controls)
      .where(and(
        eq(controls.projectId, projectId),
        sql`${controls.implementationStatus} IN ('ready', 'verified')`,
      ));

    const controlReadiness = totalControls.count > 0
      ? Math.round((readyControls.count / totalControls.count) * 100)
      : 0;

    // Evidence count
    const [evidenceCount] = await db
      .select({ count: count() })
      .from(evidence)
      .where(eq(evidence.projectId, projectId));

    // Policy count
    const [policyCount] = await db
      .select({ count: count() })
      .from(policies)
      .where(eq(policies.projectId, projectId));

    // Open risks
    const [openRisks] = await db
      .select({ count: count() })
      .from(risks)
      .where(and(eq(risks.projectId, projectId), eq(risks.status, 'open')));

    // Pending access reviews
    const [pendingReviews] = await db
      .select({ count: count() })
      .from(accessReviews)
      .where(and(
        eq(accessReviews.projectId, projectId),
        sql`${accessReviews.status} != 'completed'`,
      ));

    // Open incidents
    const [openIncidents] = await db
      .select({ count: count() })
      .from(incidents)
      .where(and(
        eq(incidents.projectId, projectId),
        sql`${incidents.status} NOT IN ('resolved', 'rca_complete')`,
      ));

    // Personnel stats
    const [totalPersonnel] = await db
      .select({ count: count() })
      .from(personnel)
      .where(and(eq(personnel.projectId, projectId), eq(personnel.status, 'active')));

    const [trainedPersonnel] = await db
      .select({ count: count() })
      .from(personnel)
      .where(and(
        eq(personnel.projectId, projectId),
        eq(personnel.status, 'active'),
        eq(personnel.trainingCompleted, true),
      ));

    // Control status breakdown
    const controlsByStatus = await db
      .select({ status: controls.implementationStatus, count: count() })
      .from(controls)
      .where(eq(controls.projectId, projectId))
      .groupBy(controls.implementationStatus);

    const statusMap = Object.fromEntries(controlsByStatus.map(s => [s.status, s.count]));

    // Active policies
    const [activePolicies] = await db
      .select({ count: count() })
      .from(policies)
      .where(and(eq(policies.projectId, projectId), eq(policies.status, 'active')));

    return c.json({
      data: {
        controls: {
          total: totalControls.count,
          ready: statusMap['ready'] || 0,
          in_progress: statusMap['in_progress'] || 0,
          not_started: statusMap['not_started'] || 0,
          verified: statusMap['verified'] || 0,
        },
        evidence: { total: evidenceCount.count },
        policies: { total: policyCount.count, active: activePolicies.count },
        risks: { total: openRisks.count, open: openRisks.count },
        accessReviews: { total: pendingReviews.count, pending: pendingReviews.count },
        incidents: { total: openIncidents.count, open: openIncidents.count },
        personnel: { total: totalPersonnel.count, active: totalPersonnel.count },
      },
    });
  });

  return router;
}
