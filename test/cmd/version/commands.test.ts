import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { registerVersionCommands } from "../../../src/cmd/version/commands.js";

describe("version command", () => {
  it("registers print subcommand", () => {
    const version = new Command("version");
    registerVersionCommands(version);
    const names = version.commands.map((cmd) => cmd.name());
    expect(names).toContain("print");
  });
});
