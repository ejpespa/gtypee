import { describe, expect, it } from "vitest";
import { createAuthenticatedClient, ServiceRuntime } from "../../src/googleapi/auth-factory.js";
import { MemorySecretBackend, KeyringStore } from "../../src/secrets/store.js";

describe("AccountResolver with service account fields", () => {
  it("resolver returns serviceAccount and impersonate fields", async () => {
    const resolver = async () => ({
      email: "sa@project.iam.gserviceaccount.com",
      clientOverride: "",
      serviceAccount: "sa@project.iam.gserviceaccount.com",
      impersonate: "employee@company.com",
    });

    const result = await resolver();
    expect(result.serviceAccount).toBe("sa@project.iam.gserviceaccount.com");
    expect(result.impersonate).toBe("employee@company.com");
  });
});

describe("createAuthenticatedClient with service account", () => {
  it("creates JWT client when serviceAccount is provided", async () => {
    const saKey = {
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    };

    const store = new KeyringStore(new MemorySecretBackend());

    const client = await createAuthenticatedClient(
      async () => ({
        email: "sa@project.iam.gserviceaccount.com",
        clientOverride: "",
        serviceAccount: "sa@project.iam.gserviceaccount.com",
        impersonate: "employee@company.com",
      }),
      {
        store,
        readServiceAccountKey: async () => saKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
      },
    );

    expect(client).toBeDefined();
  });

  it("falls back to OAuth2 when no serviceAccount is provided", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setToken("default", "a@b.com", {
      email: "a@b.com",
      refreshToken: "rtok",
    });

    const client = await createAuthenticatedClient(
      async () => ({
        email: "a@b.com",
        clientOverride: "",
      }),
      {
        store,
        readCredentials: async () => ({
          clientId: "cid",
          clientSecret: "csecret",
        }),
      },
    );

    expect(client).toBeDefined();
  });

  it("throws AuthRequiredError when no email and no serviceAccount", async () => {
    const store = new KeyringStore(new MemorySecretBackend());

    await expect(
      createAuthenticatedClient(
        async () => ({
          email: "",
          clientOverride: "",
        }),
        { store },
      ),
    ).rejects.toThrow("auth required for api");
  });

  it("JWT client receives subject when impersonate is set", async () => {
    const saKey = {
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    };

    const store = new KeyringStore(new MemorySecretBackend());

    const client = await createAuthenticatedClient(
      async () => ({
        email: "sa@project.iam.gserviceaccount.com",
        clientOverride: "",
        serviceAccount: "sa@project.iam.gserviceaccount.com",
        impersonate: "employee@company.com",
      }),
      {
        store,
        readServiceAccountKey: async () => saKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
      },
    );

    expect(client).toBeDefined();
    expect((client as unknown as { subject: string }).subject).toBe("employee@company.com");
  });

  it("JWT client works without impersonate", async () => {
    const saKey = {
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    };

    const store = new KeyringStore(new MemorySecretBackend());

    const client = await createAuthenticatedClient(
      async () => ({
        email: "sa@project.iam.gserviceaccount.com",
        clientOverride: "",
        serviceAccount: "sa@project.iam.gserviceaccount.com",
      }),
      {
        store,
        readServiceAccountKey: async () => saKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
      },
    );

    expect(client).toBeDefined();
    expect((client as unknown as { subject: string | undefined }).subject).toBeUndefined();
  });
});

describe("ServiceRuntime.getClient passes scopes to JWT", () => {
  it("JWT client receives scopes passed to getClient()", async () => {
    const saKey = {
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    };

    const store = new KeyringStore(new MemorySecretBackend());
    const runtime = new ServiceRuntime({
      store,
      readServiceAccountKey: async () => saKey,
      resolveAccount: async () => ({
        email: "sa@project.iam.gserviceaccount.com",
        clientOverride: "",
        serviceAccount: "sa@project.iam.gserviceaccount.com",
      }),
    });

    const driveScopes = ["https://www.googleapis.com/auth/drive"];
    const client = await runtime.getClient(driveScopes);

    expect(client).toBeDefined();
    expect((client as unknown as { scopes: string[] }).scopes).toEqual(driveScopes);
  });

  it("JWT client gets empty scopes when getClient() called without scopes", async () => {
    const saKey = {
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    };

    const store = new KeyringStore(new MemorySecretBackend());
    const runtime = new ServiceRuntime({
      store,
      readServiceAccountKey: async () => saKey,
      resolveAccount: async () => ({
        email: "sa@project.iam.gserviceaccount.com",
        clientOverride: "",
        serviceAccount: "sa@project.iam.gserviceaccount.com",
      }),
    });

    // This is the bug: no scopes passed → JWT gets empty scopes → API calls fail
    const client = await runtime.getClient();

    expect(client).toBeDefined();
    // This test documents the current (buggy) behavior: empty scopes
    expect((client as unknown as { scopes: string[] }).scopes).toEqual([]);
  });
});

describe("service account integration flow", () => {
  it("imports SA key via runtime, then resolves JWT client via auth factory", async () => {
    const { buildAuthCommandDeps } = await import("../../src/cmd/auth/runtime.js");

    const store = new KeyringStore(new MemorySecretBackend());
    const saKey = JSON.stringify({
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    });

    const deps = buildAuthCommandDeps({
      store,
      readConfig: async () => ({}),
      configPath: () => "/tmp/typee/config.json",
      env: {},
      readFile: async () => saKey,
    });

    // Step 1: Import SA key
    const importResult = await deps.addServiceAccount({ keyFile: "/tmp/sa-key.json" });
    expect(importResult.email).toBe("sa@project.iam.gserviceaccount.com");

    // Verify SA key was stored in encrypted backend
    const storedKey = await store.getServiceAccountKey("sa@project.iam.gserviceaccount.com");
    expect(storedKey).toBe(saKey);

    // Step 2: Verify default was set
    const defaultSa = await store.getDefaultServiceAccount();
    expect(defaultSa).toBe("sa@project.iam.gserviceaccount.com");

    // Step 3: Resolve JWT client via auth factory using the imported SA
    const parsedKey = JSON.parse(saKey) as { type: string; client_email: string; private_key: string; project_id: string };
    const client = await createAuthenticatedClient(
      async () => ({
        email: defaultSa,
        clientOverride: "",
        serviceAccount: defaultSa,
        impersonate: "employee@company.com",
      }),
      {
        store,
        readServiceAccountKey: async () => parsedKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
      },
    );

    expect(client).toBeDefined();
    expect((client as unknown as { subject: string }).subject).toBe("employee@company.com");
  });

  it("set-default-sa then resolve without impersonation", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setDefaultServiceAccount("sa@project.iam.gserviceaccount.com");

    const saKey = {
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    };

    const client = await createAuthenticatedClient(
      async () => ({
        email: "sa@project.iam.gserviceaccount.com",
        clientOverride: "",
        serviceAccount: "sa@project.iam.gserviceaccount.com",
      }),
      {
        store,
        readServiceAccountKey: async () => saKey,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      },
    );

    expect(client).toBeDefined();
    expect((client as unknown as { subject: string | undefined }).subject).toBeUndefined();
  });
});
