import type { Command } from "commander";

import { buildExecutionContext, type RootOptions } from "../execution-context.js";

const scripts: Record<string, string> = {
  bash: "# bash completion stub for typee",
  zsh: "# zsh completion stub for typee",
  fish: "# fish completion stub for typee",
  powershell: "# powershell completion stub for typee",
};

export function registerCompletionCommands(completionCommand: Command): void {
  completionCommand
    .command("script")
    .description("Print shell completion script")
    .requiredOption("--shell <shell>", "bash|zsh|fish|powershell")
    .action(function actionScript(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ shell: string }>();
      const key = opts.shell.trim().toLowerCase();
      const script = scripts[key];
      if (!script) {
        throw new Error(`unsupported shell: ${opts.shell}`);
      }

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ shell: key, script }, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${script}\n`);
    });
}
