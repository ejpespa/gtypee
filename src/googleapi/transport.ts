export function shouldRetryStatus(statusCode: number): boolean {
  return statusCode === 429 || statusCode >= 500;
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
  if ((value ?? "").trim() === "") {
    return undefined;
  }

  const raw = (value ?? "").trim();
  const seconds = Number.parseInt(raw, 10);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds) * 1000;
  }

  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) {
    return undefined;
  }

  return Math.max(0, ts - Date.now());
}

export function calculateBackoffMs(
  attempt: number,
  retryAfterHeader: string | undefined,
  baseDelayMs: number,
  random: () => number = Math.random,
): number {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  if (baseDelayMs <= 0) {
    return 0;
  }

  const base = baseDelayMs * 2 ** attempt;
  if (!Number.isFinite(base) || base <= 0) {
    return 0;
  }

  const jitterRange = Math.floor(base / 2);
  if (jitterRange <= 0) {
    return base;
  }

  const clamped = Math.max(0, Math.min(1, random()));
  const jitter = Math.floor(clamped * jitterRange);
  return base + jitter;
}
