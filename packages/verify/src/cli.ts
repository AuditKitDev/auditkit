#!/usr/bin/env node
// auditkit-verify <file.jsonl> [--pin <base64 spki | hostname>] [--online] [--json]
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { verifyExport, type Report, type VerifyOptions } from "./index.js";

/**
 * Production server keys by hostname, so an auditor can run `--pin api.auditkit.dev`
 * without copying the key. Fill in from https://api.auditkit.dev/.well-known/auditkit.json
 * once the production signing key exists; rotate by adding a new hostname entry, never by editing one.
 */
export const PINNED_KEYS: Record<string, string> = {};

const EXIT: Record<Report["verdict"], number> = { VALID: 0, VALID_UNANCHORED: 2, INVALID: 1 };

function usage(): never {
  console.error("usage: auditkit-verify <file.jsonl> [--pin <base64 spki | hostname>] [--online] [--json]");
  process.exit(64);
}

function parseArgs(argv: string[]): { file: string; opts: VerifyOptions; json: boolean; pinGiven: boolean } {
  let file: string | undefined;
  let json = false;
  const opts: VerifyOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--json") json = true;
    else if (a === "--online") opts.online = true;
    else if (a === "--pin") {
      const v = argv[++i];
      if (!v) usage();
      opts.pinnedServerKey = PINNED_KEYS[v] ?? v;
    } else if (a.startsWith("-")) usage();
    else if (file === undefined) file = a;
    else usage();
  }
  if (!file) usage();
  return { file, opts, json, pinGiven: opts.pinnedServerKey !== undefined };
}

function printHuman(r: Report, notes: string[]): void {
  for (const n of notes) console.log(n);
  const m = r.manifest;
  if (m && (m.requested_from !== m.from_position || m.requested_to !== m.to_position)) {
    console.log(`requested ${m.requested_from}..${m.requested_to}, exported ${m.from_position}..${m.to_position} (widened to whole root batches)`);
  }
  for (const c of r.checks) {
    const mark = c.status === "ok" ? "ok  " : c.status === "fail" ? "FAIL" : c.status === "unverified" ? "?   " : "-   ";
    const pos = c.position !== undefined ? ` [position ${c.position}]` : "";
    console.log(`${mark} ${c.name.padEnd(11)} ${c.summary}${pos}`);
    for (const d of c.details ?? []) console.log(`     ${d}`);
  }
  const why = r.failed ? ` (${r.failed.check}${r.failed.position !== null ? ` at position ${r.failed.position}` : ""}: ${r.failed.reason})` : "";
  console.log(`\n${r.verdict}${why}`);
}

async function peekServer(file: string): Promise<string | undefined> {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  try {
    for await (const l of rl) {
      if (!l.trim()) continue;
      const v = JSON.parse(l) as { type?: string; server?: unknown };
      return v.type === "manifest" && typeof v.server === "string" ? v.server : undefined;
    }
  } catch {
    // unreadable first line: verifyExport reports it
  } finally {
    rl.close();
  }
  return undefined;
}

async function main(): Promise<number> {
  const { file, opts, json, pinGiven } = parseArgs(process.argv.slice(2));
  const notes: string[] = [];
  if (!pinGiven) {
    const server = await peekServer(file);
    const key = server !== undefined && Object.hasOwn(PINNED_KEYS, server) ? PINNED_KEYS[server] : undefined;
    if (key !== undefined) {
      opts.pinnedServerKey = key;
      notes.push(`pinned server key for ${server} automatically`);
    } else {
      notes.push(`warning: server key is unpinned${server ? ` (${server} is not in the built-in list)` : ""}; pass --pin to pin it`);
    }
  }
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  const report = await verifyExport(lines, opts);
  if (json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report, notes);
  return EXIT[report.verdict];
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`auditkit-verify: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  },
);
