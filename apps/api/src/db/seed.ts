import { createHash, randomBytes, scrypt } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

function print(message = ''): void {
  process.stdout.write(`${message}\n`);
}

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function seed() {
  print('Seeding AuditKit database...\n');

  // 1. Create user
  const passwordHash = await hashPassword('demo1234');
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'demo@auditkit.dev',
      name: 'Demo User',
      passwordHash,
      emailVerified: true,
    })
    .returning();

  print(`User created: ${user.email} (${user.id})`);

  // 2. Create project under the user
  const [project] = await db
    .insert(schema.projects)
    .values({
      userId: user.id,
      name: 'My SaaS App',
      slug: 'my-saas-app',
    })
    .returning();

  print(`Project created: ${project.name} (${project.id})`);

  // 3. Create API key
  const rawKey = `ak_live_${randomBytes(24).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  await db.insert(schema.apiKeys).values({
    projectId: project.id,
    name: 'Development Key',
    keyHash,
    keyPrefix,
    environment: 'production',
    scopes: ['write', 'read'],
  });

  print(`API Key created: ${rawKey}`);

  // 4. Create sample tenants
  const [tenant1] = await db
    .insert(schema.tenants)
    .values({
      projectId: project.id,
      externalId: 'org_acme',
      name: 'Acme Corp',
    })
    .returning();

  const [tenant2] = await db
    .insert(schema.tenants)
    .values({
      projectId: project.id,
      externalId: 'org_globex',
      name: 'Globex Inc',
    })
    .returning();

  print(`Tenants created: ${tenant1.name}, ${tenant2.name}`);

  // 5. Create sample retention policy
  await db.insert(schema.retentionPolicies).values({
    projectId: project.id,
    retentionDays: '30',
  });

  print('Default retention policy: 30 days');

  // 6. Create free subscription for demo user
  await db.insert(schema.subscriptions).values({
    userId: user.id,
    plan: 'free',
    status: 'active',
    eventQuota: 1000,
    projectQuota: 1,
  });

  print('Free subscription created for demo user');

  print('\n--- Setup Complete ---');
  print('\nDemo login: demo@auditkit.dev / demo1234');
  print('\nAdd this to your .env:\n');
  print(`AUDITKIT_API_KEY=${rawKey}`);
  print('\nTest with:');
  print('curl -X POST http://localhost:3001/v1/events \\');
  print(`  -H "Authorization: Bearer ${rawKey}" \\`);
  print('  -H "Content-Type: application/json" \\');
  print(`  -d '{"action":"user.signed_in","tenant_id":"org_acme","actor":{"id":"user_1","name":"Jane"}}'`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
