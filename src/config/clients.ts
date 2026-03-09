import fs from "node:fs/promises";

import type { ConfigFile } from "./config.js";
import { ensureTypeeConfigMigrated } from "./migration.js";
import { clientCredentialsPathFor } from "./paths.js";

export const DEFAULT_CLIENT_NAME = "default";

export function normalizeClientName(raw: string): string {
  const name = raw.trim().toLowerCase();
  if (name === "") {
    throw new Error("invalid client name: empty");
  }

  for (const ch of name) {
    const ok =
      (ch >= "a" && ch <= "z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "-" ||
      ch === "_" ||
      ch === ".";
    if (!ok) {
      throw new Error(`invalid client name: ${raw}`);
    }
  }

  return name;
}

export function normalizeClientNameOrDefault(raw: string): string {
  if (raw.trim() === "") {
    return DEFAULT_CLIENT_NAME;
  }
  return normalizeClientName(raw);
}

export function normalizeDomain(raw: string): string {
  const domain = raw.trim().toLowerCase().replace(/^@/, "");
  if (domain === "") {
    throw new Error("invalid domain name: empty");
  }
  if (!domain.includes(".")) {
    throw new Error(`invalid domain name: ${raw}`);
  }

  for (const ch of domain) {
    const ok =
      (ch >= "a" && ch <= "z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "-" ||
      ch === "_" ||
      ch === ".";
    if (!ok) {
      throw new Error(`invalid domain name: ${raw}`);
    }
  }

  return domain;
}

export function domainFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized === "") {
    return "";
  }

  const parts = normalized.split("@");
  if (parts.length !== 2) {
    return "";
  }

  return parts[1]?.trim() ?? "";
}

async function defaultClientCredentialsExists(client: string, baseConfigDir?: string): Promise<boolean> {
  await ensureTypeeConfigMigrated(baseConfigDir);
  try {
    await fs.stat(clientCredentialsPathFor(client, baseConfigDir));
    return true;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function resolveClientForAccount(
  cfg: ConfigFile,
  email: string,
  override: string,
  clientCredentialsExists: (client: string) => Promise<boolean> = (client) =>
    defaultClientCredentialsExists(client),
): Promise<string> {
  if (override.trim() !== "") {
    return normalizeClientNameOrDefault(override);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== "") {
    const accountClient = cfg.accountClients?.[normalizedEmail];
    if ((accountClient ?? "").trim() !== "") {
      return normalizeClientNameOrDefault(accountClient ?? "");
    }
  }

  const domain = domainFromEmail(normalizedEmail);
  if (domain !== "") {
    const mapped = cfg.clientDomains?.[domain];
    if ((mapped ?? "").trim() !== "") {
      return normalizeClientNameOrDefault(mapped ?? "");
    }

    if (await clientCredentialsExists(domain)) {
      return normalizeClientName(domain);
    }
  }

  return DEFAULT_CLIENT_NAME;
}
