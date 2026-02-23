import { describe, expect, it } from "vitest";

import { authUrlParams, authorize, manualAuthURL, randomState, validateAuthorizeOptions } from "../../src/googleauth/oauth-flow.js";

describe("oauth-flow helpers", () => {
  it("builds auth params with offline and include_granted_scopes", () => {
    const params = authUrlParams(false);
    expect(params.access_type).toBe("offline");
    expect(params.include_granted_scopes).toBe("true");
    expect(params.prompt).toBeUndefined();
  });

  it("adds prompt=consent when forceConsent is true", () => {
    const params = authUrlParams(true);
    expect(params.prompt).toBe("consent");
  });

  it("validates authorize options", () => {
    expect(() =>
      validateAuthorizeOptions({
        scopes: ["scope"],
        authCode: "x",
        authUrl: "https://example.com/callback",
      }),
    ).toThrow("cannot combine auth-url with auth-code");
  });

  it("generates random state", () => {
    const state = randomState();
    expect(state.length).toBeGreaterThan(20);
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("exchanges auth-url code and returns refresh token", async () => {
    let seenCode = "";
    let seenRedirectUri = "";

    await expect(
      authorize(
        {
          scopes: ["scope-a"],
          authUrl: "http://127.0.0.1:3412/oauth2/callback?code=abc123&state=s1",
          requireState: true,
          client: "team",
        },
        {
          readClientCredentialsFor: async (client) => {
            expect(client).toBe("team");
            return { clientId: "id", clientSecret: "secret" };
          },
          exchangeCode: async (request) => {
            seenCode = request.code;
            seenRedirectUri = request.redirectUri;
            return { refreshToken: "rt-1" };
          },
        },
      ),
    ).resolves.toBe("rt-1");

    expect(seenCode).toBe("abc123");
    expect(seenRedirectUri).toBe("http://127.0.0.1:3412/oauth2/callback");
  });

  it("errors when state is required but missing from auth-url", async () => {
    await expect(
      authorize(
        {
          scopes: ["scope-a"],
          authUrl: "http://127.0.0.1:3412/oauth2/callback?code=abc123",
          requireState: true,
        },
        {
          readClientCredentialsFor: async () => ({ clientId: "id", clientSecret: "secret" }),
          exchangeCode: async () => ({ refreshToken: "rt-1" }),
        },
      ),
    ).rejects.toThrow("missing state in redirect URL");
  });

  it("builds manual auth URL for remote step 1", async () => {
    const result = await manualAuthURL(
      {
        scopes: ["scope-a", "scope-b"],
        forceConsent: true,
        client: "team",
      },
      {
        readClientCredentialsFor: async (client) => {
          expect(client).toBe("team");
          return { clientId: "id", clientSecret: "secret" };
        },
        randomState: () => "state-1",
        randomRedirectUri: async () => "http://127.0.0.1:3412/oauth2/callback",
      },
    );

    expect(result.stateReused).toBe(false);

    const url = new URL(result.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("scope-a scope-b");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("client_id")).toBe("id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3412/oauth2/callback");
  });
});
