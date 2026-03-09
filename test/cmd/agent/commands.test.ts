import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { registerAgentCommands } from "../../../src/cmd/agent/commands.js";

describe("agent command", () => {
  it("registers ping subcommand", () => {
    const agent = new Command("agent");
    registerAgentCommands(agent);
    const names = agent.commands.map((cmd) => cmd.name());
    expect(names).toContain("ping");
  });
});
