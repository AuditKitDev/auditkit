// HTTP client for an OpenTimestamps calendar / aggregator.
// Protocol per python-opentimestamps/opentimestamps/calendar.py: POST /digest with the raw
// digest body returns a Timestamp for that digest; GET /timestamp/<hex> returns the
// Timestamp for a commitment, or 404 while the calendar has nothing newer.
import { bytesToHex, parseTimestamp, type Timestamp } from "./ots.js";

export type FetchLike = typeof fetch;

export const USER_AGENT = "auditkit-anchor-ots/2.0";
const ACCEPT = "application/vnd.opentimestamps.v1";

export class CalendarError extends Error {
  constructor(
    readonly url: string,
    message: string,
  ) {
    super(`${url}: ${message}`);
  }
}

export class RemoteCalendar {
  readonly url: string;
  constructor(
    url: string,
    private readonly fetchFn: FetchLike,
    private readonly timeoutMs: number,
  ) {
    this.url = url.replace(/\/+$/, "");
  }

  async submit(digest: Uint8Array): Promise<Timestamp> {
    const res = await this.request(`${this.url}/digest`, { method: "POST", body: Uint8Array.from(digest) });
    if (!res.ok) throw new CalendarError(this.url, `submit failed: HTTP ${res.status}`);
    return this.parse(await res.arrayBuffer(), digest);
  }

  /** Null while the calendar has no attestation newer than the pending one. */
  async getTimestamp(commitment: Uint8Array): Promise<Timestamp | null> {
    const res = await this.request(`${this.url}/timestamp/${bytesToHex(commitment)}`, { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) throw new CalendarError(this.url, `upgrade failed: HTTP ${res.status}`);
    return this.parse(await res.arrayBuffer(), commitment);
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, {
        ...init,
        headers: { Accept: ACCEPT, "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      throw new CalendarError(this.url, e instanceof Error ? e.message : String(e));
    }
  }

  private parse(body: ArrayBuffer, msg: Uint8Array): Timestamp {
    try {
      return parseTimestamp(new Uint8Array(body), msg);
    } catch (e) {
      throw new CalendarError(this.url, `bad response: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/** Glob whitelist as in the reference clients: `*` matches any run of characters. */
export function urlInWhitelist(url: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => {
    const re = new RegExp("^" + p.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    return re.test(url);
  });
}
