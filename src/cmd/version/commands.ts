import type { Command } from "commander";

import { VERSION } from "../../index.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export function registerVersionCommands(versionCommand: Command): void {
  versionCommand
    .command("print")
    .description("Print CLI version")
    .action(function actionPrint(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ version: VERSION }, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${VERSION}\n`);
    });
}
