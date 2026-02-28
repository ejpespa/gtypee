import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatSheetsRead, registerSheetsCommands } from "../../../src/cmd/sheets/commands.js";
import type { SheetsCommandDeps, SheetsSummary } from "../../../src/cmd/sheets/commands.js";

describe("sheets types", () => {
  it("SheetsSummary should have id and name fields", () => {
    const sheet: SheetsSummary = {
      id: "xyz789",
      name: "My Spreadsheet",
      mimeType: "application/vnd.google-apps.spreadsheet",
    };
    expect(sheet.id).toBe("xyz789");
    expect(sheet.name).toBe("My Spreadsheet");
  });

  it("SheetsCommandDeps should include listSheets function", () => {
    const deps: SheetsCommandDeps = {
      listSheets: async (options) => ({ items: [] }),
    };
    expect(deps.listSheets).toBeDefined();
  });
});

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

describe("sheets list command", () => {
  it("should register list subcommand", () => {
    const sheets = new Command("sheets");
    registerSheetsCommands(sheets);
    const listCmd = sheets.commands.find((cmd) => cmd.name() === "list");
    expect(listCmd).toBeDefined();
  });

  it("list command should return spreadsheets", async () => {
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, {
      listSheets: async () => ({
        items: [
          { id: "sheet1", name: "My Spreadsheet", mimeType: "application/vnd.google-apps.spreadsheet" },
        ],
      }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "sheets", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("sheet1");
    expect(stdout).toContain("My Spreadsheet");
  });

  it("list command should pass pagination options", async () => {
    const listSheets = vi.fn().mockResolvedValue({ items: [] });
    const root = new Command();
    root.option("--json");
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { listSheets });

    await root.parseAsync(["node", "typee", "sheets", "list", "--page-size", "25"]);

    expect(listSheets).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 25 })
    );
  });
});
