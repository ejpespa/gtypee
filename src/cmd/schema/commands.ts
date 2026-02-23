import type { Command } from "commander";

import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export function registerSchemaCommands(schemaCommand: Command): void {
  schemaCommand
    .command("print")
    .description("Print machine-readable command schema")
    .action(function actionPrint(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const payload = {
        name: "typee",
        generatedAt: new Date().toISOString(),
        note: "schema command is currently a scaffold in TypeScript conversion",
      };

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${JSON.stringify(payload)}\n`);
    });
}
