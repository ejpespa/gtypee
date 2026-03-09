import { describe, expect, it } from "vitest";

import { buildExecutionContext } from "../../src/cmd/execution-context.js";

describe("buildExecutionContext", () => {
  it("builds context from root options", () => {
    const ctx = buildExecutionContext({
      account: "a@b.com",
      client: "team",
      json: true,
      plain: false,
      color: "auto",
      verbose: true,
      select: "id,title",
      resultsOnly: true,
      dryRun: true,
      force: true,
      noInput: false,
      enableCommands: "gmail,drive",
    });

    expect(ctx.account).toBe("a@b.com");
    expect(ctx.output.mode).toBe("json");
    expect(ctx.output.transform.resultsOnly).toBe(true);
    expect(ctx.output.transform.select).toEqual(["id", "title"]);
    expect(ctx.clientOverride).toBe("team");
    expect(ctx.dryRun).toBe(true);
    expect(ctx.force).toBe(true);
    expect(ctx.enableCommands).toEqual(["gmail", "drive"]);
  });
});
