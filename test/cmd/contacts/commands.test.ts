import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatContactsList, registerContactsCommands } from "../../../src/cmd/contacts/commands.js";

describe("contacts command formatters", () => {
  it("formats contacts as json", () => {
    const out = formatContactsList({ items: [{ resourceName: "people/1", email: "a@b.com" }] }, "json");
    const parsed = JSON.parse(out) as { items: Array<{ resourceName: string }> };
    expect(parsed.items[0]?.resourceName).toBe("people/1");
  });

  it("registers list and search subcommands", () => {
    const contacts = new Command("contacts");
    registerContactsCommands(contacts);
    const names = contacts.commands.map((cmd) => cmd.name());
    expect(names).toContain("list");
    expect(names).toContain("search");
    expect(names).toContain("get");
    expect(names).toContain("update");
  });

  it("executes get and update contact flows", async () => {
    let got = false;
    let updated = false;
    const root = new Command();
    const contacts = root.command("contacts");
    registerContactsCommands(contacts, {
      getContact: async (resourceName) => {
        got = true;
        return { resourceName, email: "a@b.com" };
      },
      updateContact: async (resourceName, email) => {
        updated = true;
        expect(email).toBe("new@b.com");
        return { resourceName, updated: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "contacts", "get", "--resource", "people/1"]);
      await root.parseAsync(["node", "typee", "contacts", "update", "--resource", "people/1", "--email", "new@b.com"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(got).toBe(true);
    expect(updated).toBe(true);
  });
});

describe("contacts list with pagination", () => {
  function runCommand(program: Command, args: string[]): Promise<string> {
    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    return program.parseAsync(args)
      .then(() => stdout)
      .finally(() => {
        process.stdout.write = originalWrite;
      });
  }

  it("should pass pageSize option to listContacts", async () => {
    const program = new Command();
    program.option("--json", "Output as JSON");
    const contacts = program.command("contacts");
    const listContacts = { fn: vi.fn().mockResolvedValue({
      items: [
        { resourceName: "people/1", email: "a@b.com" },
      ],
    }) };
    registerContactsCommands(contacts, { listContacts: listContacts.fn } as any);

    await runCommand(program, ["node", "test", "contacts", "list", "--page-size", "25"]);

    expect(listContacts.fn).toHaveBeenCalledWith({ pageSize: 25, pageToken: undefined });
  });

  it("should pass pageToken option to listContacts", async () => {
    const program = new Command();
    program.option("--json", "Output as JSON");
    const contacts = program.command("contacts");
    const listContacts = { fn: vi.fn().mockResolvedValue({
      items: [],
      nextPageToken: "next-token-xyz",
    }) };
    registerContactsCommands(contacts, { listContacts: listContacts.fn } as any);

    await runCommand(program, ["node", "test", "contacts", "list", "--page-token", "abc123"]);

    expect(listContacts.fn).toHaveBeenCalledWith({ pageSize: undefined, pageToken: "abc123" });
  });

  it("should output nextPageToken in JSON mode", async () => {
    const program = new Command();
    program.option("--json", "Output as JSON");
    const contacts = program.command("contacts");
    const listContacts = { fn: vi.fn().mockResolvedValue({
      items: [{ resourceName: "people/1", email: "a@b.com" }],
      nextPageToken: "next-page-token",
    }) };
    registerContactsCommands(contacts, { listContacts: listContacts.fn } as any);

    const output = await runCommand(program, ["node", "test", "contacts", "list", "--json"]);

    const parsed = JSON.parse(output);
    expect(parsed.nextPageToken).toBe("next-page-token");
  });

  it("should use default pageSize when not specified", async () => {
    const program = new Command();
    program.option("--json", "Output as JSON");
    const contacts = program.command("contacts");
    const listContacts = { fn: vi.fn().mockResolvedValue({
      items: [],
    }) };
    registerContactsCommands(contacts, { listContacts: listContacts.fn } as any);

    await runCommand(program, ["node", "test", "contacts", "list"]);

    expect(listContacts.fn).toHaveBeenCalledWith({ pageSize: undefined, pageToken: undefined });
  });
});
