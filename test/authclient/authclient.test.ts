import { describe, expect, it } from "vitest";

import { clientOverrideFromContext, resolveClientWithOverride, withClient } from "../../src/authclient/authclient.js";

describe("authclient", () => {
  it("stores and reads client override in context", () => {
    const ctx = withClient({}, "team");
    expect(clientOverrideFromContext(ctx)).toBe("team");
    expect(clientOverrideFromContext({})).toBe("");
  });

  it("resolves client from override", async () => {
    const client = await resolveClientWithOverride(
      "a@b.com",
      "prod",
      async () => ({ accountClients: {}, clientDomains: {} }),
      async () => false,
    );
    expect(client).toBe("prod");
  });
});
