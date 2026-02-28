import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export type SheetsSummary = {
  id: string;
  name: string;
  mimeType: string;
};

export type SheetsReadResult = {
  range: string;
  values: string[][];
};

export type SheetsCreateResult = {
  id: string;
  title: string;
};

export type SheetsExportResult = {
  id: string;
  format: string;
  path: string;
  exported: boolean;
};

export type SheetsCommandDeps = {
  listSheets?: (options?: PaginationOptions) => Promise<PaginatedResult<SheetsSummary>>;
  exportSheet?: (id: string, format: string, out?: string) => Promise<SheetsExportResult>;
  createSheet?: (title: string) => Promise<SheetsCreateResult>;
  readRange?: (sheetId: string, range: string) => Promise<SheetsReadResult>;
  updateRange?: (sheetId: string, range: string, values: string[][]) => Promise<{ updated: boolean }>;
};

const defaultDeps: Required<SheetsCommandDeps> = {
  listSheets: async () => ({ items: [] }),
  exportSheet: async (id, format, out) => ({ id, format, path: out ?? "", exported: false }),
  createSheet: async (title) => ({ id: "", title: title! }),
  readRange: async (_id, range) => ({ range, values: [] }),
  updateRange: async () => ({ updated: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatSheetsRead(result: SheetsReadResult, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  const rows = result.values.map((row) => row.join("\t"));
  return [`Range: ${result.range}`, ...rows].join("\n");
}

export function formatSheetsList(result: PaginatedResult<SheetsSummary>, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  if (result.items.length === 0) {
    return "No spreadsheets found";
  }
  const lines = ["ID\tNAME"];
  for (const sheet of result.items) {
    lines.push(`${sheet.id}\t${sheet.name}`);
  }
  if (result.nextPageToken) {
    lines.push("---");
    lines.push(`Next page token: ${result.nextPageToken}`);
  }
  return lines.join("\n");
}

function parseValues(raw: string): string[][] {
  if (raw.trim() === "") {
    return [];
  }
  return raw.split(";").map((row) => row.split(",").map((cell) => cell.trim()));
}

export function registerSheetsCommands(sheetsCommand: Command, deps: SheetsCommandDeps = {}): void {
  const resolvedDeps: Required<SheetsCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  // typee sheets list
  sheetsCommand
    .command("list")
    .alias("ls")
    .description("List all Google Sheets")
    .option("--page-size <number>", "Number of spreadsheets per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionListSheets(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: number; pageToken?: string }>();

      const paginationOpts: PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;

      const result = await runWithStableApiError("sheets", () =>
        resolvedDeps.listSheets(paginationOpts)
      );
      process.stdout.write(`${formatSheetsList(result, ctx.output.mode)}\n`);
    });

  sheetsCommand
    .command("create")
    .description("Create a new spreadsheet")
    .requiredOption("--title <title>", "Spreadsheet title")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string }>();
      const result = await runWithStableApiError("sheets", () => resolvedDeps.createSheet(opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`Created spreadsheet "${result.title}" (id=${result.id})\n`);
    });

  sheetsCommand
    .command("read")
    .description("Read sheet range")
    .requiredOption("--id <id>", "Sheet id")
    .requiredOption("--range <range>", "A1 range")
    .action(async function actionRead(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; range: string }>();
      const result = await runWithStableApiError("sheets", () => resolvedDeps.readRange(opts.id, opts.range));
      process.stdout.write(`${formatSheetsRead(result, ctx.output.mode)}\n`);
    });

  sheetsCommand
    .command("update")
    .description("Update sheet range")
    .requiredOption("--id <id>", "Sheet id")
    .requiredOption("--range <range>", "A1 range")
    .requiredOption("--values <values>", "Semicolon/comma matrix, e.g. a,b;c,d")
    .action(async function actionUpdate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; range: string; values: string }>();
      const result = await runWithStableApiError("sheets", () =>
        resolvedDeps.updateRange(opts.id, opts.range, parseValues(opts.values)),
      );
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.updated ? "Range updated\n" : "Range update was not applied\n");
    });
}
