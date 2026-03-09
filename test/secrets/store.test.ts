import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { EncryptedFileBackend, KeyringStore, MemorySecretBackend, parseTokenKey } from "../../src/secrets/store.js";

describe("secrets store", () => {
  it("sets and gets token", async () => {
    const store = new KeyringStore(new MemorySecretBackend());

    await store.setToken("default", "a@b.com", {
      email: "a@b.com",
      refreshToken: "rtok",
      services: ["gmail"],
      scopes: ["scope1"],
    });

    const token = await store.getToken("default", "a@b.com");
    expect(token.email).toBe("a@b.com");
    expect(token.refreshToken).toBe("rtok");
    expect(token.client).toBe("default");
  });

  it("lists stored tokens", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setToken("default", "a@b.com", { email: "a@b.com", refreshToken: "1" });
    await store.setToken("team", "c@d.com", { email: "c@d.com", refreshToken: "2" });

    const tokens = await store.listTokens();
    expect(tokens).toHaveLength(2);
  });

  it("stores and reads default account", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setDefaultAccount("default", "a@b.com");
    await store.setDefaultAccount("team", "c@d.com");

    await expect(store.getDefaultAccount("team")).resolves.toBe("c@d.com");
    await expect(store.getDefaultAccount("default")).resolves.toBe("a@b.com");
  });

  it("parses token keys", () => {
    expect(parseTokenKey("token:default:a@b.com")).toEqual({ client: "default", email: "a@b.com", ok: true });
    expect(parseTokenKey("token:a@b.com")).toEqual({ client: "default", email: "a@b.com", ok: true });
    expect(parseTokenKey("not-token").ok).toBe(false);
  });

  it("stores and reads default service account", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await store.setDefaultServiceAccount("sa@project.iam.gserviceaccount.com");

    await expect(store.getDefaultServiceAccount()).resolves.toBe("sa@project.iam.gserviceaccount.com");
  });

  it("returns empty string when no default service account is set", async () => {
    const store = new KeyringStore(new MemorySecretBackend());
    await expect(store.getDefaultServiceAccount()).resolves.toBe("");
  });
});

describe("EncryptedFileBackend", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "typee-enc-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("round-trips a value through set and get", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);

    await backend.set("token:default:a@b.com", '{"refresh_token":"rt1"}');
    const result = await backend.get("token:default:a@b.com");
    expect(result).toBe('{"refresh_token":"rt1"}');
  });

  it("returns undefined for missing key", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);

    const result = await backend.get("nonexistent");
    expect(result).toBeUndefined();
  });

  it("deletes a key", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);

    await backend.set("key1", "value1");
    await backend.delete("key1");
    const result = await backend.get("key1");
    expect(result).toBeUndefined();
  });

  it("lists all keys", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);

    await backend.set("key1", "value1");
    await backend.set("key2", "value2");
    const keys = await backend.keys();
    expect(keys.sort()).toEqual(["key1", "key2"]);
  });

  it("persists data across instances", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");

    const backend1 = new EncryptedFileBackend(filePath);
    await backend1.set("key1", "value1");

    const backend2 = new EncryptedFileBackend(filePath);
    const result = await backend2.get("key1");
    expect(result).toBe("value1");
  });

  it("file content is not plaintext", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);

    await backend.set("secret", "super-secret-value");
    const raw = await fs.readFile(filePath);
    const asString = raw.toString("utf-8");
    expect(asString).not.toContain("super-secret-value");
    expect(asString).not.toContain("secret");
  });

  it("works with KeyringStore", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);
    const store = new KeyringStore(backend);

    await store.setToken("default", "test@example.com", {
      email: "test@example.com",
      refreshToken: "my-refresh-token",
    });

    const token = await store.getToken("default", "test@example.com");
    expect(token.refreshToken).toBe("my-refresh-token");
    expect(token.email).toBe("test@example.com");
  });
});

describe("KeyringStore service account key storage", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "typee-sa-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("stores and retrieves service account key", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);
    const store = new KeyringStore(backend);

    const saKeyJson = JSON.stringify({
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
    });

    await store.setServiceAccountKey("sa@project.iam.gserviceaccount.com", saKeyJson);

    const retrieved = await store.getServiceAccountKey("sa@project.iam.gserviceaccount.com");
    expect(retrieved).toBe(saKeyJson);
  });

  it("returns undefined for missing service account key", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);
    const store = new KeyringStore(backend);

    const retrieved = await store.getServiceAccountKey("nonexistent@project.iam.gserviceaccount.com");
    expect(retrieved).toBeUndefined();
  });

  it("persists SA keys across instances", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");

    const store1 = new KeyringStore(new EncryptedFileBackend(filePath));
    await store1.setServiceAccountKey("sa1@project.iam.gserviceaccount.com", '{"key":"value1"}');

    const store2 = new KeyringStore(new EncryptedFileBackend(filePath));
    const retrieved = await store2.getServiceAccountKey("sa1@project.iam.gserviceaccount.com");
    expect(retrieved).toBe('{"key":"value1"}');
  });

  it("stores multiple service account keys", async () => {
    const filePath = path.join(tmpDir, "credentials.enc");
    const backend = new EncryptedFileBackend(filePath);
    const store = new KeyringStore(backend);

    await store.setServiceAccountKey("sa1@project.iam.gserviceaccount.com", '{"key":"value1"}');
    await store.setServiceAccountKey("sa2@project.iam.gserviceaccount.com", '{"key":"value2"}');

    const sa1 = await store.getServiceAccountKey("sa1@project.iam.gserviceaccount.com");
    const sa2 = await store.getServiceAccountKey("sa2@project.iam.gserviceaccount.com");

    expect(sa1).toBe('{"key":"value1"}');
    expect(sa2).toBe('{"key":"value2"}');
  });
});
