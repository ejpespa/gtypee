import { randomBytes } from "node:crypto";
import http from "node:http";
import net from "node:net";

import { google } from "googleapis";

import { readClientCredentialsFor, type ClientCredentials } from "../config/credentials.js";
import type { Service } from "./service.js";

export type AuthorizeOptions = {
  services?: Service[];
  scopes: string[];
  manual?: boolean;
  forceConsent?: boolean;
  timeoutMs?: number;
  client?: string;
  authCode?: string;
  authUrl?: string;
  requireState?: boolean;
};

export type ExchangeCodeRequest = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  code: string;
  redirectUri: string;
  forceConsent: boolean;
  state?: string;
};

type ExchangeCodeResult = {
  refreshToken?: string;
};

export type AuthorizeDeps = {
  readClientCredentialsFor?: (client: string) => Promise<ClientCredentials>;
  exchangeCode?: (request: ExchangeCodeRequest) => Promise<ExchangeCodeResult>;
};

export type ManualAuthURLResult = {
  url: string;
  stateReused: boolean;
};

export type ManualAuthURLDeps = {
  readClientCredentialsFor?: (client: string) => Promise<ClientCredentials>;
  randomState?: () => string;
  randomRedirectUri?: () => Promise<string>;
};

type ParsedRedirect = {
  code: string;
  state: string;
  redirectUri: string;
};

const ERR_INVALID_REDIRECT_URL = "invalid redirect URL";
const ERR_MISSING_CODE = "missing code";
const ERR_MISSING_SCOPES = "missing scopes";
const ERR_NO_CODE_IN_URL = "no code found in URL";
const ERR_MISSING_REDIRECT_URI = "missing redirect uri; provide auth-url";
const ERR_MISSING_STATE = "missing state in redirect URL";
const ERR_NO_REFRESH_TOKEN = "no refresh token received; try again with --force-consent";
export const ERR_INTERACTIVE_FLOW_REQUIRED = "interactive browser auth is not available in this build; use --manual or --remote";

async function randomManualRedirectUri(): Promise<string> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  const address = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  if (address === null || typeof address === "string") {
    throw new Error("listen for manual redirect port: invalid address");
  }

  return `http://127.0.0.1:${address.port}/oauth2/callback`;
}

function parseRedirectUrl(rawUrl: string): ParsedRedirect {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (error: unknown) {
    throw new Error(`parse redirect url: ${String(error)}`);
  }

  if (parsed.protocol === "" || parsed.host === "") {
    throw new Error(`parse redirect url: ${ERR_INVALID_REDIRECT_URL}`);
  }

  const code = parsed.searchParams.get("code") ?? "";
  if (code === "") {
    throw new Error(ERR_NO_CODE_IN_URL);
  }

  const state = parsed.searchParams.get("state") ?? "";
  return {
    code,
    state,
    redirectUri: `${parsed.protocol}//${parsed.host}${parsed.pathname || "/"}`,
  };
}

async function defaultExchangeCode(request: ExchangeCodeRequest): Promise<ExchangeCodeResult> {
  const oauth = new google.auth.OAuth2(request.clientId, request.clientSecret, request.redirectUri);
  const response = await oauth.getToken({
    code: request.code,
    redirect_uri: request.redirectUri,
  });

  const refreshToken = response.tokens.refresh_token;
  if (typeof refreshToken === "string" && refreshToken.trim() !== "") {
    return { refreshToken };
  }
  return {};
}

export function validateAuthorizeOptions(opts: AuthorizeOptions): void {
  if ((opts.authUrl ?? "").trim() !== "" && (opts.authCode ?? "").trim() !== "") {
    throw new Error("cannot combine auth-url with auth-code");
  }

  if ((opts.requireState ?? false) && (opts.authCode ?? "").trim() !== "") {
    throw new Error("auth-code is not valid when state is required; provide auth-url");
  }

  if (opts.scopes.length === 0) {
    throw new Error(ERR_MISSING_SCOPES);
  }
}

export function authUrlParams(forceConsent: boolean): Record<string, string> {
  const out: Record<string, string> = {
    access_type: "offline",
    include_granted_scopes: "true",
  };
  if (forceConsent) {
    out.prompt = "consent";
  }
  return out;
}

export function randomState(): string {
  return randomBytes(32).toString("base64url");
}

export async function manualAuthURL(opts: AuthorizeOptions, deps: ManualAuthURLDeps = {}): Promise<ManualAuthURLResult> {
  validateAuthorizeOptions(opts);

  const readCreds = deps.readClientCredentialsFor ?? readClientCredentialsFor;
  const makeState = deps.randomState ?? randomState;
  const makeRedirectUri = deps.randomRedirectUri ?? randomManualRedirectUri;
  const client = (opts.client ?? "").trim();
  const creds = await readCreds(client);

  const state = makeState();
  const redirectUri = await makeRedirectUri();
  const oauth = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
  const generateOptions = {
    access_type: "offline",
    include_granted_scopes: true,
    response_type: "code",
    scope: opts.scopes,
    state,
  } as {
    access_type: string;
    include_granted_scopes: boolean;
    response_type: string;
    scope: string[];
    state: string;
    prompt?: string;
  };
  if (opts.forceConsent ?? false) {
    generateOptions.prompt = "consent";
  }

  const url = oauth.generateAuthUrl(generateOptions);

  return {
    url,
    stateReused: false,
  };
}

export async function authorize(opts: AuthorizeOptions, deps: AuthorizeDeps = {}): Promise<string> {
  validateAuthorizeOptions(opts);

  const readCreds = deps.readClientCredentialsFor ?? readClientCredentialsFor;
  const exchangeCode = deps.exchangeCode ?? defaultExchangeCode;

  const authUrlInput = (opts.authUrl ?? "").trim();
  const authCodeInput = (opts.authCode ?? "").trim();
  if (authUrlInput === "" && authCodeInput === "") {
    throw new Error(ERR_INTERACTIVE_FLOW_REQUIRED);
  }

  const client = (opts.client ?? "").trim();
  const creds = await readCreds(client);

  let code = authCodeInput;
  let state = "";
  let redirectUri = "";

  if (authUrlInput !== "") {
    const parsed = parseRedirectUrl(authUrlInput);
    code = parsed.code;
    state = parsed.state;
    redirectUri = parsed.redirectUri;
  }

  if ((opts.requireState ?? false) && state === "") {
    throw new Error(ERR_MISSING_STATE);
  }

  if (code === "") {
    throw new Error(ERR_MISSING_CODE);
  }

  if (redirectUri === "") {
    throw new Error(ERR_MISSING_REDIRECT_URI);
  }

  const request: ExchangeCodeRequest = {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    scopes: opts.scopes,
    code,
    redirectUri,
    forceConsent: opts.forceConsent ?? false,
  };
  if (state !== "") {
    request.state = state;
  }

  const token = await exchangeCode(request);

  const refreshToken = token.refreshToken?.trim() ?? "";
  if (refreshToken === "") {
    throw new Error(ERR_NO_REFRESH_TOKEN);
  }

  return refreshToken;
}

export type AuthorizeWithLocalServerOptions = {
  scopes: string[];
  client?: string;
  forceConsent?: boolean;
  timeoutMs?: number;
  onAuthUrl?: (url: string) => void;
};

export type AuthorizeWithLocalServerDeps = {
  readClientCredentialsFor?: (client: string) => Promise<ClientCredentials>;
  exchangeCode?: (request: ExchangeCodeRequest) => Promise<ExchangeCodeResult>;
};

export type AuthorizeWithLocalServerResult = {
  refreshToken: string;
  authUrl: string;
};

export async function authorizeWithLocalServer(
  opts: AuthorizeWithLocalServerOptions,
  deps: AuthorizeWithLocalServerDeps = {},
): Promise<AuthorizeWithLocalServerResult> {
  if (opts.scopes.length === 0) {
    throw new Error(ERR_MISSING_SCOPES);
  }

  const readCreds = deps.readClientCredentialsFor ?? readClientCredentialsFor;
  const exchangeCode = deps.exchangeCode ?? defaultExchangeCode;
  const client = (opts.client ?? "").trim();
  const creds = await readCreds(client);
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const state = randomState();

  // Start a local HTTP server on a random port to receive the OAuth callback.
  const server = http.createServer();
  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      const addr = server.address();
      if (addr === null || typeof addr === "string") {
        reject(new Error("failed to bind local server"));
        return;
      }
      resolve(addr.port);
    });
  });

  const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`;
  const oauth = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);

  const generateOptions: {
    access_type: string;
    include_granted_scopes: boolean;
    response_type: string;
    scope: string[];
    state: string;
    prompt?: string;
  } = {
    access_type: "offline",
    include_granted_scopes: true,
    response_type: "code",
    scope: opts.scopes,
    state,
  };
  if (opts.forceConsent ?? false) {
    generateOptions.prompt = "consent";
  }

  const authUrl = oauth.generateAuthUrl(generateOptions);

  // Notify the caller of the auth URL so it can be displayed before we block.
  opts.onAuthUrl?.(authUrl);

  // Wait for the OAuth callback or timeout.
  const callbackCode = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error("timed out waiting for OAuth callback"));
    }, timeoutMs);

    server.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
      const reqUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

      if (reqUrl.pathname !== "/oauth2/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const callbackState = reqUrl.searchParams.get("state") ?? "";
      if (callbackState !== state) {
        clearTimeout(timer);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("OAuth state mismatch");
        server.close();
        reject(new Error("OAuth state mismatch"));
        return;
      }

      const code = reqUrl.searchParams.get("code") ?? "";
      if (code === "") {
        clearTimeout(timer);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("No authorization code in callback");
        server.close();
        reject(new Error("no authorization code in callback"));
        return;
      }

      clearTimeout(timer);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Authorization received. You can close this tab.");
      server.close();
      resolve(code);
    });
  });

  const request: ExchangeCodeRequest = {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    scopes: opts.scopes,
    code: callbackCode,
    redirectUri,
    forceConsent: opts.forceConsent ?? false,
    state,
  };

  const token = await exchangeCode(request);
  const refreshToken = token.refreshToken?.trim() ?? "";
  if (refreshToken === "") {
    throw new Error(ERR_NO_REFRESH_TOKEN);
  }

  return { refreshToken, authUrl };
}
