#!/usr/bin/env node

import { buildProgram } from "../src/cmd/root.js";
import { exitCode } from "../src/cmd/exit.js";
import { rewriteDesirePathArgs } from "../src/cmd/rewrite-desire-path-args.js";
import { resolveScriptPath } from "../src/cmd/script-path.js";

function parseTimeout(argv: string[]): number | undefined {
  const idx = argv.indexOf("--timeout");
  if (idx === -1 || idx + 1 >= argv.length) return undefined;
  const val = Number(argv[idx + 1]);
  return Number.isFinite(val) && val > 0 ? val : undefined;
}

async function main(): Promise<void> {
  const program = buildProgram();
  const argv = rewriteDesirePathArgs(process.argv.slice(2));
  const nodePath = process.argv[0] ?? "node";
  const scriptPath = resolveScriptPath(process.argv);

  const timeoutSec = parseTimeout(argv);
  const runPromise = program.parseAsync([nodePath, scriptPath, ...argv]);

  if (timeoutSec !== undefined) {
    const timeoutMs = timeoutSec * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await Promise.race([
        runPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new DOMException("command timed out", "TimeoutError"));
          });
        }),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    await runPromise;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const isQuiet = process.argv.includes("--quiet") || process.argv.includes("-q");
  if (!isQuiet) {
    process.stderr.write(`${message}\n`);
  }
  process.exit(exitCode(error));
});
