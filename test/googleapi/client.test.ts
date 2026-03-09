import { describe, expect, it } from "vitest";

import { DEFAULT_HTTP_TIMEOUT_MS, buildOAuthClientConfig } from "../../src/googleapi/client.js";

describe("googleapi client helpers", () => {
  it("builds oauth client config", () => {
    const cfg = buildOAuthClientConfig({
      clientId: "cid",
      clientSecret: "sec",
      scopes: ["s1", "s2"],
    });

    expect(cfg.clientId).toBe("cid");
    expect(cfg.clientSecret).toBe("sec");
    expect(cfg.scopes).toEqual(["s1", "s2"]);
    expect(cfg.timeoutMs).toBe(DEFAULT_HTTP_TIMEOUT_MS);
  });
});
