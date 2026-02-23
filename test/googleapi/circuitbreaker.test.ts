import { describe, expect, it } from "vitest";

import { CircuitBreaker } from "../../src/googleapi/circuitbreaker.js";

describe("CircuitBreaker", () => {
  it("opens after threshold failures and resets after timeout", () => {
    let now = 0;
    const cb = new CircuitBreaker({
      threshold: 3,
      resetMs: 1000,
      now: () => now,
    });

    expect(cb.state()).toBe("closed");
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);

    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    expect(cb.state()).toBe("open");

    now = 1500;
    expect(cb.isOpen()).toBe(false);
    expect(cb.state()).toBe("closed");
  });

  it("recordSuccess closes and resets failures", () => {
    const cb = new CircuitBreaker({ threshold: 1, resetMs: 1000, now: () => 0 });
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    cb.recordSuccess();
    expect(cb.isOpen()).toBe(false);
  });
});
