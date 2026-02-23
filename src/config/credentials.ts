import fs from "node:fs/promises";

import { DEFAULT_CLIENT_NAME, normalizeClientNameOrDefault } from "./clients.js";
import { ensureTypeeConfigMigrated } from "./migration.js";
import { appDir, clientCredentialsPathFor } from "./paths.js";

export type ClientCredentials = {
  clientId: string;
  clientSecret: string;
};

type GoogleCredentialsFile = {
  installed?: {
    client_id?: string;
    client_secret?: string;
  };
  web?: {
    client_id?: string;
    client_secret?: string;
  };
};

export class CredentialsMissingError extends Error {
  constructor(
    readonly path: string,
    readonly cause: unknown,
  ) {
    super("oauth credentials missing", cause ? { cause } : undefined);
    this.name = "CredentialsMissingError";
  }
}

export function parseGoogleOAuthClientJson(input: string): ClientCredentials {
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(input);
  } catch (error: unknown) {
    throw new Error(`decode credentials json: ${String(error)}`);
  }

  if (typeof parsedUnknown !== "object" || parsedUnknown === null || Array.isArray(parsedUnknown)) {
    throw new Error("invalid credentials.json (expected installed/web client_id and client_secret)");
  }

  const parsed = parsedUnknown as GoogleCredentialsFile;

  const source = parsed.installed ?? parsed.web;
  const clientId = source?.client_id ?? "";
  const clientSecret = source?.client_secret ?? "";
  if (clientId === "" || clientSecret === "") {
    throw new Error("invalid credentials.json (expected installed/web client_id and client_secret)");
  }

  return { clientId, clientSecret };
}

export async function writeClientCredentialsFor(
  client: string,
  credentials: ClientCredentials,
  baseConfigDir?: string,
): Promise<void> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  const normalizedClient = normalizeClientNameOrDefault(client);
  const file = clientCredentialsPathFor(normalizedClient, baseConfigDir);
  await fs.mkdir(appDir(baseConfigDir), { recursive: true, mode: 0o700 });

  const tmp = `${file}.tmp`;
  const payload = `${JSON.stringify(credentials, null, 2)}\n`;
  await fs.writeFile(tmp, payload, { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, file);
}

export async function writeClientCredentials(
  credentials: ClientCredentials,
  baseConfigDir?: string,
): Promise<void> {
  await writeClientCredentialsFor(DEFAULT_CLIENT_NAME, credentials, baseConfigDir);
}

export async function readClientCredentialsFor(client: string, baseConfigDir?: string): Promise<ClientCredentials> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  const normalizedClient = normalizeClientNameOrDefault(client);
  const file = clientCredentialsPathFor(normalizedClient, baseConfigDir);

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new CredentialsMissingError(file, error);
    }
    throw new Error(`read credentials: ${String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`decode credentials: ${String(error)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("stored credentials.json is missing clientId/clientSecret");
  }

  const value = parsed as Partial<ClientCredentials>;
  if ((value.clientId ?? "") === "" || (value.clientSecret ?? "") === "") {
    throw new Error("stored credentials.json is missing client_id/client_secret");
  }

  return {
    clientId: value.clientId ?? "",
    clientSecret: value.clientSecret ?? "",
  };
}

export async function readClientCredentials(baseConfigDir?: string): Promise<ClientCredentials> {
  return readClientCredentialsFor(DEFAULT_CLIENT_NAME, baseConfigDir);
}

export async function clientCredentialsExists(client: string, baseConfigDir?: string): Promise<boolean> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  try {
    await fs.stat(clientCredentialsPathFor(normalizeClientNameOrDefault(client), baseConfigDir));
    return true;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
