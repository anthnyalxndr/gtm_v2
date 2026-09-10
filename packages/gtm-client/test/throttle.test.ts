import { describe, it, expect, vi } from "vitest";
import { withRetry, createLimiter, isRetryable } from "../src/throttle.js";

function apiError(code: number): Error & { code: number } {
  return Object.assign(new Error(`HTTP ${code}`), { code });
}

describe("isRetryable", () => {
  it("retries 429 and 5xx, not 400/404", () => {
    expect(isRetryable(apiError(429))).toBe(true);
    expect(isRetryable(apiError(503))).toBe(true);
    expect(isRetryable(apiError(400))).toBe(false);
    expect(isRetryable(apiError(404))).toBe(false);
    expect(isRetryable(new Error("plain"))).toBe(false);
  });

  it("reads response.status when present", () => {
    expect(isRetryable({ response: { status: 500 } })).toBe(true);
  });
});

describe("withRetry", () => {
  it("retries a 429 then succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(apiError(429)).mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { baseDelayMs: 1, maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxAttempts", async () => {
    const fn = vi.fn().mockRejectedValue(apiError(503));
    await expect(withRetry(fn, { baseDelayMs: 1, maxAttempts: 2 })).rejects.toThrow("HTTP 503");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400", async () => {
    const fn = vi.fn().mockRejectedValue(apiError(400));
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow("HTTP 400");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("createLimiter", () => {
  it("spaces calls by at least the interval", async () => {
    const limit = createLimiter(20);
    const t0 = Date.now();
    await limit(async () => 1);
    await limit(async () => 2);
    await limit(async () => 3);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(40);
  });

  it("keeps running after a rejected call", async () => {
    const limit = createLimiter(1);
    await expect(
      limit(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    await expect(limit(async () => "next")).resolves.toBe("next");
  });
});
