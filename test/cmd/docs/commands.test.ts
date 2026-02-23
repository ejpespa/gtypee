import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatDocsReadResult, registerDocsCommands } from "../../../src/cmd/docs/commands.js";

describe("docs command formatters", () => {
  it("formats docs read as json", () => {
    const out = formatDocsReadResult({ id: "d1", title: "Doc", markdown: "# Doc" }, "json");
    const parsed = JSON.parse(out) as { id: string; title: string };
    expect(parsed.id).toBe("d1");
  });

  it("registers read and markdown subcommands", () => {
    const docs = new Command("docs");
    registerDocsCommands(docs);
    const names = docs.commands.map((cmd) => cmd.name());
    expect(names).toContain("read");
    expect(names).toContain("markdown");
    expect(names).toContain("write");
  });

  it("prints stable message when write is not applied", async () => {
    const root = new Command();
    const docs = root.command("docs");
    registerDocsCommands(docs, {
      writeDoc: async () => ({ id: "d1", updated: false }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "docs", "write", "--id", "d1", "--markdown", "# Updated"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Document update was not applied");
  });
});
