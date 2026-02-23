import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatTimeNow, registerTimeCommands } from "../../../src/cmd/time/commands.js";

describe("time command formatters", () => {
  it("formats time now as json", () => {
    const out = formatTimeNow(
      {
        timezone: "UTC",
        currentTime: "2026-02-20T00:00:00.000Z",
        utcOffset: "+00:00",
        formatted: "Friday, February 20, 2026 12:00 AM",
      },
      "json",
    );
    const parsed = JSON.parse(out) as { timezone: string; utcOffset: string };
    expect(parsed.timezone).toBe("UTC");
    expect(parsed.utcOffset).toBe("+00:00");
  });

  it("registers now and timezone subcommands", () => {
    const time = new Command("time");
    registerTimeCommands(time);
    const names = time.commands.map((cmd) => cmd.name());
    expect(names).toContain("now");
    expect(names).toContain("timezone");
  });

  it("forwards timezone flag to now deps", async () => {
    let seenTimezone = "";
    const root = new Command();
    const time = root.command("time");
    registerTimeCommands(time, {
      now: async (timezone) => {
        seenTimezone = timezone ?? "";
        return {
          timezone: timezone || "UTC",
          currentTime: "2026-02-20T00:00:00.000Z",
          utcOffset: "+00:00",
          formatted: "Friday, February 20, 2026 12:00 AM",
        };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "time", "now", "--timezone", "UTC"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(seenTimezone).toBe("UTC");
  });
});
