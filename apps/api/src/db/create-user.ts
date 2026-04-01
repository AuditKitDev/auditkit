import { randomBytes, scrypt } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function createUser() {
  const email = 'ratkinson701@gmail.com';
  const password = 'AuditKit2026!';

  console.log(`Creating user: ${email}`);

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name: 'AuditKit Admin',
      passwordHash,
      emailVerified: true,
      role: 'admin',
    })
    .returning();

  console.log(`User created: ${user.id}`);

  const [project] = await db
    .insert(schema.projects)
    .values({
      userId: user.id,
      name: 'AuditKit',
      slug: 'auditkit-main',
    })
    .returning();

  console.log(`Project created: ${project.id}`);

  await db.insert(schema.subscriptions).values({
    userId: user.id,
    plan: 'supersize',
    status: 'active',
    eventQuota: 5000000,
    projectQuota: 100,
  });

  await db.insert(schema.teamMembers).values({
    projectId: project.id,
    userId: user.id,
    role: 'owner',
  });

  console.log(`\nLogin: ${email} / ${password}`);
  await client.end();
}

createUser().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
