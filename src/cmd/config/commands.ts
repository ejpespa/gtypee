import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { configPath } from "../../config/paths.js";
import { readConfig, writeConfig, type ConfigFile } from "../../config/config.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

type ConfigPublic = {
  timezone?: string;
  keyring_backend?: string;
};

function toPublicConfig(cfg: ConfigFile): ConfigPublic {
  const out: ConfigPublic = {};
  if (cfg.defaultTimezone !== undefined && cfg.defaultTimezone.trim() !== "") {
    out.timezone = cfg.defaultTimezone;
  }
  if (cfg.keyringBackend !== undefined && cfg.keyringBackend.trim() !== "") {
    out.keyring_backend = cfg.keyringBackend;
  }
  return out;
}

function applyKey(cfg: ConfigFile, key: string, value: string): ConfigFile {
  const next: ConfigFile = { ...cfg };
  if (key === "timezone") {
    next.defaultTimezone = value;
    return next;
  }
  if (key === "keyring_backend") {
    next.keyringBackend = value;
    return next;
  }
  throw new Error(`unknown config key: ${key}`);
}

function unsetKey(cfg: ConfigFile, key: string): ConfigFile {
  const next: ConfigFile = { ...cfg };
  if (key === "timezone") {
    delete next.defaultTimezone;
    return next;
  }
  if (key === "keyring_backend") {
    delete next.keyringBackend;
    return next;
  }
  throw new Error(`unknown config key: ${key}`);
}

export function formatConfigList(cfg: ConfigPublic, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(cfg, null, 2);
  }
  const lines: string[] = [];
  for (const [key, value] of Object.entries(cfg)) {
    lines.push(`${key}\t${value}`);
  }
  if (lines.length === 0) {
    return "No config values set";
  }
  return lines.join("\n");
}

export function registerConfigCommands(configCommand: Command): void {
  configCommand
    .command("path")
    .description("Print config file path")
    .action(function actionPath(this: Command) {
      this.optsWithGlobals();
      process.stdout.write(`${configPath()}\n`);
    });

  configCommand
    .command("list")
    .description("List config values")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const cfg = await readConfig();
      process.stdout.write(`${formatConfigList(toPublicConfig(cfg), ctx.output.mode)}\n`);
    });

  configCommand
    .command("get")
    .description("Get config key")
    .requiredOption("--key <key>", "Config key")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ key: string }>();
      const cfg = toPublicConfig(await readConfig());
      const value = cfg[opts.key as keyof ConfigPublic] ?? "";
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ key: opts.key, value }, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${value}\n`);
    });

  configCommand
    .command("set")
    .description("Set config key")
    .requiredOption("--key <key>", "Config key")
    .requiredOption("--value <value>", "Config value")
    .action(async function actionSet(this: Command) {
      const opts = this.opts<{ key: string; value: string }>();
      const cfg = await readConfig();
      await writeConfig(applyKey(cfg, opts.key, opts.value));
      process.stdout.write("OK\n");
    });

  configCommand
    .command("unset")
    .description("Unset config key")
    .requiredOption("--key <key>", "Config key")
    .action(async function actionUnset(this: Command) {
      const opts = this.opts<{ key: string }>();
      const cfg = await readConfig();
      await writeConfig(unsetKey(cfg, opts.key));
      process.stdout.write("OK\n");
    });
}
