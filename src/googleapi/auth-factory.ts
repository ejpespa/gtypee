import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

import { readClientCredentialsFor, type ClientCredentials } from "../config/credentials.js";
import { resolveClientWithOverride } from "../authclient/authclient.js";
import { KeyringStore, EncryptedFileBackend } from "../secrets/store.js";
import { AuthRequiredError } from "./errors.js";
import { credentialsEncPath } from "../config/paths.js";

export type ServiceAccountKeyData = {
  type: string;
  client_email: string;
  private_key: string;
  project_id?: string;
};

export type AuthFactoryOptions = {
  store?: KeyringStore | undefined;
  readCredentials?: ((client: string) => Promise<ClientCredentials>) | undefined;
  readServiceAccountKey?: ((email: string) => Promise<ServiceAccountKeyData>) | undefined;
  scopes?: string[] | undefined;
};

export type AccountResolver = () => Promise<{
  email: string;
  clientOverride: string;
  serviceAccount?: string | undefined;
  impersonate?: string | undefined;
}>;

/**
 * Creates an authenticated client from stored credentials.
 *
 * Two paths:
 * - Service Account (JWT): When resolver returns serviceAccount, uses google.auth.JWT
 *   with optional domain-wide delegation (impersonate → subject).
 * - OAuth2: When no serviceAccount, uses stored refresh tokens + client credentials.
 */
export async function createAuthenticatedClient(
  resolveAccount: AccountResolver,
  options: AuthFactoryOptions = {},
): Promise<OAuth2Client> {
  const store = options.store ?? new KeyringStore(new EncryptedFileBackend(credentialsEncPath()));
  const readCreds = options.readCredentials ?? readClientCredentialsFor;

  const resolved = await resolveAccount();
  const { email, clientOverride } = resolved;
  const sa = resolved.serviceAccount ?? "";
  const impersonate = resolved.impersonate ?? "";

  if (email === "" && sa === "") {
    throw new AuthRequiredError("api", "", "", new Error("no account specified; use --account <email> or --sa <email> or log in first"));
  }

  // Service Account (JWT) path
  if (sa !== "") {
    let saKeyJson: string | undefined;
    if (options.readServiceAccountKey) {
      const saKey = await options.readServiceAccountKey(sa);
      saKeyJson = JSON.stringify(saKey);
    } else {
      saKeyJson = await store.getServiceAccountKey(sa);
    }

    if (!saKeyJson) {
      throw new Error(`no service account key found for ${sa}; run: typee auth add-sa --key-file <key.json>`);
    }

    const saKey = JSON.parse(saKeyJson) as ServiceAccountKeyData;
    if (saKey.type !== "service_account") {
      throw new Error(`key for ${sa} is not a service account key`);
    }

    const scopes = options.scopes ?? [];
    const jwtOptions: { email: string; key: string; scopes: string[]; subject?: string } = {
      email: saKey.client_email,
      key: saKey.private_key,
      scopes,
    };
    if (impersonate !== "") {
      jwtOptions.subject = impersonate;
    }
    const jwtClient = new google.auth.JWT(jwtOptions);

    return jwtClient as unknown as OAuth2Client;
  }

  // OAuth2 path
  const client = await resolveClientWithOverride(email, clientOverride);
  const credentials = await readCreds(client);

  let token;
  try {
    token = await store.getToken(client, email);
  } catch {
    throw new AuthRequiredError("api", email, client, new Error(`no token found for ${email}; run: typee login --email ${email}`));
  }

  const oauth2Client = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
  oauth2Client.setCredentials({ refresh_token: token.refreshToken });

  return oauth2Client;
}

/**
 * Creates a ServiceRuntime that lazily resolves auth when API calls are made.
 * The account resolver is called on each API call to pick up the current --account flag.
 */
export type ServiceRuntimeOptions = AuthFactoryOptions & {
  resolveAccount: AccountResolver;
};

export class ServiceRuntime {
  private readonly store: KeyringStore;
  private readonly readCredentials: (client: string) => Promise<ClientCredentials>;
  private readonly readServiceAccountKey?: ((email: string) => Promise<ServiceAccountKeyData>) | undefined;
  private readonly resolveAccount: AccountResolver;

  constructor(options: ServiceRuntimeOptions) {
    this.store = options.store ?? new KeyringStore(new EncryptedFileBackend(credentialsEncPath()));
    this.readCredentials = options.readCredentials ?? readClientCredentialsFor;
    this.readServiceAccountKey = options.readServiceAccountKey;
    this.resolveAccount = options.resolveAccount;
  }

  async getClient(scopes?: string[]): Promise<OAuth2Client> {
    return createAuthenticatedClient(this.resolveAccount, {
      store: this.store,
      readCredentials: this.readCredentials,
      readServiceAccountKey: this.readServiceAccountKey,
      scopes,
    });
  }
}
