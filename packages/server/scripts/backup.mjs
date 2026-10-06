// Consistent SQLite backups via the online backup API (safe while the server runs).
// Usage: node scripts/backup.mjs <dataDir> <outDir>
import { backup, DatabaseSync } from "node:sqlite";
import { readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [dataDir = "/data", outDir = "/backup"] = process.argv.slice(2);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = join(outDir, stamp);
mkdirSync(join(dest, "projects"), { recursive: true });

const files = ["registry.db", ...readdirSync(join(dataDir, "projects")).filter((f) => f.endsWith(".db")).map((f) => join("projects", f))];
for (const f of files) {
  const src = new DatabaseSync(join(dataDir, f), { readOnly: true });
  await backup(src, join(dest, f));
  src.close();
}
for (const k of ["signing.key", "anchor.key"]) if (existsSync(join(dataDir, k))) copyFileSync(join(dataDir, k), join(dest, k));
console.log(`backed up ${files.length} databases + keys to ${dest}`);
