import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { registerCompletionCommands } from "../../../src/cmd/completion/commands.js";

describe("completion command", () => {
  it("registers script subcommand", () => {
    const completion = new Command("completion");
    registerCompletionCommands(completion);
    const names = completion.commands.map((cmd) => cmd.name());
    expect(names).toContain("script");
  });

  it("prints completion script that references typee", async () => {
    const root = new Command();
    const completion = root.command("completion");
    registerCompletionCommands(completion);

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "completion", "script", "--shell", "bash"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("typee");
  });
});
