// OpenTimestamps wire format: detached .ots files and the calendar Timestamp
// serialization. Ported from python-opentimestamps/opentimestamps/core
// (serialize.py, op.py, notary.py, timestamp.py, timestamp.py:DetachedTimestampFile).
import { createHash } from "node:crypto";

export const HEADER_MAGIC = Uint8Array.from([
  0x00, ...Buffer.from("OpenTimestamps"), 0x00, 0x00, ...Buffer.from("Proof"), 0x00,
  0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);
export const MAJOR_VERSION = 1;

const MAX_MSG_LENGTH = 4096; // Op.MAX_MSG_LENGTH and MAX_RESULT_LENGTH
const MAX_ATTESTATION_PAYLOAD = 8192;
const MAX_URI_LENGTH = 1000;
const MAX_RECURSION = 256;

export const OpTag = {
  SHA1: 0x02,
  RIPEMD160: 0x03,
  SHA256: 0x08,
  KECCAK256: 0x67,
  APPEND: 0xf0,
  PREPEND: 0xf1,
  REVERSE: 0xf2,
  HEXLIFY: 0xf3,
} as const;

export type BinaryOpTag = typeof OpTag.APPEND | typeof OpTag.PREPEND;
export type UnaryOpTag =
  | typeof OpTag.SHA1
  | typeof OpTag.RIPEMD160
  | typeof OpTag.SHA256
  | typeof OpTag.REVERSE
  | typeof OpTag.HEXLIFY;
export type Op = { tag: BinaryOpTag; arg: Uint8Array } | { tag: UnaryOpTag };

const DIGEST_LENGTH: Partial<Record<number, number>> = { [OpTag.SHA1]: 20, [OpTag.RIPEMD160]: 20, [OpTag.SHA256]: 32 };

export const PENDING_TAG = Buffer.from("83dfe30d2ef90c8e", "hex");
export const BITCOIN_TAG = Buffer.from("0588960d73d71901", "hex");
export const LITECOIN_TAG = Buffer.from("06869a0d73d71b45", "hex");

export type Attestation =
  | { type: "pending"; uri: string }
  | { type: "bitcoin"; height: number }
  | { type: "litecoin"; height: number }
  | { type: "unknown"; tag: Uint8Array; payload: Uint8Array };

/** A node in the proof tree: `msg` is the value at this node, each op maps it to a child. */
export interface Timestamp {
  msg: Uint8Array;
  attestations: Attestation[];
  ops: Array<{ op: Op; stamp: Timestamp }>;
}

export interface DetachedTimestamp {
  /** Tag of the hash op the file digest was made with (sha256 = 0x08). */
  hashOpTag: number;
  digest: Uint8Array;
  timestamp: Timestamp;
}

export class OtsFormatError extends Error {}

// ---- byte helpers ----

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.compare(a, b) === 0;
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^([0-9a-fA-F]{2})*$/.test(hex)) throw new OtsFormatError("not a hex string");
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function bytesToHex(b: Uint8Array): string {
  return Buffer.from(b).toString("hex");
}

class Reader {
  pos = 0;
  constructor(private readonly buf: Uint8Array) {}
  byte(): number {
    const b = this.buf[this.pos];
    if (b === undefined) throw new OtsFormatError("unexpected end of data");
    this.pos++;
    return b;
  }
  bytes(n: number): Uint8Array {
    if (this.pos + n > this.buf.length) throw new OtsFormatError("unexpected end of data");
    const out = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  varuint(): number {
    let value = 0;
    let shift = 0;
    for (;;) {
      const b = this.byte();
      value += (b & 0x7f) * 2 ** shift;
      if (!(b & 0x80)) break;
      shift += 7;
      if (shift > 56) throw new OtsFormatError("varuint too large");
    }
    if (!Number.isSafeInteger(value)) throw new OtsFormatError("varuint too large");
    return value;
  }
  varbytes(max: number, min = 0): Uint8Array {
    const len = this.varuint();
    if (len > max) throw new OtsFormatError(`varbytes too long: ${len} > ${max}`);
    if (len < min) throw new OtsFormatError(`varbytes too short: ${len} < ${min}`);
    return this.bytes(len);
  }
  assertEof(): void {
    if (this.pos !== this.buf.length) throw new OtsFormatError("trailing data");
  }
}

class Writer {
  private chunks: Uint8Array[] = [];
  byte(b: number): void {
    this.chunks.push(Uint8Array.of(b));
  }
  bytes(b: Uint8Array): void {
    this.chunks.push(b);
  }
  varuint(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) throw new OtsFormatError("bad varuint");
    if (value === 0) return this.byte(0);
    while (value !== 0) {
      let b = value % 128;
      if (value > 0x7f) b |= 0x80;
      this.byte(b);
      if (value <= 0x7f) break;
      value = Math.floor(value / 128);
    }
  }
  varbytes(b: Uint8Array): void {
    this.varuint(b.length);
    this.bytes(b);
  }
  out(): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(Buffer.concat(this.chunks));
  }
}

// ---- ops ----

export function applyOp(op: Op, msg: Uint8Array): Uint8Array {
  if (msg.length > MAX_MSG_LENGTH) throw new OtsFormatError("message too long");
  let r: Uint8Array;
  switch (op.tag) {
    case OpTag.APPEND:
      r = Uint8Array.from(Buffer.concat([msg, op.arg]));
      break;
    case OpTag.PREPEND:
      r = Uint8Array.from(Buffer.concat([op.arg, msg]));
      break;
    case OpTag.REVERSE:
      if (msg.length === 0) throw new OtsFormatError("can't reverse an empty message");
      r = Uint8Array.from(msg).reverse();
      break;
    case OpTag.HEXLIFY:
      if (msg.length === 0) throw new OtsFormatError("can't hexlify an empty message");
      r = Uint8Array.from(Buffer.from(bytesToHex(msg), "ascii"));
      break;
    case OpTag.SHA1:
      r = Uint8Array.from(createHash("sha1").update(msg).digest());
      break;
    case OpTag.RIPEMD160:
      r = Uint8Array.from(createHash("ripemd160").update(msg).digest());
      break;
    case OpTag.SHA256:
      r = Uint8Array.from(createHash("sha256").update(msg).digest());
      break;
  }
  if (r.length > MAX_MSG_LENGTH) throw new OtsFormatError("result too long");
  return r;
}

function readOp(r: Reader, tag: number): Op {
  switch (tag) {
    case OpTag.APPEND:
    case OpTag.PREPEND:
      return { tag, arg: r.varbytes(MAX_MSG_LENGTH, 1) };
    case OpTag.SHA1:
    case OpTag.RIPEMD160:
    case OpTag.SHA256:
    case OpTag.REVERSE:
    case OpTag.HEXLIFY:
      return { tag };
    case OpTag.KECCAK256:
      throw new OtsFormatError("keccak256 op is not supported");
    default:
      throw new OtsFormatError(`unknown op tag 0x${tag.toString(16)}`);
  }
}

function writeOp(w: Writer, op: Op): void {
  w.byte(op.tag);
  if ("arg" in op) w.varbytes(op.arg);
}

export function opEquals(a: Op, b: Op): boolean {
  if (a.tag !== b.tag) return false;
  if ("arg" in a && "arg" in b) return bytesEqual(a.arg, b.arg);
  return true;
}

function compareOps(a: Op, b: Op): number {
  if (a.tag !== b.tag) return a.tag - b.tag;
  if ("arg" in a && "arg" in b) return Buffer.compare(a.arg, b.arg);
  return 0;
}

// ---- attestations ----

const URI_RE = /^[A-Za-z0-9._/:-]+$/;

function readAttestation(r: Reader): Attestation {
  const tag = r.bytes(8);
  const payloadBytes = r.varbytes(MAX_ATTESTATION_PAYLOAD);
  const payload = new Reader(payloadBytes);
  if (bytesEqual(tag, PENDING_TAG)) {
    const uri = Buffer.from(payload.varbytes(MAX_URI_LENGTH)).toString("utf8");
    payload.assertEof();
    if (!URI_RE.test(uri)) throw new OtsFormatError("pending attestation uri has invalid characters");
    return { type: "pending", uri };
  }
  if (bytesEqual(tag, BITCOIN_TAG) || bytesEqual(tag, LITECOIN_TAG)) {
    const height = payload.varuint();
    payload.assertEof();
    return { type: bytesEqual(tag, BITCOIN_TAG) ? "bitcoin" : "litecoin", height };
  }
  return { type: "unknown", tag, payload: payloadBytes };
}

function attestationTag(a: Attestation): Uint8Array {
  switch (a.type) {
    case "pending":
      return PENDING_TAG;
    case "bitcoin":
      return BITCOIN_TAG;
    case "litecoin":
      return LITECOIN_TAG;
    case "unknown":
      return a.tag;
  }
}

function writeAttestation(w: Writer, a: Attestation): void {
  w.bytes(attestationTag(a));
  const p = new Writer();
  switch (a.type) {
    case "pending":
      p.varbytes(Uint8Array.from(Buffer.from(a.uri, "utf8")));
      break;
    case "bitcoin":
    case "litecoin":
      p.varuint(a.height);
      break;
    case "unknown":
      p.bytes(a.payload);
      break;
  }
  w.varbytes(p.out());
}

export function attestationEquals(a: Attestation, b: Attestation): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "pending" && b.type === "pending") return a.uri === b.uri;
  if ((a.type === "bitcoin" || a.type === "litecoin") && (b.type === "bitcoin" || b.type === "litecoin"))
    return a.height === b.height;
  if (a.type === "unknown" && b.type === "unknown") return bytesEqual(a.tag, b.tag) && bytesEqual(a.payload, b.payload);
  return false;
}

function compareAttestations(a: Attestation, b: Attestation): number {
  const t = Buffer.compare(attestationTag(a), attestationTag(b));
  if (t !== 0) return t;
  if (a.type === "pending" && b.type === "pending") return a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0;
  if ((a.type === "bitcoin" || a.type === "litecoin") && (b.type === "bitcoin" || b.type === "litecoin"))
    return a.height - b.height;
  if (a.type === "unknown" && b.type === "unknown") return Buffer.compare(a.payload, b.payload);
  return 0;
}

// ---- timestamp tree ----

function readTimestamp(r: Reader, msg: Uint8Array, depth: number): Timestamp {
  if (depth <= 0) throw new OtsFormatError("timestamp nesting too deep");
  const ts: Timestamp = { msg, attestations: [], ops: [] };
  const tagOrAttestation = (tag: number): void => {
    if (tag === 0x00) {
      ts.attestations.push(readAttestation(r));
    } else {
      const op = readOp(r, tag);
      ts.ops.push({ op, stamp: readTimestamp(r, applyOp(op, msg), depth - 1) });
    }
  };
  let tag = r.byte();
  while (tag === 0xff) {
    tagOrAttestation(r.byte());
    tag = r.byte();
  }
  tagOrAttestation(tag);
  return ts;
}

function writeTimestamp(w: Writer, ts: Timestamp): void {
  if (ts.attestations.length === 0 && ts.ops.length === 0) throw new OtsFormatError("empty timestamp");
  const atts = [...ts.attestations].sort(compareAttestations);
  const ops = [...ts.ops].sort((a, b) => compareOps(a.op, b.op));
  const last = atts.pop();
  for (const a of atts) {
    w.byte(0xff);
    w.byte(0x00);
    writeAttestation(w, a);
  }
  if (ops.length === 0) {
    w.byte(0x00);
    writeAttestation(w, last!);
    return;
  }
  if (last) {
    w.byte(0xff);
    w.byte(0x00);
    writeAttestation(w, last);
  }
  ops.forEach(({ op, stamp }, i) => {
    if (i < ops.length - 1) w.byte(0xff);
    writeOp(w, op);
    writeTimestamp(w, stamp);
  });
}

/** Parse a calendar response: a Timestamp whose root message is `msg`. */
export function parseTimestamp(bytes: Uint8Array, msg: Uint8Array): Timestamp {
  const r = new Reader(bytes);
  const ts = readTimestamp(r, msg, MAX_RECURSION);
  r.assertEof();
  return ts;
}

export function serializeTimestamp(ts: Timestamp): Uint8Array<ArrayBuffer> {
  const w = new Writer();
  writeTimestamp(w, ts);
  return w.out();
}

export function parseDetached(bytes: Uint8Array): DetachedTimestamp {
  const r = new Reader(bytes);
  if (!bytesEqual(r.bytes(HEADER_MAGIC.length), HEADER_MAGIC)) throw new OtsFormatError("not an .ots file (bad magic)");
  const version = r.varuint();
  if (version !== MAJOR_VERSION) throw new OtsFormatError(`unsupported .ots version ${version}`);
  const hashOpTag = r.byte();
  const len = DIGEST_LENGTH[hashOpTag];
  if (len === undefined) throw new OtsFormatError(`unsupported file hash op 0x${hashOpTag.toString(16)}`);
  const digest = r.bytes(len);
  const timestamp = readTimestamp(r, digest, MAX_RECURSION);
  r.assertEof();
  return { hashOpTag, digest, timestamp };
}

export function serializeDetached(d: DetachedTimestamp): Uint8Array<ArrayBuffer> {
  const w = new Writer();
  w.bytes(HEADER_MAGIC);
  w.varuint(MAJOR_VERSION);
  w.byte(d.hashOpTag);
  w.bytes(d.digest);
  writeTimestamp(w, d.timestamp);
  return w.out();
}

/** Add an op under `ts`, reusing an existing identical edge. Returns the child node. */
export function addOp(ts: Timestamp, op: Op): Timestamp {
  const existing = ts.ops.find((e) => opEquals(e.op, op));
  if (existing) return existing.stamp;
  const stamp: Timestamp = { msg: applyOp(op, ts.msg), attestations: [], ops: [] };
  ts.ops.push({ op, stamp });
  return stamp;
}

/** Merge `other` into `ts`. Both must be for the same message. */
export function mergeTimestamp(ts: Timestamp, other: Timestamp): void {
  if (!bytesEqual(ts.msg, other.msg)) throw new OtsFormatError("can't merge timestamps for different messages");
  for (const a of other.attestations) {
    if (!ts.attestations.some((x) => attestationEquals(x, a))) ts.attestations.push(a);
  }
  for (const { op, stamp } of other.ops) mergeTimestamp(addOp(ts, op), stamp);
}

/** Every attestation in the tree with the node it hangs off. */
export function allAttestations(ts: Timestamp): Array<{ stamp: Timestamp; attestation: Attestation }> {
  const out: Array<{ stamp: Timestamp; attestation: Attestation }> = [];
  const walk = (t: Timestamp): void => {
    for (const attestation of t.attestations) out.push({ stamp: t, attestation });
    for (const { stamp } of t.ops) walk(stamp);
  };
  walk(ts);
  return out;
}
