import { describe, expect, it } from "vitest";

import { buildExecutionContext } from "../../src/cmd/execution-context.js";
import { exitCode } from "../../src/cmd/exit.js";
import { EXIT_CODE_TIMEOUT } from "../../src/cmd/exit-codes.js";

describe("timeout flag", () => {
  it("buildExecutionContext sets timeout from options", () => {
    const ctx = buildExecutionContext({ timeout: "30" });
    expect(ctx.timeout).toBe(30);
  });

  it("buildExecutionContext defaults timeout to undefined", () => {
    const ctx = buildExecutionContext({});
    expect(ctx.timeout).toBeUndefined();
  });

  it("timeout <= 0 throws usage error", () => {
    expect(() => buildExecutionContext({ timeout: "0" })).toThrow();
  });

  it("timeout negative throws usage error", () => {
    expect(() => buildExecutionContext({ timeout: "-5" })).toThrow();
  });

  it("timeout non-numeric throws usage error", () => {
    expect(() => buildExecutionContext({ timeout: "abc" })).toThrow();
  });

  it("TimeoutError DOMException maps to EXIT_CODE_TIMEOUT", () => {
    const err = new DOMException("signal timed out", "TimeoutError");
    expect(exitCode(err)).toBe(EXIT_CODE_TIMEOUT);
  });
});
