export const DEFAULT_HTTP_TIMEOUT_MS = 30_000;
export const DEFAULT_GMAIL_LIST_QUERY = "in:anywhere";

export type OAuthClientConfigInput = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  timeoutMs?: number;
};

export type OAuthClientConfig = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  timeoutMs: number;
};

export function buildOAuthClientConfig(input: OAuthClientConfigInput): OAuthClientConfig {
  return {
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    scopes: [...input.scopes],
    timeoutMs: input.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS,
  };
}

export function defaultGmailListQuery(query?: string): string {
  const trimmed = query?.trim() ?? "";
  if (trimmed === "") {
    return DEFAULT_GMAIL_LIST_QUERY;
  }
  return trimmed;
}
