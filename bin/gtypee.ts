#!/usr/bin/env node

import { buildProgram } from "../src/cmd/root.js";
import { exitCode } from "../src/cmd/exit.js";
import { rewriteDesirePathArgs } from "../src/cmd/rewrite-desire-path-args.js";
import { resolveScriptPath } from "../src/cmd/script-path.js";

async function main(): Promise<void> {
  const program = buildProgram();
  const argv = rewriteDesirePathArgs(process.argv.slice(2));
  const nodePath = process.argv[0] ?? "node";
  const scriptPath = resolveScriptPath(process.argv);
  await program.parseAsync([nodePath, scriptPath, ...argv]);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(exitCode(error));
});
