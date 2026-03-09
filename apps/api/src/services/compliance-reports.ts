import { eq, and, count, desc, gte, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { auditEvents, complianceReports } from '../db/schema.js';

type Framework = 'soc2' | 'hipaa' | 'iso27001' | 'gdpr';

interface ReportSection {
  controlId: string;
  controlName: string;
  description: string;
  status: 'pass' | 'fail' | 'partial' | 'not_applicable';
  eventCount: number;
  sampleEvents: Array<{
    eventId: string;
    action: string;
    actorId: string;
    occurredAt: string;
  }>;
  findings: string[];
}

interface ComplianceReport {
  framework: Framework;
  generatedAt: string;
  projectId: string;
  summary: {
    totalControls: number;
    passing: number;
    failing: number;
    partial: number;
    notApplicable: number;
  };
  sections: ReportSection[];
}

/**
 * Get sample events matching specific actions/categories for a project.
 */
async function getSampleEvents(
  db: Database,
  projectId: string,
  actionPatterns: string[],
  limit = 3
): Promise<
  Array<{
    eventId: string;
    action: string;
    actorId: string;
    occurredAt: string;
    category: string | null;
  }>
> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const conditions = [
    eq(auditEvents.projectId, projectId),
    gte(auditEvents.occurredAt, thirtyDaysAgo),
  ];

  if (actionPatterns.length > 0) {
    const patternConditions = actionPatterns.map(
      (p) => sql`${auditEvents.action} ILIKE ${p.replace(/\*/g, '%')}`
    );
    conditions.push(sql`(${sql.join(patternConditions, sql` OR `)})`);
  }

  const events = await db
    .select({
      eventId: auditEvents.eventId,
      action: auditEvents.action,
      actorId: auditEvents.actorId,
      occurredAt: auditEvents.occurredAt,
      category: auditEvents.category,
    })
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(limit);

  return events.map((e) => ({
    eventId: e.eventId,
    action: e.action,
    actorId: e.actorId,
    occurredAt: e.occurredAt.toISOString(),
    category: e.category,
  }));
}

/**
 * Count events matching specific action patterns for a project in the last 30 days.
 */
async function countEventsForPatterns(
  db: Database,
  projectId: string,
  actionPatterns: string[]
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const conditions = [
    eq(auditEvents.projectId, projectId),
    gte(auditEvents.occurredAt, thirtyDaysAgo),
  ];

  if (actionPatterns.length > 0) {
    const patternConditions = actionPatterns.map(
      (p) => sql`${auditEvents.action} ILIKE ${p.replace(/\*/g, '%')}`
    );
    conditions.push(sql`(${sql.join(patternConditions, sql` OR `)})`);
  }

  const [result] = await db
    .select({ count: count() })
    .from(auditEvents)
    .where(and(...conditions));

  return result.count;
}

/**
 * Build a control section with event data.
 */
async function buildSection(
  db: Database,
  projectId: string,
  controlId: string,
  controlName: string,
  description: string,
  actionPatterns: string[]
): Promise<ReportSection> {
  const eventCount = await countEventsForPatterns(db, projectId, actionPatterns);
  const sampleEvents = await getSampleEvents(db, projectId, actionPatterns);
  const findings: string[] = [];

  let status: 'pass' | 'fail' | 'partial' | 'not_applicable' = 'pass';

  if (eventCount === 0 && actionPatterns.length > 0) {
    status = 'not_applicable';
    findings.push(`No events matching patterns: ${actionPatterns.join(', ')}`);
  } else if (eventCount > 0) {
    findings.push(`${eventCount} relevant events found in the last 30 days`);
  }

  return {
    controlId,
    controlName,
    description,
    status,
    eventCount,
    sampleEvents: sampleEvents.map((e) => ({
      eventId: e.eventId,
      action: e.action,
      actorId: e.actorId,
      occurredAt: e.occurredAt,
    })),
    findings,
  };
}

/**
 * Generate a SOC 2 compliance report.
 */
async function generateSOC2Report(
  db: Database,
  projectId: string
): Promise<ReportSection[]> {
  return [
    await buildSection(
      db, projectId,
      'CC6.1', 'Logical and Physical Access Controls',
      'Access logs demonstrating proper access controls are in place',
      ['user.login*', 'user.logout*', 'auth.*', 'session.*', 'access.*']
    ),
    await buildSection(
      db, projectId,
      'CC8.1', 'Change Management',
      'Change management events showing controlled changes to the system',
      ['*.create', '*.update', '*.delete', '*.modify', 'config.*', 'deploy.*', 'release.*']
    ),
    await buildSection(
      db, projectId,
      'CC7.2', 'Anomaly Detection and Monitoring',
      'Evidence of anomaly detection and security monitoring',
      ['anomaly.*', 'alert.*', 'security.*', 'incident.*']
    ),
    await buildSection(
      db, projectId,
      'CC6.6', 'Data Retention',
      'Evidence of data retention policies and enforcement',
      ['retention.*', 'archive.*', 'purge.*', 'data.delete']
    ),
  ];
}

/**
 * Generate a HIPAA compliance report.
 */
async function generateHIPAAReport(
  db: Database,
  projectId: string
): Promise<ReportSection[]> {
  return [
    await buildSection(
      db, projectId,
      '164.312(b)', 'Audit Controls - PHI Access',
      'Logs of access to Protected Health Information',
      ['phi.*', 'patient.*', 'record.view*', 'record.access*', 'medical.*', 'health.*']
    ),
    await buildSection(
      db, projectId,
      '164.312(d)', 'Person or Entity Authentication',
      'User authentication events demonstrating identity verification',
      ['user.login*', 'user.logout*', 'auth.*', 'mfa.*', '2fa.*', 'session.*']
    ),
    await buildSection(
      db, projectId,
      '164.312(e)(1)', 'Transmission Security',
      'Data export and transmission records',
      ['data.export*', 'data.transfer*', 'data.download*', 'report.generate*', 'export.*']
    ),
    await buildSection(
      db, projectId,
      '164.312(c)(1)', 'Integrity Controls',
      'Evidence of data integrity monitoring',
      ['integrity.*', 'hash.*', 'verify.*', 'tamper.*']
    ),
  ];
}

/**
 * Generate an ISO 27001 compliance report.
 */
async function generateISO27001Report(
  db: Database,
  projectId: string
): Promise<ReportSection[]> {
  return [
    await buildSection(
      db, projectId,
      'A.12.4', 'Logging and Monitoring',
      'Information security event logging and monitoring',
      ['security.*', 'audit.*', 'monitor.*', 'log.*']
    ),
    await buildSection(
      db, projectId,
      'A.9.4', 'System and Application Access Control',
      'Access control logs demonstrating proper authorization',
      ['user.login*', 'user.logout*', 'access.*', 'permission.*', 'role.*', 'auth.*']
    ),
    await buildSection(
      db, projectId,
      'A.16.1', 'Incident Response',
      'Security incident management and response records',
      ['incident.*', 'alert.*', 'breach.*', 'vulnerability.*', 'threat.*']
    ),
    await buildSection(
      db, projectId,
      'A.12.1', 'Operational Procedures',
      'Evidence of documented operational procedures',
      ['*.create', '*.update', '*.delete', 'config.*', 'deploy.*', 'operation.*']
    ),
  ];
}

/**
 * Generate a GDPR compliance report.
 */
async function generateGDPRReport(
  db: Database,
  projectId: string
): Promise<ReportSection[]> {
  return [
    await buildSection(
      db, projectId,
      'Art.15', 'Right of Access - Data Access Logs',
      'Records of personal data access requests and fulfillment',
      ['data.access*', 'data.view*', 'data.request*', 'subject.access*', 'sar.*']
    ),
    await buildSection(
      db, projectId,
      'Art.7', 'Consent Management',
      'Records of consent collection, withdrawal, and management',
      ['consent.*', 'opt-in.*', 'opt-out.*', 'preference.*', 'gdpr.consent*']
    ),
    await buildSection(
      db, projectId,
      'Art.17', 'Right to Erasure',
      'Records of data deletion requests and execution',
      ['data.delete*', 'data.erase*', 'data.forget*', 'user.delete*', 'erasure.*']
    ),
    await buildSection(
      db, projectId,
      'Art.44', 'Cross-Border Transfers',
      'Records of personal data transfers across borders',
      ['transfer.*', 'cross-border.*', 'data.transfer*', 'data.export*', 'international.*']
    ),
  ];
}

/**
 * Generate a compliance report for a given framework.
 */
export async function generateComplianceReport(
  db: Database,
  projectId: string,
  framework: Framework
): Promise<string> {
  let sections: ReportSection[];

  switch (framework) {
    case 'soc2':
      sections = await generateSOC2Report(db, projectId);
      break;
    case 'hipaa':
      sections = await generateHIPAAReport(db, projectId);
      break;
    case 'iso27001':
      sections = await generateISO27001Report(db, projectId);
      break;
    case 'gdpr':
      sections = await generateGDPRReport(db, projectId);
      break;
    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }

  const summary = {
    totalControls: sections.length,
    passing: sections.filter((s) => s.status === 'pass').length,
    failing: sections.filter((s) => s.status === 'fail').length,
    partial: sections.filter((s) => s.status === 'partial').length,
    notApplicable: sections.filter((s) => s.status === 'not_applicable').length,
  };

  const reportData: ComplianceReport = {
    framework,
    generatedAt: new Date().toISOString(),
    projectId,
    summary,
    sections,
  };

  const [inserted] = await db
    .insert(complianceReports)
    .values({
      projectId,
      framework,
      status: 'completed',
      reportData: reportData as unknown as Record<string, unknown>,
    })
    .returning({ id: complianceReports.id });

  return inserted.id;
}
