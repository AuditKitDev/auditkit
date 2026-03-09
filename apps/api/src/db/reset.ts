import postgres from 'postgres';

const sql = postgres('postgresql://postgres:postgres@localhost:5432/postgres');

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

try {
  await sql.unsafe(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='auditkit' AND pid <> pg_backend_pid()"
  );
  await sql.unsafe('DROP DATABASE IF EXISTS auditkit');
  await sql.unsafe('CREATE DATABASE auditkit');
  print('Database recreated successfully');
} catch (e) {
  console.error(e);
}

await sql.end();
