import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { SOC2_CONTROLS } from '@auditkit/shared';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seedControls() {
  console.log('Seeding SOC 2 control frameworks...');

  const existing = await db.select({ id: schema.controlFrameworks.id }).from(schema.controlFrameworks).limit(1);

  if (existing.length > 0) {
    console.log('SOC 2 controls already seeded, skipping.');
    await client.end();
    return;
  }

  await db.insert(schema.controlFrameworks).values(
    SOC2_CONTROLS.map((c) => ({
      framework: c.framework,
      criteriaId: c.criteriaId,
      title: c.title,
      description: c.description,
      category: c.category,
    }))
  );

  console.log(`Seeded ${SOC2_CONTROLS.length} SOC 2 control framework entries.`);
  await client.end();
}

seedControls().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
