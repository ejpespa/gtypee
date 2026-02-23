import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatContactsList, registerContactsCommands } from "../../../src/cmd/contacts/commands.js";

describe("contacts command formatters", () => {
  it("formats contacts as json", () => {
    const out = formatContactsList([{ resourceName: "people/1", email: "a@b.com" }], "json");
    const parsed = JSON.parse(out) as { contacts: Array<{ resourceName: string }> };
    expect(parsed.contacts[0]?.resourceName).toBe("people/1");
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
