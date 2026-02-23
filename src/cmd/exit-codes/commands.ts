import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export function formatExitCodes(mode: OutputMode): string {
  const payload = {
    ok: 0,
    error: 1,
    usage: 2,
  };

  if (mode === "json") {
    return JSON.stringify(payload, null, 2);
  }

  return Object.entries(payload)
    .map(([name, code]) => `${name}\t${code}`)
    .join("\n");
}

export function registerExitCodesCommands(exitCodesCommand: Command): void {
  exitCodesCommand
    .command("print")
    .description("Print stable exit codes")
    .action(function actionPrint(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      process.stdout.write(`${formatExitCodes(ctx.output.mode)}\n`);
    });
}
