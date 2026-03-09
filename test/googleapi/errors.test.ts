import { describe, expect, it } from "vitest";

import {
  AuthRequiredError,
  CircuitBreakerError,
  NotFoundError,
  PermissionDeniedError,
  QuotaExceededError,
  RateLimitError,
  isAuthRequiredError,
  isCircuitBreakerError,
  isNotFoundError,
  isPermissionDeniedError,
  isQuotaExceededError,
  isRateLimitError,
} from "../../src/googleapi/errors.js";

describe("googleapi errors", () => {
  it("formats auth required message", () => {
    const err = new AuthRequiredError("gmail", "a@b.com", "team");
    expect(err.message).toBe("auth required for gmail a@b.com (client team)");
    expect(isAuthRequiredError(err)).toBe(true);
  });

  it("formats rate limit message", () => {
    const err = new RateLimitError(3, 1200);
    expect(err.message).toContain("rate limit exceeded");
    expect(isRateLimitError(err)).toBe(true);
  });

  it("supports circuit breaker and other typed errors", () => {
    expect(isCircuitBreakerError(new CircuitBreakerError())).toBe(true);
    expect(isQuotaExceededError(new QuotaExceededError("drive"))).toBe(true);
    expect(isNotFoundError(new NotFoundError("file", "123"))).toBe(true);
    expect(isPermissionDeniedError(new PermissionDeniedError("calendar", "edit"))).toBe(true);
  });
});
