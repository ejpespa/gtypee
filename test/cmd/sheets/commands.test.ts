import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatSheetsRead, registerSheetsCommands, type SheetsShareOptions } from "../../../src/cmd/sheets/commands.js";
import type { SheetsCommandDeps, SheetsExportResult, SheetsShareResult, SheetsSummary } from "../../../src/cmd/sheets/commands.js";

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

describe("sheets export types", () => {
  it("SheetsExportResult should have required fields", () => {
    const result: SheetsExportResult = {
      id: "sheet123",
      format: "xlsx",
      path: "/path/to/sheet.xlsx",
      exported: true,
    };
    expect(result.id).toBe("sheet123");
    expect(result.format).toBe("xlsx");
    expect(result.exported).toBe(true);
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

describe("sheets export command", () => {
  it("should register export subcommand", () => {
    const sheets = new Command("sheets");
    registerSheetsCommands(sheets);

    const exportCmd = sheets.commands.find((cmd) => cmd.name() === "export");
    expect(exportCmd).toBeDefined();
  });

  it("export command should call exportSheet with correct params", async () => {
    const exportSheet = vi.fn().mockResolvedValue({
      id: "sheet1",
      format: "xlsx",
      path: "./sheet1.xlsx",
      exported: true,
    });
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { exportSheet });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "sheets", "export", "--id", "sheet1", "--format", "xlsx"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(exportSheet).toHaveBeenCalledWith("sheet1", "xlsx", undefined);
    expect(stdout).toContain("sheet1");
  });
});

describe("sheets share command", () => {
  it("should register share subcommand", () => {
    const sheets = new Command("sheets");
    registerSheetsCommands(sheets);

    const shareCmd = sheets.commands.find((cmd) => cmd.name() === "share");
    expect(shareCmd).toBeDefined();
  });

  it("share command requires email for user type", async () => {
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, {
      shareSheet: async () => ({ id: "", fileId: "sheet1", shared: false }),
    });

    let stderr = "";
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown): boolean => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    try {
      await root.parseAsync(["node", "typee", "sheets", "share", "sheet1", "--role", "reader", "--type", "user"]);
    } catch {
      // Exit code 1 is expected
    } finally {
      process.stderr.write = originalStderrWrite;
    }

    expect(stderr).toContain("--email is required");
  });

  it("share command requires domain for domain type", async () => {
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, {
      shareSheet: async () => ({ id: "", fileId: "sheet1", shared: false }),
    });

    let stderr = "";
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: unknown): boolean => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    try {
      await root.parseAsync(["node", "typee", "sheets", "share", "sheet1", "--role", "reader", "--type", "domain"]);
    } catch {
      // Exit code 1 is expected
    } finally {
      process.stderr.write = originalStderrWrite;
    }

    expect(stderr).toContain("--domain is required");
  });

  it("share command calls shareSheet with correct options for user", async () => {
    const shareSheet = vi.fn().mockResolvedValue({
      id: "perm123",
      fileId: "sheet1",
      shared: true,
    });
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { shareSheet });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node", "typee", "sheets", "share", "sheet1",
        "--role", "writer",
        "--type", "user",
        "--email", "user@example.com"
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const expectedOptions: SheetsShareOptions = {
      role: "writer",
      type: "user",
      email: "user@example.com",
    };
    expect(shareSheet).toHaveBeenCalledWith("sheet1", expectedOptions);
    expect(stdout).toContain("shared with user@example.com as writer");
  });

  it("share command works for anyone type", async () => {
    const shareSheet = vi.fn().mockResolvedValue({
      id: "perm123",
      fileId: "sheet1",
      shared: true,
    });
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { shareSheet });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node", "typee", "sheets", "share", "sheet1",
        "--role", "reader",
        "--type", "anyone"
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const expectedOptions: SheetsShareOptions = {
      role: "reader",
      type: "anyone",
    };
    expect(shareSheet).toHaveBeenCalledWith("sheet1", expectedOptions);
    expect(stdout).toContain("publicly (anyone) as reader");
  });

  it("share command works for domain type", async () => {
    const shareSheet = vi.fn().mockResolvedValue({
      id: "perm123",
      fileId: "sheet1",
      shared: true,
    });
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { shareSheet });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node", "typee", "sheets", "share", "sheet1",
        "--role", "writer",
        "--type", "domain",
        "--domain", "example.com"
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const expectedOptions: SheetsShareOptions = {
      role: "writer",
      type: "domain",
      domain: "example.com",
    };
    expect(shareSheet).toHaveBeenCalledWith("sheet1", expectedOptions);
    expect(stdout).toContain("with domain (example.com) as writer");
  });

  it("share command supports notify and message options", async () => {
    const shareSheet = vi.fn().mockResolvedValue({
      id: "perm123",
      fileId: "sheet1",
      shared: true,
    });
    const root = new Command();
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { shareSheet });

    await root.parseAsync([
      "node", "typee", "sheets", "share", "sheet1",
      "--role", "reader",
      "--type", "user",
      "--email", "user@example.com",
      "--notify",
      "--message", "Please review this sheet"
    ]);

    const expectedOptions: SheetsShareOptions = {
      role: "reader",
      type: "user",
      email: "user@example.com",
      notify: true,
      message: "Please review this sheet",
    };
    expect(shareSheet).toHaveBeenCalledWith("sheet1", expectedOptions);
  });

  it("share command outputs JSON with --json flag", async () => {
    const shareSheet = vi.fn().mockResolvedValue({
      id: "perm123",
      fileId: "sheet1",
      shared: true,
    });
    const root = new Command();
    root.option("--json", "Output as JSON");
    const sheets = root.command("sheets");
    registerSheetsCommands(sheets, { shareSheet });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node", "typee", "sheets", "share", "sheet1",
        "--role", "reader",
        "--type", "anyone",
        "--json"
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as SheetsShareResult;
    expect(parsed.shared).toBe(true);
    expect(parsed.fileId).toBe("sheet1");
  });
});
