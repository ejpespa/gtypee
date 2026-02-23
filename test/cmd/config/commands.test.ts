import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatConfigList, registerConfigCommands } from "../../../src/cmd/config/commands.js";

describe("config command formatters", () => {
  it("formats config list as json", () => {
    const out = formatConfigList({ timezone: "UTC", keyring_backend: "auto" }, "json");
    const parsed = JSON.parse(out) as { timezone: string };
    expect(parsed.timezone).toBe("UTC");
  });

  it("registers path/list/get/set/unset subcommands", () => {
    const config = new Command("config");
    registerConfigCommands(config);
    const names = config.commands.map((cmd) => cmd.name());
    expect(names).toContain("path");
    expect(names).toContain("list");
    expect(names).toContain("get");
    expect(names).toContain("set");
    expect(names).toContain("unset");
  });
});
