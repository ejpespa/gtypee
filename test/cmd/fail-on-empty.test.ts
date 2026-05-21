import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { buildExecutionContext, checkFailOnEmpty } from "../../src/cmd/execution-context.js";
import { ExitError } from "../../src/cmd/exit.js";
import { EXIT_CODE_EMPTY } from "../../src/cmd/exit-codes.js";

describe("fail-on-empty flag", () => {
  it("buildExecutionContext sets failOnEmpty from options", () => {
    const ctx = buildExecutionContext({ failOnEmpty: true });
    expect(ctx.failOnEmpty).toBe(true);
  });

  it("buildExecutionContext defaults failOnEmpty to false", () => {
    const ctx = buildExecutionContext({});
    expect(ctx.failOnEmpty).toBe(false);
  });
});

describe("checkFailOnEmpty helper", () => {
  it("throws ExitError with EXIT_CODE_EMPTY when items are empty and flag is set", () => {
    const ctx = buildExecutionContext({ failOnEmpty: true });
    expect(() => checkFailOnEmpty(ctx, [])).toThrow(ExitError);
    try {
      checkFailOnEmpty(ctx, []);
    } catch (err) {
      expect((err as ExitError).code).toBe(EXIT_CODE_EMPTY);
    }
  });

  it("does not throw when items are non-empty and flag is set", () => {
    const ctx = buildExecutionContext({ failOnEmpty: true });
    expect(() => checkFailOnEmpty(ctx, [{ id: "1" }])).not.toThrow();
  });

  it("does not throw when items are empty but flag is not set", () => {
    const ctx = buildExecutionContext({});
    expect(() => checkFailOnEmpty(ctx, [])).not.toThrow();
  });

  it("does not throw when items are non-empty and flag is not set", () => {
    const ctx = buildExecutionContext({});
    expect(() => checkFailOnEmpty(ctx, [{ id: "1" }])).not.toThrow();
  });
});

describe("fail-on-empty integration with list commands", () => {
  it("gmail search exits 7 on empty results with --fail-on-empty", async () => {
    const { registerGmailCommands } = await import("../../src/cmd/gmail/commands.js");
    const root = new Command();
    root.option("--fail-on-empty", "", false);
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      listMessages: async () => ({ items: [] }),
    });

    let exitError: ExitError | undefined;
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (() => true) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "test", "--fail-on-empty", "gmail", "list"]);
    } catch (err) {
      if (err instanceof ExitError) exitError = err;
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(exitError).toBeDefined();
    expect(exitError!.code).toBe(EXIT_CODE_EMPTY);
  });
});
