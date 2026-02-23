import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { configExists, readConfig, writeConfig } from "../../src/config/config.js";
import { appDir, configPath } from "../../src/config/paths.js";

const cleanupDirs: string[] = [];
const legacyAppDir = "gogcli";

afterEach(async () => {
  await Promise.all(
    cleanupDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("config I/O", () => {
  it("returns empty config when file does not exist", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-config-test-"));
    cleanupDirs.push(base);

    await expect(readConfig(base)).resolves.toEqual({});
    await expect(configExists(base)).resolves.toBe(false);
  });

  it("writes and reads config", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-config-test-"));
    cleanupDirs.push(base);

    const expected = {
      keyringBackend: "file",
      defaultTimezone: "UTC",
      accountAliases: { work: "a@b.com" },
    };

    await writeConfig(expected, base);

    await expect(configExists(base)).resolves.toBe(true);
    await expect(readConfig(base)).resolves.toEqual(expected);

    const raw = await fs.readFile(configPath(base), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).not.toContain(".tmp");
  });

  it("parses json5 config files", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-config-test-"));
    cleanupDirs.push(base);

    const dir = appDir(base);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      configPath(base),
      `{
      // comment
      keyringBackend: "file",
      accountAliases: {
        work: "x@y.com",
      },
    }\n`,
      "utf8",
    );

    await expect(readConfig(base)).resolves.toEqual({
      keyringBackend: "file",
      accountAliases: { work: "x@y.com" },
    });
  });

  it("rejects non-object config content", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-config-test-"));
    cleanupDirs.push(base);

    const dir = appDir(base);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(configPath(base), "[]\n", "utf8");

    await expect(readConfig(base)).rejects.toThrow("config must be a JSON object");
  });

  it("reads legacy gogcli config after migration", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-config-test-"));
    cleanupDirs.push(base);

    const legacyDir = path.join(base, legacyAppDir);
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(path.join(legacyDir, "config.json"), '{"defaultTimezone":"UTC"}\n', "utf8");

    await expect(configExists(base)).resolves.toBe(true);
    await expect(readConfig(base)).resolves.toEqual({ defaultTimezone: "UTC" });
  });

  it("migrates other legacy files before writing config", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-config-test-"));
    cleanupDirs.push(base);

    const legacyDir = path.join(base, legacyAppDir);
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(path.join(legacyDir, "credentials-team.json"), '{"clientId":"a","clientSecret":"b"}\n', "utf8");

    await writeConfig({ keyringBackend: "file" }, base);

    await expect(fs.readFile(path.join(appDir(base), "credentials-team.json"), "utf8")).resolves.toContain("clientId");
  });
});
