// Minimal fetch wrapper: JSON in, text out, retry with backoff on 429/5xx and network errors.
export interface RetryOptions {
  attempts?: number;
  /** First backoff in ms; doubles each retry. */
  baseDelayMs?: number;
  timeoutMs?: number;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    url: string,
  ) {
    super(`${url} returned ${status}: ${body.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function postJsonWithRetry(
  fetchFn: typeof fetch,
  url: string,
  payload: unknown,
  opts: RetryOptions = {},
): Promise<{ status: number; text: string }> {
  const attempts = opts.attempts ?? 4;
  const base = opts.baseDelayMs ?? 1000;
  const timeout = opts.timeoutMs ?? 60_000; // Rekor v2 blocks until a checkpoint covers the entry
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(base * 2 ** (i - 1));
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeout),
      });
      const text = await res.text();
      if (res.status === 429 || res.status >= 500) {
        lastErr = new HttpError(res.status, text, url);
        const ra = Number(res.headers.get("retry-after"));
        if (Number.isFinite(ra) && ra > 0 && i < attempts - 1) await sleep(Math.min(ra, 30) * 1000);
        continue;
      }
      return { status: res.status, text };
    } catch (e) {
      lastErr = e; // network / timeout
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
