import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type MeetSpace = {
  name: string;
  meetingUri: string;
  meetingCode: string;
};

export type MeetCommandDeps = {
  createSpace?: () => Promise<MeetSpace>;
  getSpace?: (spaceName: string) => Promise<MeetSpace>;
  endMeeting?: (spaceName: string) => Promise<{ ended: boolean }>;
};

const defaultDeps: Required<MeetCommandDeps> = {
  createSpace: async () => ({ name: "", meetingUri: "", meetingCode: "" }),
  getSpace: async () => ({ name: "", meetingUri: "", meetingCode: "" }),
  endMeeting: async () => ({ ended: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatMeetSpace(space: MeetSpace, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(space, null, 2);
  }
  return [
    `Name: ${space.name}`,
    `Meeting URI: ${space.meetingUri}`,
    `Meeting Code: ${space.meetingCode}`,
  ].join("\n");
}

export function registerMeetCommands(
  meetCommand: Command,
  deps: MeetCommandDeps = {},
): void {
  const resolvedDeps: Required<MeetCommandDeps> = { ...defaultDeps, ...deps };

  meetCommand
    .command("create")
    .description("Create a new meeting space")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("meet", () => resolvedDeps.createSpace());
      process.stdout.write(`${formatMeetSpace(result, ctx.output.mode)}\n`);
    });

  meetCommand
    .command("get")
    .description("Get meeting space details")
    .requiredOption("--space <spaceId>", "Meeting space name (e.g. spaces/abc123)")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ space: string }>();
      const result = await runWithStableApiError("meet", () => resolvedDeps.getSpace(opts.space));
      process.stdout.write(`${formatMeetSpace(result, ctx.output.mode)}\n`);
    });

  meetCommand
    .command("end")
    .description("End an active meeting")
    .requiredOption("--space <spaceId>", "Meeting space name (e.g. spaces/abc123)")
    .action(async function actionEnd(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ space: string }>();
      const result = await runWithStableApiError("meet", () => resolvedDeps.endMeeting(opts.space));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(result.ended ? "Meeting ended\n" : "Failed to end meeting\n");
      }
    });
}
