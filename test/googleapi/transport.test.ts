import { describe, expect, it } from "vitest";

import {
  MAX_5XX_RETRIES,
  MAX_RATE_LIMIT_RETRIES,
  RATE_LIMIT_BASE_DELAY_MS,
  SERVER_ERROR_RETRY_DELAY_MS,
} from "../../src/googleapi/retry-constants.js";
import { calculateBackoffMs, shouldRetryStatus } from "../../src/googleapi/transport.js";

describe("googleapi transport helpers", () => {
  it("exports retry constants", () => {
    expect(MAX_RATE_LIMIT_RETRIES).toBe(3);
    expect(MAX_5XX_RETRIES).toBe(1);
    expect(RATE_LIMIT_BASE_DELAY_MS).toBe(1000);
    expect(SERVER_ERROR_RETRY_DELAY_MS).toBe(1000);
  });

  it("retries on 429 and 5xx only", () => {
    expect(shouldRetryStatus(429)).toBe(true);
    expect(shouldRetryStatus(500)).toBe(true);
    expect(shouldRetryStatus(503)).toBe(true);
    expect(shouldRetryStatus(404)).toBe(false);
  });

  it("uses Retry-After seconds when present", () => {
    expect(calculateBackoffMs(0, "3", 1000, () => 0.1)).toBe(3000);
  });

  it("falls back to exponential backoff + jitter", () => {
    // attempt=1 => base 2000, jitter range 1000, fixed jitter 0.5 => +500
    expect(calculateBackoffMs(1, undefined, 1000, () => 0.5)).toBe(2500);
  });
});
