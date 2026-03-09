import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type AuthTokenSummary = {
  client: string;
  email: string;
  createdAt?: string;
};

export type AuthStatus = {
  tokenCount: number;
  configPath: string;
  keyringBackend: string;
};

export type AddTokenInput = {
  client?: string;
  authUrl?: string;
  authCode?: string;
  forceConsent?: boolean;
  manual?: boolean;
  remote?: boolean;
  step?: number;
};

export type AddTokenResult = {
  email: string;
  message: string;
  authUrl?: string;
  stateReused?: boolean;
};

export type AddServiceAccountInput = {
  keyFile: string;
};

export type AddServiceAccountResult = {
  email: string;
  message: string;
};

export type AuthCommandDeps = {
  listTokens?: () => Promise<AuthTokenSummary[]>;
  status?: () => Promise<AuthStatus>;
  addToken?: (email: string, input?: AddTokenInput) => Promise<AddTokenResult>;
  removeToken?: (email: string) => Promise<{ email: string; removed: boolean }>;
  addServiceAccount?: (input: AddServiceAccountInput) => Promise<AddServiceAccountResult>;
  setDefaultServiceAccount?: (email: string) => Promise<{ email: string; message: string }>;
};

export type ResolvedAuthCommandDeps = Required<AuthCommandDeps>;

export type AuthAddCommandOptions = {
  email: string;
  authUrl?: string;
  authCode?: string;
  forceConsent?: boolean;
  manual?: boolean;
  remote?: boolean;
  step?: number;
};

const defaultDeps: ResolvedAuthCommandDeps = {
  listTokens: async () => [],
  status: async () => ({
    tokenCount: 0,
    configPath: "",
    keyringBackend: "auto",
  }),
  addToken: async (email) => ({
    email,
    message: "authorization requires --manual or --remote flow",
  }),
  removeToken: async (email) => ({
    email,
    removed: false,
  }),
  addServiceAccount: async () => ({
    email: "",
    message: "not implemented",
  }),
  setDefaultServiceAccount: async (email) => ({
    email,
    message: "not implemented",
  }),
};

export function resolveAuthCommandDeps(deps: AuthCommandDeps = {}): ResolvedAuthCommandDeps {
  return {
    ...defaultDeps,
    ...deps,
  };
}

export function formatAuthList(tokens: AuthTokenSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ tokens }, null, 2);
  }

  if (tokens.length === 0) {
    return "No stored tokens";
  }

  const lines = ["CLIENT\tEMAIL"];
  for (const token of tokens) {
    lines.push(`${token.client}\t${token.email}`);
  }
  return lines.join("\n");
}

export function formatAuthStatus(status: AuthStatus, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(status, null, 2);
  }

  return [
    `Tokens: ${status.tokenCount}`,
    `Config: ${status.configPath || "(unknown)"}`,
    `Keyring backend: ${status.keyringBackend || "auto"}`,
  ].join("\n");
}

function toAddTokenInput(rootOptions: RootOptions, opts: AuthAddCommandOptions): AddTokenInput {
  const input: AddTokenInput = {};
  const client = rootOptions.client?.trim() ?? "";
  if (client !== "") {
    input.client = client;
  }
  const authUrl = opts.authUrl?.trim() ?? "";
  if (authUrl !== "") {
    input.authUrl = authUrl;
  }
  const authCode = opts.authCode?.trim() ?? "";
  if (authCode !== "") {
    input.authCode = authCode;
  }
  if (opts.forceConsent ?? false) {
    input.forceConsent = true;
  }
  if (opts.manual ?? false) {
    input.manual = true;
  }
  if (opts.remote ?? false) {
    input.remote = true;
  }
  if (opts.step !== undefined) {
    input.step = opts.step;
  }
  return input;
}

export async function executeAuthAdd(
  rootOptions: RootOptions,
  opts: AuthAddCommandOptions,
  deps: ResolvedAuthCommandDeps,
): Promise<void> {
  const ctx = buildExecutionContext(rootOptions);
  const result = await deps.addToken(opts.email, toAddTokenInput(rootOptions, opts));
  if (ctx.output.mode === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if ((result.authUrl ?? "").trim() !== "") {
    process.stdout.write(`auth_url\t${result.authUrl}\n`);
    process.stdout.write(`state_reused\t${result.stateReused ?? false}\n`);
  }

  process.stdout.write(`${result.message}\n`);
}

export async function executeAuthRemove(rootOptions: RootOptions, email: string, deps: ResolvedAuthCommandDeps): Promise<void> {
  const ctx = buildExecutionContext(rootOptions);
  const result = await deps.removeToken(email);
  if (ctx.output.mode === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(result.removed ? `Removed token for ${result.email}\n` : `No token found for ${result.email}\n`);
}

export async function executeAuthStatus(rootOptions: RootOptions, deps: ResolvedAuthCommandDeps): Promise<void> {
  const ctx = buildExecutionContext(rootOptions);
  const status = await deps.status();
  process.stdout.write(`${formatAuthStatus(status, ctx.output.mode)}\n`);
}

export function registerAuthCommands(authCommand: Command, deps: AuthCommandDeps = {}): void {
  const resolvedDeps = resolveAuthCommandDeps(deps);

  authCommand
    .command("add")
    .description("Authorize and store a refresh token")
    .requiredOption("--email <email>", "Account email")
    .option("--auth-url <url>", "OAuth redirect URL (manual flow)")
    .option("--auth-code <code>", "OAuth authorization code (manual flow)")
    .option("--force-consent", "Force consent prompt", false)
    .option("--manual", "Browserless auth flow")
    .option("--remote", "Remote-friendly manual auth flow")
    .option("--step <number>", "Remote auth step: 1=print URL, 2=exchange code", (value) => Number.parseInt(value, 10))
    .action(async function actionAdd(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const opts = this.opts<AuthAddCommandOptions>();
      await executeAuthAdd(rootOptions, opts, resolvedDeps);
    });

  authCommand
    .command("remove")
    .alias("logout")
    .description("Remove a stored refresh token")
    .requiredOption("--email <email>", "Account email")
    .action(async function actionRemove(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const opts = this.opts<{ email: string }>();
      await executeAuthRemove(rootOptions, opts.email, resolvedDeps);
    });

  authCommand
    .command("list")
    .description("List stored auth tokens")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const tokens = await resolvedDeps.listTokens();
      process.stdout.write(`${formatAuthList(tokens, ctx.output.mode)}\n`);
    });

  authCommand
    .command("status")
    .description("Show auth/config status")
    .action(async function actionStatus(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      await executeAuthStatus(rootOptions, resolvedDeps);
    });

  authCommand
    .command("add-sa")
    .description("Import a service account key file")
    .requiredOption("--key-file <path>", "Path to service account JSON key file")
    .action(async function actionAddSa(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ keyFile: string }>();
      const result = await resolvedDeps.addServiceAccount({ keyFile: opts.keyFile });
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${result.message}\n`);
    });

  authCommand
    .command("set-default-sa")
    .description("Set the default service account")
    .requiredOption("--email <email>", "Service account email")
    .action(async function actionSetDefaultSa(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();
      const result = await resolvedDeps.setDefaultServiceAccount(opts.email);
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${result.message}\n`);
    });
}
