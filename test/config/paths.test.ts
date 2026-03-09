import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  appDir,
  clientCredentialsPathFor,
  configPath,
  expandPath,
  keepServiceAccountPath,
  serviceAccountPath,
} from "../../src/config/paths.js";

describe("config paths", () => {
  it("builds appDir under user config directory", () => {
    expect(appDir("/tmp/config")).toBe(path.join("/tmp/config", "typee"));
  });

  it("builds configPath under appDir", () => {
    expect(configPath("/tmp/config")).toBe(path.join("/tmp/config", "typee", "config.json"));
  });

  it("rejects invalid client credential path names", () => {
    expect(() => clientCredentialsPathFor("../evil", "/tmp/config")).toThrow("invalid client name");
  });

  it("encodes service account filenames", () => {
    const p = serviceAccountPath("a@b.com", "/tmp/config");
    expect(p).toMatch(/sa-/);
    expect(p.endsWith(".json")).toBe(true);
  });

  it("encodes keep service account filenames", () => {
    const p = keepServiceAccountPath("a@b.com", "/tmp/config");
    expect(p).toMatch(/keep-sa-/);
    expect(p.endsWith(".json")).toBe(true);
  });

  it("expands ~ to home directory", () => {
    const home = os.homedir();
    expect(expandPath("~")).toBe(home);
    expect(expandPath("~/Downloads/file.txt")).toBe(path.join(home, "Downloads", "file.txt"));
  });
});
