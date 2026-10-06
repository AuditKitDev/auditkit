import { describe, expect, it } from "vitest";
import { postJsonWithRetry } from "./http.js";

function fakeFetch(statuses: number[]): { fetch: typeof fetch; calls: number } {
  const state = { calls: 0, fetch: undefined as unknown as typeof fetch };
  state.fetch = (async () => {
    const status = statuses[Math.min(state.calls, statuses.length - 1)]!;
    state.calls++;
    return new Response(`status ${status}`, { status });
  }) as typeof fetch;
  return state;
}

describe("retry", () => {
  it("retries on 429 and 5xx, then succeeds", async () => {
    const f = fakeFetch([429, 503, 201]);
    const res = await postJsonWithRetry(f.fetch, "http://x/", {}, { attempts: 4, baseDelayMs: 1 });
    expect(res.status).toBe(201);
    expect(f.calls).toBe(3);
  });

  it("does not retry 4xx other than 429", async () => {
    const f = fakeFetch([400]);
    const res = await postJsonWithRetry(f.fetch, "http://x/", {}, { attempts: 4, baseDelayMs: 1 });
    expect(res.status).toBe(400);
    expect(f.calls).toBe(1);
  });

  it("gives up after the configured attempts", async () => {
    const f = fakeFetch([500]);
    await expect(postJsonWithRetry(f.fetch, "http://x/", {}, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow(/500/);
    expect(f.calls).toBe(3);
  });
});
