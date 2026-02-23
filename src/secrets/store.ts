import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import os from "node:os";

import { DEFAULT_CLIENT_NAME, normalizeClientNameOrDefault } from "../config/clients.js";

export type Token = {
  client?: string;
  email: string;
  services?: string[];
  scopes?: string[];
  createdAt?: Date;
  refreshToken: string;
};

type StoredToken = {
  refresh_token: string;
  services?: string[];
  scopes?: string[];
  created_at?: string;
};

export type ParseTokenKeyResult = {
  client: string;
  email: string;
  ok: boolean;
};

export interface SecretBackend {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemorySecretBackend implements SecretBackend {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.values.keys()];
  }
}

/**
 * Encrypts credentials to a file using AES-256-GCM with a machine-derived key.
 *
 * File format: salt (16 bytes) || iv (12 bytes) || authTag (16 bytes) || ciphertext
 * Key derivation: scrypt(hostname + username, salt, keylen=32)
 */
export class EncryptedFileBackend implements SecretBackend {
  constructor(private readonly filePath: string) {}

  private deriveKey(salt: Buffer): Buffer {
    const machineId = `${os.hostname()}\0${os.userInfo().username}`;
    return scryptSync(machineId, salt, 32) as Buffer;
  }

  private async readStore(): Promise<Record<string, string>> {
    let raw: Buffer;
    try {
      raw = await readFile(this.filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw err;
    }

    // salt(16) + iv(12) + authTag(16) + at least 1 byte ciphertext
    if (raw.length < 45) {
      return {};
    }

    const salt = raw.subarray(0, 16);
    const iv = raw.subarray(16, 28);
    const authTag = raw.subarray(28, 44);
    const ciphertext = raw.subarray(44);

    const key = this.deriveKey(salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString("utf-8")) as Record<string, string>;
  }

  private async writeStore(data: Record<string, string>): Promise<void> {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = this.deriveKey(salt);

    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(data), "utf-8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, Buffer.concat([salt, iv, authTag, ciphertext]));
  }

  async get(key: string): Promise<string | undefined> {
    const data = await this.readStore();
    return data[key] ?? undefined;
  }

  async set(key: string, value: string): Promise<void> {
    const data = await this.readStore();
    data[key] = value;
    await this.writeStore(data);
  }

  async delete(key: string): Promise<void> {
    const data = await this.readStore();
    delete data[key];
    await this.writeStore(data);
  }

  async keys(): Promise<string[]> {
    const data = await this.readStore();
    return Object.keys(data);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (normalized === "") {
    throw new Error("missing email");
  }
  return normalized;
}

function defaultAccountKeyForClient(client: string): string {
  return `default_account:${client}`;
}

function legacyTokenKey(email: string): string {
  return `token:${email}`;
}

export function tokenKey(client: string, email: string): string {
  return `token:${normalizeClientNameOrDefault(client)}:${normalizeEmail(email)}`;
}

export function parseTokenKey(key: string): ParseTokenKeyResult {
  if (!key.startsWith("token:")) {
    return { client: "", email: "", ok: false };
  }

  const rest = key.slice("token:".length);
  if (rest.trim() === "") {
    return { client: "", email: "", ok: false };
  }

  if (!rest.includes(":")) {
    return { client: DEFAULT_CLIENT_NAME, email: rest, ok: true };
  }

  const idx = rest.indexOf(":");
  const client = rest.slice(0, idx).trim();
  const email = rest.slice(idx + 1).trim();
  if (client === "" || email === "") {
    return { client: "", email: "", ok: false };
  }
  return { client, email, ok: true };
}

export class KeyringStore {
  constructor(private readonly backend: SecretBackend) {}

  async keys(): Promise<string[]> {
    return this.backend.keys();
  }

  async setToken(client: string, email: string, token: Token): Promise<void> {
    const normalizedEmail = requireEmail(email);
    if ((token.refreshToken ?? "").trim() === "") {
      throw new Error("missing refresh token");
    }

    const normalizedClient = normalizeClientNameOrDefault(client);
    const payload: StoredToken = {
      refresh_token: token.refreshToken,
      created_at: (token.createdAt ?? new Date()).toISOString(),
    };
    if (token.services !== undefined) {
      payload.services = token.services;
    }
    if (token.scopes !== undefined) {
      payload.scopes = token.scopes;
    }
    const encoded = JSON.stringify(payload);
    await this.backend.set(tokenKey(normalizedClient, normalizedEmail), encoded);
    if (normalizedClient === DEFAULT_CLIENT_NAME) {
      await this.backend.set(legacyTokenKey(normalizedEmail), encoded);
    }
  }

  async getToken(client: string, email: string): Promise<Token> {
    const normalizedEmail = requireEmail(email);
    const normalizedClient = normalizeClientNameOrDefault(client);

    let raw = await this.backend.get(tokenKey(normalizedClient, normalizedEmail));
    if (raw === undefined && normalizedClient === DEFAULT_CLIENT_NAME) {
      raw = await this.backend.get(legacyTokenKey(normalizedEmail));
      if (raw !== undefined) {
        await this.backend.set(tokenKey(normalizedClient, normalizedEmail), raw);
      }
    }

    if (raw === undefined) {
      throw new Error("read token: not found");
    }

    const parsed = JSON.parse(raw) as StoredToken;
    const token: Token = {
      client: normalizedClient,
      email: normalizedEmail,
      refreshToken: parsed.refresh_token,
    };
    if (parsed.services !== undefined) {
      token.services = parsed.services;
    }
    if (parsed.scopes !== undefined) {
      token.scopes = parsed.scopes;
    }
    if (parsed.created_at !== undefined) {
      token.createdAt = new Date(parsed.created_at);
    }
    return token;
  }

  async deleteToken(client: string, email: string): Promise<void> {
    const normalizedEmail = requireEmail(email);
    const normalizedClient = normalizeClientNameOrDefault(client);

    await this.backend.delete(tokenKey(normalizedClient, normalizedEmail));
    if (normalizedClient === DEFAULT_CLIENT_NAME) {
      await this.backend.delete(legacyTokenKey(normalizedEmail));
    }
  }

  async listTokens(): Promise<Token[]> {
    const allKeys = await this.keys();
    const seen = new Set<string>();
    const out: Token[] = [];

    for (const key of allKeys) {
      const parsed = parseTokenKey(key);
      if (!parsed.ok) {
        continue;
      }
      const marker = `${parsed.client}\n${parsed.email}`;
      if (seen.has(marker)) {
        continue;
      }
      seen.add(marker);
      out.push(await this.getToken(parsed.client, parsed.email));
    }

    return out;
  }

  async getDefaultAccount(client: string): Promise<string> {
    const normalizedClient = normalizeClientNameOrDefault(client);

    const specific = await this.backend.get(defaultAccountKeyForClient(normalizedClient));
    if (specific !== undefined) {
      return specific;
    }

    const global = await this.backend.get("default_account");
    return global ?? "";
  }

  async setDefaultAccount(client: string, email: string): Promise<void> {
    const normalizedEmail = requireEmail(email);
    const normalizedClient = normalizeClientNameOrDefault(client);

    await this.backend.set(defaultAccountKeyForClient(normalizedClient), normalizedEmail);
    await this.backend.set("default_account", normalizedEmail);
  }

  async getDefaultServiceAccount(): Promise<string> {
    const value = await this.backend.get("default_service_account");
    return value ?? "";
  }

  async setDefaultServiceAccount(email: string): Promise<void> {
    const normalizedEmail = requireEmail(email);
    await this.backend.set("default_service_account", normalizedEmail);
  }

  async getServiceAccountKey(email: string): Promise<string | undefined> {
    const normalizedEmail = requireEmail(email);
    return this.backend.get(`sa_key:${normalizedEmail}`);
  }

  async setServiceAccountKey(email: string, keyJson: string): Promise<void> {
    const normalizedEmail = requireEmail(email);
    await this.backend.set(`sa_key:${normalizedEmail}`, keyJson);
  }
}
