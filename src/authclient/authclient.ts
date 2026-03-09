import type { ConfigFile } from "../config/config.js";
import { readConfig } from "../config/config.js";
import { resolveClientForAccount } from "../config/clients.js";

const CLIENT_CONTEXT_KEY = "clientOverride";

export type AuthClientContext = {
  [CLIENT_CONTEXT_KEY]?: string;
};

export function withClient<T extends Record<string, unknown>>(ctx: T, client: string): T & AuthClientContext {
  const normalized = client.trim();
  if (normalized === "") {
    return { ...ctx };
  }
  return { ...ctx, [CLIENT_CONTEXT_KEY]: normalized };
}

export function clientOverrideFromContext(ctx: AuthClientContext | null | undefined): string {
  if (!ctx) {
    return "";
  }
  const v = ctx[CLIENT_CONTEXT_KEY];
  return typeof v === "string" ? v : "";
}

export async function resolveClient(
  ctx: AuthClientContext | null | undefined,
  email: string,
  readConfigFn: () => Promise<ConfigFile> = readConfig,
  clientCredentialsExists?: (client: string) => Promise<boolean>,
): Promise<string> {
  const cfg = await readConfigFn();
  return resolveClientForAccount(cfg, email, clientOverrideFromContext(ctx), clientCredentialsExists);
}

export async function resolveClientWithOverride(
  email: string,
  override: string,
  readConfigFn: () => Promise<ConfigFile> = readConfig,
  clientCredentialsExists?: (client: string) => Promise<boolean>,
): Promise<string> {
  const cfg = await readConfigFn();
  return resolveClientForAccount(cfg, email, override, clientCredentialsExists);
}
