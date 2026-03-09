import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type TimeNow = {
  timezone: string;
  currentTime: string;
  utcOffset: string;
  formatted: string;
};

export type TimeCommandDeps = {
  now?: (timezone?: string) => Promise<TimeNow>;
  timezone?: () => Promise<{ timezone: string }>;
};

function resolveSystemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatUtcOffsetForTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(now);

  const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  if (raw === "GMT" || raw === "UTC") {
    return "+00:00";
  }

  const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(raw);
  if (!match) {
    return "+00:00";
  }

  const sign = match[1] ?? "+";
  const hour = (match[2] ?? "0").padStart(2, "0");
  const minute = (match[3] ?? "00").padStart(2, "0");
  return `${sign}${hour}:${minute}`;
}

function defaultNowValue(timezone?: string): TimeNow {
  const tz = (timezone ?? "").trim() || resolveSystemTimezone();
  const now = new Date();

  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  return {
    timezone: tz,
    currentTime: now.toISOString(),
    utcOffset: formatUtcOffsetForTimezone(now, tz),
    formatted,
  };
}

const defaultDeps: Required<TimeCommandDeps> = {
  now: async (timezone?: string) => defaultNowValue(timezone),
  timezone: async () => ({ timezone: resolveSystemTimezone() }),
};

export function formatTimeNow(value: TimeNow, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(value, null, 2);
  }
  return [
    `timezone\t${value.timezone}`,
    `current_time\t${value.currentTime}`,
    `utc_offset\t${value.utcOffset}`,
    `formatted\t${value.formatted}`,
  ].join("\n");
}

export function registerTimeCommands(timeCommand: Command, deps: TimeCommandDeps = {}): void {
  const resolvedDeps: Required<TimeCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  timeCommand
    .command("now")
    .description("Show current time")
    .option("--timezone <timezone>", "Timezone (e.g., America/New_York, UTC)")
    .action(async function actionNow(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ timezone?: string }>();
      const current = await resolvedDeps.now(opts.timezone);
      process.stdout.write(`${formatTimeNow(current, ctx.output.mode)}\n`);
    });

  timeCommand
    .command("timezone")
    .description("Show current timezone")
    .action(async function actionTimezone(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const tz = await resolvedDeps.timezone();
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(tz, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${tz.timezone}\n`);
    });
}
