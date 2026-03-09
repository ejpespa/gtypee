import { describe, expect, it } from "vitest";

import { ExitError, exitCode, usageError } from "../../src/cmd/exit.js";

describe("exit", () => {
  it("returns embedded code from ExitError", () => {
    expect(exitCode(new ExitError(42, "boom"))).toBe(42);
  });

  it("returns usage code for usageError", () => {
    expect(exitCode(usageError("bad flags"))).toBe(2);
  });

  it("returns generic code for unknown errors", () => {
    expect(exitCode(new Error("x"))).toBe(1);
  });
});
