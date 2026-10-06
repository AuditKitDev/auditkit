// RFC 8785 JSON Canonicalization Scheme.
// Deterministic serialization at every level, so the same data always hashes the same.
// JSON.stringify already serializes numbers and strings the way RFC 8785 requires
// (ES2015 Number::toString, shortest round-trip); the work here is key ordering.

export type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JCS: non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v === undefined ? null : v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // RFC 8785 §3.2.3: sort by UTF-16 code units, which is JS default string comparison.
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
  }
  throw new TypeError(`JCS: unsupported type ${typeof value}`);
}
