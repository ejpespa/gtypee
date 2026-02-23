import os from "node:os";
import path from "node:path";

export const APP_NAME = "typee";

export function userConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA?.trim();
    if (appData) {
      return appData;
    }
  }

  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return xdg;
  }

  return path.join(os.homedir(), ".config");
}

export function appDir(baseConfigDir?: string): string {
  return path.join(baseConfigDir ?? userConfigDir(), APP_NAME);
}

export function configPath(baseConfigDir?: string): string {
  return path.join(appDir(baseConfigDir), "config.json");
}

export function credentialsEncPath(baseConfigDir?: string): string {
  return path.join(appDir(baseConfigDir), "credentials.enc");
}

export function clientCredentialsPath(baseConfigDir?: string): string {
  return clientCredentialsPathFor("default", baseConfigDir);
}

function normalizeClientPathName(client: string): string {
  const normalized = client.trim().toLowerCase();
  if (normalized === "" || normalized === "default") {
    return "default";
  }

  for (const ch of normalized) {
    const ok =
      (ch >= "a" && ch <= "z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "-" ||
      ch === "_" ||
      ch === ".";
    if (!ok) {
      throw new Error(`invalid client name: ${client}`);
    }
  }

  return normalized;
}

export function clientCredentialsPathFor(client: string, baseConfigDir?: string): string {
  const normalized = normalizeClientPathName(client);
  if (normalized === "default") {
    return path.join(appDir(baseConfigDir), "credentials.json");
  }
  return path.join(appDir(baseConfigDir), `credentials-${normalized}.json`);
}

function encodeEmailForFilename(email: string): string {
  return Buffer.from(email.trim().toLowerCase(), "utf8").toString("base64url");
}

export function serviceAccountPath(email: string, baseConfigDir?: string): string {
  return path.join(appDir(baseConfigDir), `sa-${encodeEmailForFilename(email)}.json`);
}

export function keepServiceAccountPath(email: string, baseConfigDir?: string): string {
  return path.join(appDir(baseConfigDir), `keep-sa-${encodeEmailForFilename(email)}.json`);
}

export function expandPath(input: string): string {
  if (input === "") {
    return "";
  }
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}
