import { readFile as fsReadFile, writeFile as fsWriteFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { readConfig as defaultReadConfig, type ConfigFile } from "../../config/config.js";
import { configPath as defaultConfigPath, serviceAccountPath as defaultServiceAccountPath, credentialsEncPath } from "../../config/paths.js";
import { resolveClientWithOverride } from "../../authclient/authclient.js";
import {
  authorize as defaultAuthorize,
  authorizeWithLocalServer as defaultAuthorizeWithLocalServer,
  manualAuthURL as defaultManualAuthURL,
  type AuthorizeOptions,
  type AuthorizeWithLocalServerOptions,
  type AuthorizeWithLocalServerResult,
  type ManualAuthURLResult,
} from "../../googleauth/oauth-flow.js";
import { scopesForManage, userServices } from "../../googleauth/service.js";
import { KeyringStore, EncryptedFileBackend } from "../../secrets/store.js";
import type {
  AddServiceAccountInput,
  AddServiceAccountResult,
  AddTokenInput,
  AddTokenResult,
  AuthCommandDeps,
  AuthStatus,
  AuthTokenSummary,
} from "./commands.js";

type BuildAuthCommandDepsOptions = {
  store?: KeyringStore;
  readConfig?: () => Promise<ConfigFile>;
  configPath?: () => string;
  env?: NodeJS.ProcessEnv;
  authorize?: (opts: AuthorizeOptions) => Promise<string>;
  manualAuthURL?: (opts: AuthorizeOptions) => Promise<ManualAuthURLResult>;
  authorizeWithLocalServer?: (opts: AuthorizeWithLocalServerOptions) => Promise<AuthorizeWithLocalServerResult>;
  readFile?: (path: string) => Promise<string>;
  writeFile?: (path: string, content: string) => Promise<void>;
  serviceAccountPath?: (email: string) => string;
};

export type AuthRuntimeDeps = Pick<
  Required<AuthCommandDeps>,
  "addToken" | "listTokens" | "status" | "removeToken" | "addServiceAccount" | "setDefaultServiceAccount"
>;

function resolveKeyringBackend(cfg: ConfigFile, env: NodeJS.ProcessEnv): string {
  if (cfg.keyringBackend !== undefined && cfg.keyringBackend.trim() !== "") {
    return cfg.keyringBackend;
  }

  const fromEnv = env.GOG_KEYRING_BACKEND?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return "auto";
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

function toTokenSummary(token: { client?: string; email: string; createdAt?: Date }): AuthTokenSummary {
  const summary: AuthTokenSummary = {
    client: token.client ?? "default",
    email: token.email,
  };

  if (token.createdAt !== undefined) {
    summary.createdAt = token.createdAt.toISOString();
  }

  return summary;
}

export function buildAuthCommandDeps(options: BuildAuthCommandDepsOptions = {}): AuthRuntimeDeps {
  const store = options.store ?? new KeyringStore(new EncryptedFileBackend(credentialsEncPath()));
  const readConfig = options.readConfig ?? defaultReadConfig;
  const configPath = options.configPath ?? defaultConfigPath;
  const env = options.env ?? process.env;
  const authorize = options.authorize ?? defaultAuthorize;
  const manualAuthURL = options.manualAuthURL ?? defaultManualAuthURL;
  const authorizeWithLocalServer = options.authorizeWithLocalServer ?? defaultAuthorizeWithLocalServer;
  const readFileFn = options.readFile ?? ((path: string) => fsReadFile(path, "utf-8"));
  const writeFileFn =
    options.writeFile ??
    (async (path: string, content: string) => {
      await mkdir(dirname(path), { recursive: true });
      await fsWriteFile(path, content, "utf-8");
    });
  const saPathFn = options.serviceAccountPath ?? defaultServiceAccountPath;

  return {
    addToken: async (email: string, input?: AddTokenInput): Promise<AddTokenResult> => {
      const normalizedEmail = requireEmail(email);
      const requestedStep = input?.step ?? 0;
      if (requestedStep !== 0 && requestedStep !== 1 && requestedStep !== 2) {
        throw new Error("step must be 1 or 2");
      }
      const remote = input?.remote ?? false;
      if (requestedStep !== 0 && !remote) {
        throw new Error("--step requires --remote");
      }

      const authUrl = input?.authUrl?.trim() ?? "";
      const authCode = input?.authCode?.trim() ?? "";
      const manual = (input?.manual ?? false) || remote || authUrl !== "" || authCode !== "";

      if (remote) {
        let effectiveStep = requestedStep;
        if (effectiveStep === 0) {
          if (authUrl !== "" || authCode !== "") {
            effectiveStep = 2;
          } else {
            // No --step specified and no --auth-url/--auth-code: use local server
            // to auto-capture the OAuth callback instead of the two-step flow.
            const cfg = await readConfig();
            const clientOverride = input?.client ?? "";
            const client = await resolveClientWithOverride(normalizedEmail, clientOverride, async () => cfg);
            const services = userServices();
            const scopes = scopesForManage(services);
            const serverOpts: AuthorizeWithLocalServerOptions = {
              scopes,
              client,
              onAuthUrl: (url) => {
                process.stderr.write(`Open this URL in your browser:\n${url}\n\nWaiting for authorization...\n`);
              },
            };
            if (input?.forceConsent ?? false) {
              serverOpts.forceConsent = true;
            }

            const result = await authorizeWithLocalServer(serverOpts);

            const serviceNames = services.map((service) => String(service)).sort();
            await store.setToken(client, normalizedEmail, {
              client,
              email: normalizedEmail,
              services: serviceNames,
              scopes,
              refreshToken: result.refreshToken,
            });

            await store.setDefaultAccount(client, normalizedEmail);

            return {
              email: normalizedEmail,
              message: `Stored token for ${normalizedEmail}`,
            };
          }
        }

        if (effectiveStep === 1) {
          if (authUrl !== "" || authCode !== "") {
            throw new Error("remote step 1 does not accept --auth-url or --auth-code");
          }

          const cfg = await readConfig();
          const clientOverride = input?.client ?? "";
          const client = await resolveClientWithOverride(normalizedEmail, clientOverride, async () => cfg);
          const services = userServices();
          const scopes = scopesForManage(services);
          const manualAuthOptions: AuthorizeOptions = {
            services,
            scopes,
            manual: true,
            client,
          };
          if (input?.forceConsent ?? false) {
            manualAuthOptions.forceConsent = true;
          }

          const result = await manualAuthURL(manualAuthOptions);

          return {
            email: normalizedEmail,
            message: "Run again with --remote --step 2 --auth-url <redirect-url>",
            authUrl: result.url,
            stateReused: result.stateReused,
          };
        }

        if (authCode !== "") {
          throw new Error("--auth-code is not valid with --remote (state check is mandatory)");
        }
        if (authUrl === "") {
          throw new Error("remote step 2 requires --auth-url");
        }
      }

      const cfg = await readConfig();
      const clientOverride = input?.client ?? "";
      const client = await resolveClientWithOverride(normalizedEmail, clientOverride, async () => cfg);
      const services = userServices();
      const scopes = scopesForManage(services);
      const authorizeOptions: AuthorizeOptions = {
        services,
        scopes,
        client,
      };
      if (authUrl !== "") {
        authorizeOptions.authUrl = authUrl;
      }
      if (authCode !== "") {
        authorizeOptions.authCode = authCode;
      }
      if (input?.forceConsent ?? false) {
        authorizeOptions.forceConsent = true;
      }
      if (manual) {
        authorizeOptions.manual = true;
      }
      if (remote) {
        authorizeOptions.requireState = true;
      }

      const refreshToken = await authorize(authorizeOptions);

      const serviceNames = services.map((service) => String(service)).sort();
      await store.setToken(client, normalizedEmail, {
        client,
        email: normalizedEmail,
        services: serviceNames,
        scopes,
        refreshToken,
      });

      // Make this account the default so commands work without --account.
      await store.setDefaultAccount(client, normalizedEmail);

      return {
        email: normalizedEmail,
        message: `Stored token for ${normalizedEmail}`,
      };
    },

    listTokens: async (): Promise<AuthTokenSummary[]> => {
      const tokens = await store.listTokens();
      return tokens.map(toTokenSummary).sort((a, b) => `${a.client}\n${a.email}`.localeCompare(`${b.client}\n${b.email}`));
    },

    status: async (): Promise<AuthStatus> => {
      const [tokens, cfg] = await Promise.all([store.listTokens(), readConfig()]);
      return {
        tokenCount: tokens.length,
        configPath: configPath(),
        keyringBackend: resolveKeyringBackend(cfg, env),
      };
    },

    removeToken: async (email: string): Promise<{ email: string; removed: boolean }> => {
      const target = requireEmail(email);
      const tokens = await store.listTokens();
      let removed = false;

      for (const token of tokens) {
        if (normalizeEmail(token.email) !== target) {
          continue;
        }

        await store.deleteToken(token.client ?? "default", token.email);
        removed = true;
      }

      return { email: target, removed };
    },

    addServiceAccount: async (input: AddServiceAccountInput): Promise<AddServiceAccountResult> => {
      const keyContent = await readFileFn(input.keyFile);
      const parsed = JSON.parse(keyContent) as { client_email?: string; type?: string };

      if (parsed.type !== "service_account") {
        throw new Error("key file is not a service account key (expected type: service_account)");
      }
      const saEmail = parsed.client_email?.trim() ?? "";
      if (saEmail === "") {
        throw new Error("key file missing client_email field");
      }

      await store.setServiceAccountKey(saEmail, keyContent);
      await store.setDefaultServiceAccount(saEmail);

      return {
        email: saEmail,
        message: `Imported service account: ${saEmail}`,
      };
    },

    setDefaultServiceAccount: async (email: string): Promise<{ email: string; message: string }> => {
      const normalized = email.trim().toLowerCase();
      if (normalized === "") {
        throw new Error("missing email");
      }
      await store.setDefaultServiceAccount(normalized);
      return {
        email: normalized,
        message: `Default service account set to ${normalized}`,
      };
    },
  };
}
