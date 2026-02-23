import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatExitCodes, registerExitCodesCommands } from "../../../src/cmd/exit-codes/commands.js";

describe("exit-codes command", () => {
  it("formats exit codes as json", () => {
    const out = formatExitCodes("json");
    const parsed = JSON.parse(out) as { ok: number; usage: number; error: number };
    expect(parsed.ok).toBe(0);
    expect(parsed.usage).toBe(2);
    expect(parsed.error).toBe(1);
  });

  it("registers print subcommand", () => {
    const cmd = new Command("exit-codes");
    registerExitCodesCommands(cmd);
    const names = cmd.commands.map((sub) => sub.name());
    expect(names).toContain("print");
  });
});
