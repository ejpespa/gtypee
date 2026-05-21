import { describe, expect, it } from "vitest";

import { buildExecutionContext, stderr } from "../../src/cmd/execution-context.js";

describe("quiet flag", () => {
  it("buildExecutionContext sets quiet from options", () => {
    const ctx = buildExecutionContext({ quiet: true });
    expect(ctx.quiet).toBe(true);
  });

  it("buildExecutionContext defaults quiet to false", () => {
    const ctx = buildExecutionContext({});
    expect(ctx.quiet).toBe(false);
  });

  it("quiet and verbose are mutually exclusive", () => {
    expect(() => buildExecutionContext({ quiet: true, verbose: true })).toThrow();
  });

  it("stderr writes to process.stderr when not quiet", () => {
    let written = "";
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown): boolean => {
      written += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    stderr("hello\n", false);
    process.stderr.write = original;

    expect(written).toBe("hello\n");
  });

  it("stderr suppresses output when quiet", () => {
    let written = "";
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown): boolean => {
      written += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    stderr("hello\n", true);
    process.stderr.write = original;

    expect(written).toBe("");
  });
});
