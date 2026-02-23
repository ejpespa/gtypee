import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureTypeeConfigMigrated } from "../../src/config/migration.js";

const cleanupDirs: string[] = [];
const legacyAppDir = "gogcli";

afterEach(async () => {
  await Promise.all(cleanupDirs.splice(0).map(async (dir) => fs.rm(dir, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

async function mkBaseDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "typee-migration-test-"));
  cleanupDirs.push(dir);
  return dir;
}

describe("config migration", () => {
  it("copies legacy files into new dir when destination absent", async () => {
    const base = await mkBaseDir();
    const legacy = path.join(base, legacyAppDir);
    await fs.mkdir(legacy, { recursive: true });
    await fs.writeFile(path.join(legacy, "config.json"), "{\"a\":1}\n", "utf8");
    await fs.writeFile(path.join(legacy, "credentials.json"), "{\"b\":2}\n", "utf8");
    await fs.writeFile(path.join(legacy, "credentials-team.json"), "{\"c\":3}\n", "utf8");
    await fs.writeFile(path.join(legacy, "sa-one.json"), "{\"d\":4}\n", "utf8");
    await fs.writeFile(path.join(legacy, "keep-sa-two.json"), "{\"e\":5}\n", "utf8");
    await fs.writeFile(path.join(legacy, "ignore.txt"), "skip\n", "utf8");

    const result = await ensureTypeeConfigMigrated(base);
    const nextDir = path.join(base, "typee");

    await expect(fs.readFile(path.join(nextDir, "config.json"), "utf8")).resolves.toContain("\"a\":1");
    await expect(fs.readFile(path.join(nextDir, "credentials.json"), "utf8")).resolves.toContain("\"b\":2");
    await expect(fs.readFile(path.join(nextDir, "credentials-team.json"), "utf8")).resolves.toContain("\"c\":3");
    await expect(fs.readFile(path.join(nextDir, "sa-one.json"), "utf8")).resolves.toContain("\"d\":4");
    await expect(fs.readFile(path.join(nextDir, "keep-sa-two.json"), "utf8")).resolves.toContain("\"e\":5");
    await expect(fs.stat(path.join(nextDir, "ignore.txt"))).rejects.toMatchObject({ code: "ENOENT" });

    expect(result.copied).toEqual([
      "config.json",
      "credentials-team.json",
      "credentials.json",
      "keep-sa-two.json",
      "sa-one.json",
    ]);
    expect(result.attempted).toEqual([
      "config.json",
      "credentials-team.json",
      "credentials.json",
      "keep-sa-two.json",
      "sa-one.json",
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it("legacy exists but no known files does not create destination", async () => {
    const base = await mkBaseDir();
    const legacy = path.join(base, legacyAppDir);
    const nextDir = path.join(base, "typee");

    await fs.mkdir(legacy, { recursive: true });
    await fs.writeFile(path.join(legacy, "notes.txt"), "skip\n", "utf8");

    const result = await ensureTypeeConfigMigrated(base);

    await expect(fs.stat(nextDir)).rejects.toMatchObject({ code: "ENOENT" });
    expect(result.attempted).toEqual([]);
    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it("no-op when destination exists", async () => {
    const base = await mkBaseDir();
    await fs.mkdir(path.join(base, legacyAppDir), { recursive: true });
    await fs.mkdir(path.join(base, "typee"), { recursive: true });

    const result = await ensureTypeeConfigMigrated(base);

    expect(result.attempted).toEqual([]);
    expect(result.copied).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it("does not overwrite existing destination file", async () => {
    const base = await mkBaseDir();
    const legacy = path.join(base, legacyAppDir);
    const nextDir = path.join(base, "typee");
    await fs.mkdir(legacy, { recursive: true });
    await fs.writeFile(path.join(legacy, "config.json"), "legacy\n", "utf8");

    const originalMkdir = fs.mkdir;
    vi.spyOn(fs, "mkdir").mockImplementation(async (target, options) => {
      const result = await originalMkdir(target, options);
      if (String(target) === nextDir) {
        await fs.writeFile(path.join(nextDir, "config.json"), "current\n", "utf8");
      }
      return result;
    });

    const result = await ensureTypeeConfigMigrated(base);

    await expect(fs.readFile(path.join(nextDir, "config.json"), "utf8")).resolves.toBe("current\n");
    expect(result.attempted).toEqual(["config.json"]);
    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual(["config.json"]);
    expect(result.failed).toEqual([]);
  });

  it("continues when one file copy fails", async () => {
    const base = await mkBaseDir();
    const legacy = path.join(base, legacyAppDir);
    const nextDir = path.join(base, "typee");
    await fs.mkdir(legacy, { recursive: true });
    await fs.writeFile(path.join(legacy, "config.json"), "one\n", "utf8");
    await fs.writeFile(path.join(legacy, "credentials.json"), "two\n", "utf8");

    const originalCopyFile = fs.copyFile;
    vi.spyOn(fs, "copyFile").mockImplementation(async (src, dest, mode) => {
      if (String(dest).endsWith(`${path.sep}config.json`)) {
        throw new Error("boom");
      }
      return originalCopyFile(src, dest, mode);
    });

    const result = await ensureTypeeConfigMigrated(base);

    await expect(fs.readFile(path.join(nextDir, "credentials.json"), "utf8")).resolves.toBe("two\n");
    await expect(fs.stat(path.join(nextDir, "config.json"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toMatchObject({ file: "config.json" });
    expect(result.copied).toEqual(["credentials.json"]);
    expect(result.attempted).toEqual(["config.json", "credentials.json"]);
    expect(result.skipped).toEqual([]);
  });

  it("propagates non-ENOENT stat failure", async () => {
    const base = await mkBaseDir();
    const statSpy = vi.spyOn(fs, "stat");
    statSpy.mockRejectedValueOnce(Object.assign(new Error("denied"), { code: "EACCES" }));

    await expect(ensureTypeeConfigMigrated(base)).rejects.toMatchObject({ code: "EACCES" });

    expect(statSpy).toHaveBeenNthCalledWith(1, path.join(base, "typee"));
    expect(statSpy).not.toHaveBeenCalledWith(path.join(base, legacyAppDir));
  });

  it("treats ENOENT from stat as missing directory", async () => {
    const base = await mkBaseDir();
    const statSpy = vi.spyOn(fs, "stat").mockRejectedValueOnce(Object.assign(new Error("missing"), { code: "ENOENT" }));

    const result = await ensureTypeeConfigMigrated(base);

    expect(statSpy).toHaveBeenNthCalledWith(1, path.join(base, "typee"));
    expect(result).toEqual({ attempted: [], copied: [], skipped: [], failed: [] });
  });
});
