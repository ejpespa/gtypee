import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { normalizeCalendarResponse, type CalendarResponse } from "../../googleapi/calendar.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export type CalendarEventSummary = {
  id: string;
  summary: string;
  start: string;
};

export type CalendarCreateResult = {
  id: string;
  created: boolean;
};

export type CalendarUpdateInput = {
  id: string;
  summary?: string;
  start?: string;
  end?: string;
};

export type CalendarUpdateResult = {
  id: string;
  updated: boolean;
};

export type CalendarRespondInput = {
  id: string;
  response: CalendarResponse;
};

export type CalendarRespondResult = {
  id: string;
  response: CalendarResponse;
  applied: boolean;
};

export type CalendarConflict = {
  firstId: string;
  secondId: string;
  overlapStart: string;
  overlapEnd: string;
};

export type CalendarCommandDeps = {
  listEvents?: (query: { from?: string; to?: string }, options?: PaginationOptions) => Promise<PaginatedResult<CalendarEventSummary>>;
  createEvent?: (input: { summary: string; start: string; end: string }) => Promise<CalendarCreateResult>;
  updateEvent?: (input: CalendarUpdateInput) => Promise<CalendarUpdateResult>;
  respondEvent?: (input: CalendarRespondInput) => Promise<CalendarRespondResult>;
  listConflicts?: (query: { from?: string; to?: string }) => Promise<CalendarConflict[]>;
};

const defaultDeps: Required<CalendarCommandDeps> = {
  listEvents: async () => ({ items: [] }),
  createEvent: async () => ({ id: "", created: false }),
  updateEvent: async (input) => ({ id: input.id, updated: false }),
  respondEvent: async (input) => ({ id: input.id, response: input.response, applied: false }),
  listConflicts: async () => [],
};

export function formatCalendarConflicts(conflicts: CalendarConflict[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ conflicts }, null, 2);
  }

  if (conflicts.length === 0) {
    return "No conflicts found";
  }

  const lines = ["FIRST\tSECOND\tOVERLAP_START\tOVERLAP_END"];
  for (const conflict of conflicts) {
    lines.push(`${conflict.firstId}\t${conflict.secondId}\t${conflict.overlapStart}\t${conflict.overlapEnd}`);
  }
  return lines.join("\n");
}

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatCalendarEvents(result: PaginatedResult<CalendarEventSummary>, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (result.items.length === 0) {
    return "No events found";
  }

  const lines = ["ID\tSTART\tSUMMARY"];
  for (const event of result.items) {
    lines.push(`${event.id}\t${event.start}\t${event.summary}`);
  }
  if (result.nextPageToken) {
    lines.push("---");
    lines.push(`Next page token: ${result.nextPageToken}`);
  }
  return lines.join("\n");
}

export function registerCalendarCommands(calendarCommand: Command, deps: CalendarCommandDeps = {}): void {
  const resolvedDeps: Required<CalendarCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  calendarCommand
    .command("events")
    .aliases(["ls", "list"])
    .description("List calendar events")
    .option("--from <datetime>", "Start of search window")
    .option("--to <datetime>", "End of search window")
    .option("--page-size <number>", "Number of events per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionEvents(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ from?: string; to?: string; pageSize?: number; pageToken?: string }>();
      const query: { from?: string; to?: string } = {};
      if (opts.from !== undefined) {
        query.from = opts.from;
      }
      if (opts.to !== undefined) {
        query.to = opts.to;
      }

      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;

      const result = await runWithStableApiError("calendar", () => resolvedDeps.listEvents(query, paginationOpts));
      process.stdout.write(`${formatCalendarEvents(result, ctx.output.mode)}\n`);
    });

  calendarCommand
    .command("create")
    .description("Create calendar event")
    .requiredOption("--summary <summary>", "Event summary")
    .requiredOption("--start <datetime>", "Start datetime")
    .requiredOption("--end <datetime>", "End datetime")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ summary: string; start: string; end: string }>();
      const result = await runWithStableApiError("calendar", () =>
        resolvedDeps.createEvent({
          summary: opts.summary,
          start: opts.start,
          end: opts.end,
        }),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.created ? `Event created (id=${result.id || "unknown"})\n` : "Event was not created\n");
    });

  calendarCommand
    .command("update")
    .description("Update a calendar event")
    .requiredOption("--id <id>", "Event id")
    .option("--summary <summary>", "Event summary")
    .option("--start <datetime>", "Start datetime")
    .option("--end <datetime>", "End datetime")
    .action(async function actionUpdate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; summary?: string; start?: string; end?: string }>();
      const input: CalendarUpdateInput = {
        id: opts.id,
      };
      if (opts.summary !== undefined) {
        input.summary = opts.summary;
      }
      if (opts.start !== undefined) {
        input.start = opts.start;
      }
      if (opts.end !== undefined) {
        input.end = opts.end;
      }

      const result = await runWithStableApiError("calendar", () =>
        resolvedDeps.updateEvent(input),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.updated ? `Event updated (id=${result.id || "unknown"})\n` : "Event was not updated\n");
    });

  calendarCommand
    .command("respond")
    .description("Respond to a calendar event")
    .requiredOption("--id <id>", "Event id")
    .requiredOption("--response <response>", "accepted|declined|tentative|needsAction")
    .action(async function actionRespond(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; response: string }>();
      const response = normalizeCalendarResponse(opts.response);
      const result = await runWithStableApiError("calendar", () =>
        resolvedDeps.respondEvent({
          id: opts.id,
          response,
        }),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Response recorded (${result.response})\n` : "Response was not applied\n");
    });

  calendarCommand
    .command("conflicts")
    .description("List overlapping events")
    .option("--from <datetime>", "Start of search window")
    .option("--to <datetime>", "End of search window")
    .action(async function actionConflicts(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ from?: string; to?: string }>();
      const query: { from?: string; to?: string } = {};
      if (opts.from !== undefined) {
        query.from = opts.from;
      }
      if (opts.to !== undefined) {
        query.to = opts.to;
      }

      const conflicts = await runWithStableApiError("calendar", () => resolvedDeps.listConflicts(query));
      process.stdout.write(`${formatCalendarConflicts(conflicts, ctx.output.mode)}\n`);
    });
}
