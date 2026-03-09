import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatDocsReadResult, registerDocsCommands } from "../../../src/cmd/docs/commands.js";
import type { DocsCommandDeps, DocsSummary, DocsExportResult } from "../../../src/cmd/docs/commands.js";

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

describe("docs list command", () => {
  it("should register list subcommand", () => {
    const docs = new Command("docs");
    registerDocsCommands(docs);
    const listCmd = docs.commands.find((cmd) => cmd.name() === "list");
    expect(listCmd).toBeDefined();
  });

  it("list command should return documents", async () => {
    const root = new Command();
    const docs = root.command("docs");
    registerDocsCommands(docs, {
      listDocs: async () => ({
        items: [
          { id: "doc1", name: "My Document", mimeType: "application/vnd.google-apps.document" },
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
      await root.parseAsync(["node", "typee", "docs", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("doc1");
    expect(stdout).toContain("My Document");
  });

  it("list command should pass pagination options", async () => {
    const listDocs = vi.fn().mockResolvedValue({ items: [] });
    const root = new Command();
    root.option("--json");
    const docs = root.command("docs");
    registerDocsCommands(docs, { listDocs });

    await root.parseAsync(["node", "typee", "docs", "list", "--page-size", "50"]);

    expect(listDocs).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 50 })
    );
  });
});

describe("docs types", () => {
  it("DocsSummary should have id and name fields", () => {
    const doc: DocsSummary = {
      id: "abc123",
      name: "My Document",
      mimeType: "application/vnd.google-apps.document",
    };
    expect(doc.id).toBe("abc123");
    expect(doc.name).toBe("My Document");
  });
});

describe("docs export types", () => {
  it("DocsExportResult should have required fields", () => {
    const result: DocsExportResult = {
      id: "doc123",
      format: "pdf",
      path: "/path/to/doc.pdf",
      exported: true,
    };
    expect(result.id).toBe("doc123");
    expect(result.format).toBe("pdf");
    expect(result.exported).toBe(true);
  });
});

describe("docs export command", () => {
  it("should register export subcommand", () => {
    const docs = new Command("docs");
    registerDocsCommands(docs);

    const exportCmd = docs.commands.find((cmd) => cmd.name() === "export");
    expect(exportCmd).toBeDefined();
  });

  it("export command should call exportDoc with correct params", async () => {
    const exportDoc = vi.fn().mockResolvedValue({
      id: "doc1",
      format: "pdf",
      path: "./doc1.pdf",
      exported: true,
    });
    const root = new Command();
    const docs = root.command("docs");
    registerDocsCommands(docs, { exportDoc });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "docs", "export", "--id", "doc1", "--format", "pdf"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(exportDoc).toHaveBeenCalledWith("doc1", "pdf", undefined);
    expect(stdout).toContain("doc1");
  });
});
