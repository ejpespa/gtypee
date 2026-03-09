import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { userConfigDir } from "./paths.js";

type MigrationFailure = {
  file: string;
  error: string;
};

export type TypeeConfigMigrationResult = {
  attempted: string[];
  copied: string[];
  skipped: string[];
  failed: MigrationFailure[];
};

const LEGACY_APP_DIR = "gogcli";
const TYPEE_APP_DIR = "typee";

function isKnownLegacyConfigFile(name: string): boolean {
  return (
    name === "config.json" ||
    name === "credentials.json" ||
    (/^credentials-.+\.json$/).test(name) ||
    (/^sa-.+\.json$/).test(name) ||
    (/^keep-sa-.+\.json$/).test(name)
  );
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function ensureTypeeConfigMigrated(baseConfigDir?: string): Promise<TypeeConfigMigrationResult> {
  const result: TypeeConfigMigrationResult = {
    attempted: [],
    copied: [],
    skipped: [],
    failed: [],
  };

  const baseDir = baseConfigDir ?? userConfigDir();
  const sourceDir = path.join(baseDir, LEGACY_APP_DIR);
  const destinationDir = path.join(baseDir, TYPEE_APP_DIR);

  if (await directoryExists(destinationDir)) {
    return result;
  }

  if (!(await directoryExists(sourceDir))) {
    return result;
  }

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && isKnownLegacyConfigFile(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    return result;
  }

  await fs.mkdir(destinationDir, { recursive: true, mode: 0o700 });

  for (const file of files) {
    result.attempted.push(file);

    try {
      await fs.copyFile(path.join(sourceDir, file), path.join(destinationDir, file), constants.COPYFILE_EXCL);
      result.copied.push(file);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "EEXIST") {
        result.skipped.push(file);
        continue;
      }

      result.failed.push({
        file,
        error: String(error),
      });
    }
  }

  return result;
}
