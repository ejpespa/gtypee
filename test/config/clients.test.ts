import fs from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CLIENT_NAME,
  domainFromEmail,
  normalizeClientName,
  normalizeClientNameOrDefault,
  normalizeDomain,
  resolveClientForAccount,
} from "../../src/config/clients.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("config clients", () => {
  it("normalizes valid client names", () => {
    expect(normalizeClientName(" Work.Client_1 ")).toBe("work.client_1");
  });

  it("rejects invalid client names", () => {
    expect(() => normalizeClientName("bad name!")).toThrow("invalid client name");
  });

  it("returns default client for empty input", () => {
    expect(normalizeClientNameOrDefault("   ")).toBe(DEFAULT_CLIENT_NAME);
  });

  it("normalizes domains", () => {
    expect(normalizeDomain("@Example.COM")).toBe("example.com");
  });

  it("extracts domain from email", () => {
    expect(domainFromEmail("a@b.com")).toBe("b.com");
  });

  it("resolves override first", async () => {
    const client = await resolveClientForAccount(
      { accountClients: {}, clientDomains: {} },
      "a@b.com",
      "prod",
      async () => false,
    );
    expect(client).toBe("prod");
  });

  it("resolves account mapping", async () => {
    const client = await resolveClientForAccount(
      { accountClients: { "a@b.com": "team" }, clientDomains: {} },
      "a@b.com",
      "",
      async () => false,
    );
    expect(client).toBe("team");
  });

  it("resolves domain mapping", async () => {
    const client = await resolveClientForAccount(
      { accountClients: {}, clientDomains: { "b.com": "workspace" } },
      "a@b.com",
      "",
      async () => false,
    );
    expect(client).toBe("workspace");
  });

  it("rethrows non-ENOENT stat errors from default credential lookup", async () => {
    vi.spyOn(fs, "stat").mockRejectedValueOnce(Object.assign(new Error("denied"), { code: "EACCES" }));

    await expect(resolveClientForAccount({ accountClients: {}, clientDomains: {} }, "a@b.com", "")).rejects.toMatchObject({
      code: "EACCES",
    });
  });
});
