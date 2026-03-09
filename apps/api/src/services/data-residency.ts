import { eq } from 'drizzle-orm';
import { dataResidencyConfigs } from '../db/schema.js';
import type { Database } from '../db/index.js';

export interface ResidencyConfig {
  id: string;
  projectId: string;
  region: string;
  storageEndpoint: string | null;
  enabled: boolean;
  createdAt: Date;
}

/**
 * Get the data residency configuration for a project.
 * Returns null if no config is set (defaults to 'us').
 */
export async function getResidencyConfig(
  db: Database,
  projectId: string
): Promise<ResidencyConfig | null> {
  const result = await db
    .select()
    .from(dataResidencyConfigs)
    .where(eq(dataResidencyConfigs.projectId, projectId))
    .limit(1);

  if (result.length === 0) return null;
  return result[0];
}

/**
 * Get the region string for a project's data residency configuration.
 * Falls back to 'us' if no config is found or config is disabled.
 */
export async function getProjectRegion(
  db: Database,
  projectId: string
): Promise<string> {
  const config = await getResidencyConfig(db, projectId);
  if (!config || !config.enabled) return 'us';
  return config.region;
}

/**
 * Enrich event metadata with region information based on the project's
 * data residency configuration. This adds the region to the event's
 * metadata so it's queryable.
 */
export async function enrichEventWithRegion(
  db: Database,
  projectId: string,
  metadata: Record<string, unknown>
): Promise<{ metadata: Record<string, unknown>; region: string }> {
  const region = await getProjectRegion(db, projectId);
  return {
    metadata: {
      ...metadata,
      _data_region: region,
    },
    region,
  };
}

/**
 * Upsert a data residency configuration for a project.
 */
export async function upsertResidencyConfig(
  db: Database,
  projectId: string,
  region: string,
  storageEndpoint?: string | null
): Promise<ResidencyConfig> {
  const validRegions = ['us', 'eu', 'apac', 'custom'];
  if (!validRegions.includes(region)) {
    throw new Error(`Invalid region: ${region}. Must be one of: ${validRegions.join(', ')}`);
  }

  const existing = await db
    .select({ id: dataResidencyConfigs.id })
    .from(dataResidencyConfigs)
    .where(eq(dataResidencyConfigs.projectId, projectId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(dataResidencyConfigs)
      .set({
        region,
        storageEndpoint: storageEndpoint ?? null,
        enabled: true,
      })
      .where(eq(dataResidencyConfigs.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(dataResidencyConfigs)
    .values({
      projectId,
      region,
      storageEndpoint: storageEndpoint ?? null,
      enabled: true,
    })
    .returning();

  return created;
}
