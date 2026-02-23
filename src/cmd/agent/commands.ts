import type { Command } from "commander";

import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export function registerAgentCommands(agentCommand: Command): void {
  agentCommand
    .command("ping")
    .description("Health check for automation")
    .action(function actionPing(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ ok: true, message: "pong" }, null, 2)}\n`);
        return;
      }
      process.stdout.write("pong\n");
    });
}
