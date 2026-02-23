import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatAuthList, formatAuthStatus, registerAuthCommands } from "../../../src/cmd/auth/commands.js";

describe("auth command formatters", () => {
  it("formats auth list as json", () => {
    const out = formatAuthList(
      [
        { client: "default", email: "a@b.com" },
        { client: "team", email: "c@d.com" },
      ],
      "json",
    );
    const parsed = JSON.parse(out) as { tokens: Array<{ client: string; email: string }> };
    expect(parsed.tokens).toHaveLength(2);
  });

  it("formats auth list as plain text", () => {
    const out = formatAuthList([{ client: "default", email: "a@b.com" }], "human");
    expect(out).toContain("default");
    expect(out).toContain("a@b.com");
  });

  it("formats auth status", () => {
    const out = formatAuthStatus(
      {
        tokenCount: 2,
        configPath: "/tmp/typee/config.json",
        keyringBackend: "auto",
      },
      "json",
    );
    const parsed = JSON.parse(out) as { tokenCount: number; keyringBackend: string };
    expect(parsed.tokenCount).toBe(2);
    expect(parsed.keyringBackend).toBe("auto");
  });

  it("registers add/remove/list/status subcommands", () => {
    const auth = new Command("auth");
    registerAuthCommands(auth);

    const names = auth.commands.map((cmd) => cmd.name());
    expect(names).toContain("add");
    expect(names).toContain("remove");
    expect(names).toContain("list");
    expect(names).toContain("status");
  });

  it("registers logout as an alias for remove", () => {
    const auth = new Command("auth");
    registerAuthCommands(auth);

    const remove = auth.commands.find((cmd) => cmd.name() === "remove");
    expect(remove).toBeDefined();
    expect(remove?.aliases()).toContain("logout");
  });

  it("registers add-sa subcommand", () => {
    const auth = new Command("auth");
    registerAuthCommands(auth);
    const names = auth.commands.map((cmd) => cmd.name());
    expect(names).toContain("add-sa");
  });

  it("registers set-default-sa subcommand", () => {
    const auth = new Command("auth");
    registerAuthCommands(auth);
    const names = auth.commands.map((cmd) => cmd.name());
    expect(names).toContain("set-default-sa");
  });

  it("forwards add options to addToken deps", async () => {
    let seenEmail = "";
    let seenClient = "";
    let seenAuthUrl = "";
    let seenForceConsent = false;
    let seenManual = false;
    let seenRemote = false;
    let seenStep = 0;

    const root = new Command();
    root.option("--client <name>");
    const auth = root.command("auth");
    registerAuthCommands(auth, {
      addToken: async (email, input) => {
        seenEmail = email;
        seenClient = input?.client ?? "";
        seenAuthUrl = input?.authUrl ?? "";
        seenForceConsent = input?.forceConsent ?? false;
        seenManual = input?.manual ?? false;
        seenRemote = input?.remote ?? false;
        seenStep = input?.step ?? 0;
        return { email, message: "ok" };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node",
        "typee",
        "--client",
        "team",
        "auth",
        "add",
        "--email",
        "a@b.com",
        "--auth-url",
        "http://127.0.0.1:3412/oauth2/callback?code=abc",
        "--force-consent",
        "--manual",
        "--remote",
        "--step",
        "2",
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(seenEmail).toBe("a@b.com");
    expect(seenClient).toBe("team");
    expect(seenAuthUrl).toContain("code=abc");
    expect(seenForceConsent).toBe(true);
    expect(seenManual).toBe(true);
    expect(seenRemote).toBe(true);
    expect(seenStep).toBe(2);
  });

  it("prints auth URL lines for remote step 1 response", async () => {
    const root = new Command();
    const auth = root.command("auth");
    registerAuthCommands(auth, {
      addToken: async (email) => ({
        email,
        message: "Run again with --remote --step 2 --auth-url <redirect-url>",
        authUrl: "https://example.test/auth?state=s1",
        stateReused: true,
      }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "auth", "add", "--email", "a@b.com", "--remote", "--step", "1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("auth_url\thttps://example.test/auth?state=s1");
    expect(stdout).toContain("state_reused\ttrue");
    expect(stdout).toContain("Run again with --remote --step 2 --auth-url <redirect-url>");
  });
});
