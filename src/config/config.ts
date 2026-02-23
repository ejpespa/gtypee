import fs from "node:fs/promises";

import JSON5 from "json5";

import { ensureTypeeConfigMigrated } from "./migration.js";
import { appDir, configPath } from "./paths.js";

export type ConfigFile = {
  keyringBackend?: string;
  defaultTimezone?: string;
  accountAliases?: Record<string, string>;
  accountClients?: Record<string, string>;
  clientDomains?: Record<string, string>;
};

async function ensureConfigDir(baseConfigDir?: string): Promise<void> {
  await fs.mkdir(appDir(baseConfigDir), { recursive: true, mode: 0o700 });
}

export async function configExists(baseConfigDir?: string): Promise<boolean> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  try {
    await fs.stat(configPath(baseConfigDir));
    return true;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function readConfig(baseConfigDir?: string): Promise<ConfigFile> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  const file = configPath(baseConfigDir);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      return {};
    }
    throw new Error(`read config: ${String(error)}`);
  }

  try {
    const parsed = JSON5.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("config must be a JSON object");
    }
    return parsed as ConfigFile;
  } catch (error: unknown) {
    throw new Error(`parse config ${file}: ${String(error)}`);
  }
}

export async function writeConfig(cfg: ConfigFile, baseConfigDir?: string): Promise<void> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  await ensureConfigDir(baseConfigDir);
  const file = configPath(baseConfigDir);
  const tmp = `${file}.tmp`;
  const data = `${JSON.stringify(cfg, null, 2)}\n`;

  await fs.writeFile(tmp, data, { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, file);
}
