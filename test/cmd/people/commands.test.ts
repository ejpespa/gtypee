import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatPeopleMe, registerPeopleCommands } from "../../../src/cmd/people/commands.js";

describe("people command formatters", () => {
  it("formats people me as json", () => {
    const out = formatPeopleMe({ email: "a@b.com", displayName: "A B" }, "json");
    const parsed = JSON.parse(out) as { email: string };
    expect(parsed.email).toBe("a@b.com");
  });

  it("registers me and search subcommands", () => {
    const people = new Command("people");
    registerPeopleCommands(people);
    const names = people.commands.map((cmd) => cmd.name());
    expect(names).toContain("me");
    expect(names).toContain("search");
    expect(names).toContain("get");
    expect(names).toContain("update");
  });

  it("executes get and update person flows", async () => {
    let got = false;
    let updated = false;
    const root = new Command();
    const people = root.command("people");
    registerPeopleCommands(people, {
      getPerson: async (resourceName) => {
        got = true;
        return { resourceName, email: "a@b.com", displayName: "A B" };
      },
      updatePerson: async (resourceName, input) => {
        updated = true;
        expect(resourceName).toBe("people/1");
        expect(input.displayName).toBe("A Bee");
        return { resourceName, updated: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "people", "get", "--resource", "people/1"]);
      await root.parseAsync(["node", "typee", "people", "update", "--resource", "people/1", "--name", "A Bee"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(got).toBe(true);
    expect(updated).toBe(true);
  });
});
