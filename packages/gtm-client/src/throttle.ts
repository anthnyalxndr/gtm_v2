export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

interface ErrorWithStatus {
  code?: number | string;
  status?: number;
  response?: { status?: number };
}

/** The HTTP status an API error carries, wherever gaxios put it; undefined when it has none. */
export function httpStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const e = err as ErrorWithStatus;
  const status = Number(e.response?.status ?? e.status ?? e.code);
  return Number.isFinite(status) ? status : undefined;
}

/** 429 and 5xx are worth retrying. Everything else is the caller's problem. */
export function isRetryable(err: unknown): boolean {
  const status = httpStatus(err);
  return status === 429 || (status !== undefined && status >= 500 && status < 600);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts || !isRetryable(err)) {
        throw err;
      }
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

/** Serializes calls and enforces a minimum gap between the start of each. */
export function createLimiter(minIntervalMs: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let chain: Promise<unknown> = Promise.resolve();
  let lastStart = 0;
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const wait = lastStart + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastStart = Date.now();
      return fn();
    });
    chain = run.catch(() => undefined);
    return run;
  };
}
