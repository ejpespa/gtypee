import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatKeepNotes, registerKeepCommands } from "../../../src/cmd/keep/commands.js";

describe("keep command formatters", () => {
  it("formats notes as json", () => {
    const out = formatKeepNotes([{ id: "n1", title: "Note" }], "json");
    const parsed = JSON.parse(out) as { notes: Array<{ id: string }> };
    expect(parsed.notes[0]?.id).toBe("n1");
  });

  it("registers list and get subcommands", () => {
    const keep = new Command("keep");
    registerKeepCommands(keep);
    const names = keep.commands.map((cmd) => cmd.name());
    expect(names).toContain("list");
    expect(names).toContain("get");
    expect(names).toContain("search");
    expect(names).toContain("create");
    expect(names).toContain("update");
  });

  it("forwards query to search deps", async () => {
    let seenQuery = "";
    const root = new Command();
    const keep = root.command("keep");
    registerKeepCommands(keep, {
      searchNotes: async (query) => {
        seenQuery = query;
        return [];
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "keep", "search", "--query", "alpha"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(seenQuery).toBe("alpha");
  });

  it("supports create and update note flows", async () => {
    let created = false;
    let updated = false;
    const root = new Command();
    const keep = root.command("keep");
    registerKeepCommands(keep, {
      createNote: async (title) => {
        created = true;
        expect(title).toBe("Note");
        return { id: "n1", created: true };
      },
      updateNote: async (id, title) => {
        updated = true;
        expect(id).toBe("n1");
        expect(title).toBe("Updated");
        return { id, updated: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "keep", "create", "--title", "Note"]);
      await root.parseAsync(["node", "typee", "keep", "update", "--id", "n1", "--title", "Updated"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(created).toBe(true);
    expect(updated).toBe(true);
  });

  it("returns clear workspace-required error", async () => {
    const root = new Command();
    const keep = root.command("keep");
    registerKeepCommands(keep, {
      ensureWorkspace: async () => {
        throw new Error("workspace account required for keep");
      },
    });

    await expect(root.parseAsync(["node", "typee", "keep", "list"])).rejects.toThrow("workspace account required for keep");
  });
});
