import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatSheetsRead, registerSheetsCommands } from "../../../src/cmd/sheets/commands.js";

describe("sheets command formatters", () => {
  it("formats sheets read as json", () => {
    const out = formatSheetsRead({ range: "A1:B2", values: [["a", "b"]] }, "json");
    const parsed = JSON.parse(out) as { range: string };
    expect(parsed.range).toBe("A1:B2");
  });

  it("registers read and update subcommands", () => {
    const sheets = new Command("sheets");
    registerSheetsCommands(sheets);
    const names = sheets.commands.map((cmd) => cmd.name());
    expect(names).toContain("read");
    expect(names).toContain("update");
  });

  it("prints stable message when update is not applied", async () => {
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, {
      updateRange: async () => ({ updated: false }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "sheets", "update", "--id", "s1", "--range", "A1", "--values", "x"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Range update was not applied");
    expect(stdout).not.toContain("not implemented yet in TypeScript port");
  });
});
