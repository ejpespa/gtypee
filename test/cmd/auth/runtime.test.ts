import { describe, expect, it } from "vitest";

import { MemorySecretBackend, KeyringStore } from "../../../src/secrets/store.js";
import { buildAuthCommandDeps } from "../../../src/cmd/auth/runtime.js";

describe("auth runtime deps", () => {
  it("lists token summaries from store", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setToken("default", "a@b.com", {
      email: "a@b.com",
      refreshToken: "t1",
      createdAt: new Date("2026-02-20T00:00:00Z"),
    });

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
    });

    await expect(deps.listTokens()).resolves.toEqual([
      {
        client: "default",
        email: "a@b.com",
        createdAt: "2026-02-20T00:00:00.000Z",
      },
    ]);
  });

  it("builds status from config + env + token count", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setToken("default", "a@b.com", { email: "a@b.com", refreshToken: "t1" });
    await store.setToken("team", "c@d.com", { email: "c@d.com", refreshToken: "t2" });

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({ keyringBackend: "file" }),
      configPath: () => "/tmp/typee/config.json",
      env: {},
    });

    await expect(deps.status()).resolves.toEqual({
      tokenCount: 2,
      configPath: "/tmp/typee/config.json",
      keyringBackend: "file",
    });
  });

  it("removes token across all clients for an email", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setToken("default", "a@b.com", { email: "a@b.com", refreshToken: "t1" });
    await store.setToken("team", "a@b.com", { email: "a@b.com", refreshToken: "t2" });

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
    });

    await expect(deps.removeToken("a@b.com")).resolves.toEqual({
      email: "a@b.com",
      removed: true,
    });

    await expect(store.listTokens()).resolves.toEqual([]);
  });

  it("authorizes and stores token when adding account", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    let authorizeCalled = false;

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({ accountClients: { "a@b.com": "team" } }),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      authorize: async (opts) => {
        authorizeCalled = true;
        expect(opts.client).toBe("team");
        expect(opts.services?.length ?? 0).toBeGreaterThan(0);
        expect(opts.scopes).toContain("openid");
        return "refresh-1";
      },
    });

    await expect(deps.addToken("A@B.com")).resolves.toEqual({
      email: "a@b.com",
      message: "Stored token for a@b.com",
    });
    expect(authorizeCalled).toBe(true);

    await expect(store.getToken("team", "a@b.com")).resolves.toMatchObject({
      client: "team",
      email: "a@b.com",
      refreshToken: "refresh-1",
    });
  });

  it("uses requireState for remote step 2", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    let seenManual = false;
    let seenRequireState = false;

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      authorize: async (opts) => {
        seenManual = opts.manual ?? false;
        seenRequireState = opts.requireState ?? false;
        expect(opts.authUrl).toContain("state=s1");
        return "refresh-remote";
      },
    });

    await expect(
      deps.addToken("a@b.com", {
        remote: true,
        step: 2,
        authUrl: "http://127.0.0.1:3412/oauth2/callback?code=abc&state=s1",
      }),
    ).resolves.toEqual({
      email: "a@b.com",
      message: "Stored token for a@b.com",
    });

    expect(seenManual).toBe(true);
    expect(seenRequireState).toBe(true);
    await expect(store.getToken("default", "a@b.com")).resolves.toMatchObject({
      refreshToken: "refresh-remote",
    });
  });

  it("returns auth URL for remote step 1", async () => {
    let authorizeCalled = false;

    const deps = buildAuthCommandDeps({
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      authorize: async () => {
        authorizeCalled = true;
        return "refresh-1";
      },
      manualAuthURL: async (opts) => {
        expect(opts.client).toBe("default");
        expect(opts.services?.length ?? 0).toBeGreaterThan(0);
        return {
          url: "https://example.test/auth?state=s1",
          stateReused: false,
        };
      },
    });

    await expect(deps.addToken("a@b.com", { remote: true, step: 1 })).resolves.toEqual({
      email: "a@b.com",
      message: "Run again with --remote --step 2 --auth-url <redirect-url>",
      authUrl: "https://example.test/auth?state=s1",
      stateReused: false,
    });
    expect(authorizeCalled).toBe(false);
  });

  it("rejects step without remote", async () => {
    const deps = buildAuthCommandDeps({
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      authorize: async () => "refresh-1",
    });

    await expect(deps.addToken("a@b.com", { step: 1 })).rejects.toThrow("--step requires --remote");
  });

  it("rejects interactive auth add without manual or remote inputs", async () => {
    const deps = buildAuthCommandDeps({
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
    });

    await expect(deps.addToken("a@b.com")).rejects.toThrow("use --manual or --remote");
  });

  it("imports service account key file and stores it in encrypted backend", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    const saKey = JSON.stringify({
      type: "service_account",
      client_email: "sa@my-project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    });

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      readFile: async (filePath: string) => {
        if (filePath === "/tmp/sa-key.json") return saKey;
        throw new Error("file not found");
      },
    });

    const result = await deps.addServiceAccount({ keyFile: "/tmp/sa-key.json" });
    expect(result.email).toBe("sa@my-project.iam.gserviceaccount.com");
    expect(result.message).toContain("sa@my-project.iam.gserviceaccount.com");

    const storedKey = await store.getServiceAccountKey("sa@my-project.iam.gserviceaccount.com");
    expect(storedKey).toBe(saKey);

    await expect(store.getDefaultServiceAccount()).resolves.toBe("sa@my-project.iam.gserviceaccount.com");
  });

  it("rejects non-service-account key files", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    const notSaKey = JSON.stringify({
      type: "authorized_user",
      client_email: "user@example.com",
      client_secret: "secret",
    });

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      readFile: async () => notSaKey,
    });

    await expect(deps.addServiceAccount({ keyFile: "/tmp/bad-key.json" })).rejects.toThrow("not a service account key");
  });

  it("sets default service account via setDefaultServiceAccount", async () => {
    const store = new KeyringStore(new MemorySecretBackend());

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
    });

    const result = await deps.setDefaultServiceAccount("sa@other-project.iam.gserviceaccount.com");
    expect(result.email).toBe("sa@other-project.iam.gserviceaccount.com");
    await expect(store.getDefaultServiceAccount()).resolves.toBe("sa@other-project.iam.gserviceaccount.com");
  });
});
