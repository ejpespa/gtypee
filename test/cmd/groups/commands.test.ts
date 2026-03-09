import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatGroupsList, registerGroupsCommands } from "../../../src/cmd/groups/commands.js";

describe("groups command formatters", () => {
  it("formats groups as json", () => {
    const out = formatGroupsList([{ name: "groups/1", groupKey: "eng@example.com" }], "json");
    const parsed = JSON.parse(out) as { groups: Array<{ name: string }> };
    expect(parsed.groups[0]?.name).toBe("groups/1");
  });

  it("registers list and members subcommands", () => {
    const groups = new Command("groups");
    registerGroupsCommands(groups);
    const names = groups.commands.map((cmd) => cmd.name());
    expect(names).toContain("list");
    expect(names).toContain("members");
    expect(names).toContain("get");
    expect(names).toContain("add-member");
    expect(names).toContain("remove-member");
  });

  it("executes directory member mutation flows", async () => {
    let got = false;
    let added = false;
    let removed = false;
    const root = new Command();
    const groups = root.command("groups");
    registerGroupsCommands(groups, {
      getGroup: async (groupKey) => {
        got = true;
        return { name: "groups/1", groupKey };
      },
      addMember: async (groupKey, email, role) => {
        added = true;
        expect(role).toBe("MEMBER");
        return { groupKey, email, role, applied: true };
      },
      removeMember: async () => {
        removed = true;
        return { applied: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "groups", "get", "--group", "eng@example.com"]);
      await root.parseAsync([
        "node",
        "typee",
        "groups",
        "add-member",
        "--group",
        "eng@example.com",
        "--email",
        "new@example.com",
        "--role",
        "MEMBER",
      ]);
      await root.parseAsync([
        "node",
        "typee",
        "groups",
        "remove-member",
        "--group",
        "eng@example.com",
        "--email",
        "new@example.com",
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(got).toBe(true);
    expect(added).toBe(true);
    expect(removed).toBe(true);
  });
});
