import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { registerSchemaCommands } from "../../../src/cmd/schema/commands.js";

describe("schema command", () => {
  it("registers print subcommand", () => {
    const schema = new Command("schema");
    registerSchemaCommands(schema);
    const names = schema.commands.map((cmd) => cmd.name());
    expect(names).toContain("print");
  });

  it("prints schema payload with typee runtime name", async () => {
    const root = new Command();
    const schema = root.command("schema");
    registerSchemaCommands(schema);

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "schema", "print"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const payload = JSON.parse(stdout.trim()) as { name: string };
    expect(payload.name).toBe("typee");
  });
});
