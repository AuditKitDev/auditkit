import { eq, and, sql } from 'drizzle-orm';
import { monthlyUsage } from '../db/schema.js';
import type { Database } from '../db/index.js';

export async function incrementUsage(db: Database, projectId: string): Promise<number> {
  const yearMonth = getCurrentMonthKey();

  const result = await db
    .insert(monthlyUsage)
    .values({ projectId, yearMonth, eventCount: 1 })
    .onConflictDoUpdate({
      target: [monthlyUsage.projectId, monthlyUsage.yearMonth],
      set: {
        eventCount: sql`${monthlyUsage.eventCount} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ eventCount: monthlyUsage.eventCount });

  return result[0].eventCount;
}

export async function getUsage(db: Database, projectId: string): Promise<number> {
  const yearMonth = getCurrentMonthKey();
  const result = await db
    .select({ eventCount: monthlyUsage.eventCount })
    .from(monthlyUsage)
    .where(and(
      eq(monthlyUsage.projectId, projectId),
      eq(monthlyUsage.yearMonth, yearMonth)
    ))
    .limit(1);
  return result[0]?.eventCount ?? 0;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
