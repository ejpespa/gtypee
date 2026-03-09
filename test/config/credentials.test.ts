import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CredentialsMissingError,
  clientCredentialsExists,
  parseGoogleOAuthClientJson,
  readClientCredentialsFor,
  writeClientCredentialsFor,
} from "../../src/config/credentials.js";

const cleanupDirs: string[] = [];
const legacyAppDir = "gogcli";

afterEach(async () => {
  await Promise.all(cleanupDirs.splice(0).map(async (dir) => fs.rm(dir, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe("config credentials", () => {
  it("parses installed credentials format", () => {
    const parsed = parseGoogleOAuthClientJson(`{
      "installed": {"client_id": "id1", "client_secret": "sec1"}
    }`);
    expect(parsed).toEqual({ clientId: "id1", clientSecret: "sec1" });
  });

  it("parses web credentials format", () => {
    const parsed = parseGoogleOAuthClientJson(`{
      "web": {"client_id": "id2", "client_secret": "sec2"}
    }`);
    expect(parsed).toEqual({ clientId: "id2", clientSecret: "sec2" });
  });

  it("rejects non-object oauth credential payloads", () => {
    expect(() => parseGoogleOAuthClientJson("null")).toThrow("invalid credentials.json");
    expect(() => parseGoogleOAuthClientJson("[]")).toThrow("invalid credentials.json");
    expect(() => parseGoogleOAuthClientJson('"x"')).toThrow("invalid credentials.json");
  });

  it("writes and reads client credentials", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-creds-test-"));
    cleanupDirs.push(base);

    await writeClientCredentialsFor("team", { clientId: "abc", clientSecret: "xyz" }, base);
    await expect(clientCredentialsExists("team", base)).resolves.toBe(true);
    await expect(readClientCredentialsFor("team", base)).resolves.toEqual({ clientId: "abc", clientSecret: "xyz" });
  });

  it("throws CredentialsMissingError when missing", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-creds-test-"));
    cleanupDirs.push(base);

    await expect(readClientCredentialsFor("missing", base)).rejects.toBeInstanceOf(CredentialsMissingError);
  });

  it("rejects non-object stored credentials payloads", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-creds-test-"));
    cleanupDirs.push(base);

    const dir = path.join(base, "typee");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "credentials-team.json"), "null\n", "utf8");

    await expect(readClientCredentialsFor("team", base)).rejects.toThrow(
      "stored credentials.json is missing clientId/clientSecret",
    );
  });

  it("reads legacy gogcli credentials after migration", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-creds-test-"));
    cleanupDirs.push(base);

    const legacyDir = path.join(base, legacyAppDir);
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(
      path.join(legacyDir, "credentials-team.json"),
      '{"clientId":"legacy-id","clientSecret":"legacy-secret"}\n',
      "utf8",
    );

    await expect(clientCredentialsExists("team", base)).resolves.toBe(true);
    await expect(readClientCredentialsFor("team", base)).resolves.toEqual({
      clientId: "legacy-id",
      clientSecret: "legacy-secret",
    });
  });

  it("migrates other legacy files before writing credentials", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-creds-test-"));
    cleanupDirs.push(base);

    const legacyDir = path.join(base, legacyAppDir);
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(path.join(legacyDir, "config.json"), '{"defaultTimezone":"UTC"}\n', "utf8");

    await writeClientCredentialsFor("team", { clientId: "id", clientSecret: "secret" }, base);

    await expect(fs.readFile(path.join(base, "typee", "config.json"), "utf8")).resolves.toContain("defaultTimezone");
  });

  it("rethrows non-ENOENT stat errors from exists checks", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "typee-creds-test-"));
    cleanupDirs.push(base);

    vi.spyOn(fs, "stat").mockRejectedValueOnce(Object.assign(new Error("denied"), { code: "EACCES" }));

    await expect(clientCredentialsExists("team", base)).rejects.toMatchObject({ code: "EACCES" });
  });
});
