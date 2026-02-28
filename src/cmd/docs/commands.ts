import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export type DocsSummary = {
  id: string;
  name: string;
  mimeType: string;
};

export type DocsReadResult = {
  id: string;
  title: string;
  markdown: string;
};

export type DocsWriteResult = {
  id: string;
  updated: boolean;
};

export type DocsCreateResult = {
  id: string;
  title: string;
};

export type DocsCommandDeps = {
  listDocs?: (options?: PaginationOptions) => Promise<PaginatedResult<DocsSummary>>;
  createDoc?: (title: string) => Promise<DocsCreateResult>;
  readDoc?: (id: string) => Promise<DocsReadResult>;
  toMarkdown?: (id: string) => Promise<DocsReadResult>;
  writeDoc?: (id: string, markdown: string) => Promise<DocsWriteResult>;
};

const defaultDeps: Required<DocsCommandDeps> = {
  listDocs: async () => ({ items: [] }),
  createDoc: async (title) => ({ id: "", title }),
  readDoc: async (id) => ({ id, title: "", markdown: "" }),
  toMarkdown: async (id) => ({ id, title: "", markdown: "" }),
  writeDoc: async (id) => ({ id, updated: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatDocsList(result: PaginatedResult<DocsSummary>, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  if (result.items.length === 0) {
    return "No documents found";
  }
  const lines = ["ID\tNAME"];
  for (const doc of result.items) {
    lines.push(`${doc.id}\t${doc.name}`);
  }
  if (result.nextPageToken) {
    lines.push("---");
    lines.push(`Next page token: ${result.nextPageToken}`);
  }
  return lines.join("\n");
}

export function formatDocsReadResult(result: DocsReadResult, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  return [`ID: ${result.id}`, `Title: ${result.title}`, "", result.markdown].join("\n");
}

export function registerDocsCommands(docsCommand: Command, deps: DocsCommandDeps = {}): void {
  const resolvedDeps: Required<DocsCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  // typee docs list
  docsCommand
    .command("list")
    .alias("ls")
    .description("List all Google Docs")
    .option("--page-size <number>", "Number of documents per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionListDocs(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: number; pageToken?: string }>();

      const paginationOpts: PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;

      const result = await runWithStableApiError("docs", () =>
        resolvedDeps.listDocs(paginationOpts)
      );
      process.stdout.write(`${formatDocsList(result, ctx.output.mode)}\n`);
    });

  docsCommand
    .command("create")
    .description("Create a new document")
    .requiredOption("--title <title>", "Document title")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string }>();
      const result = await runWithStableApiError("docs", () => resolvedDeps.createDoc(opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`Created document "${result.title}" (id=${result.id})\n`);
    });

  docsCommand
    .command("read")
    .description("Read document")
    .requiredOption("--id <id>", "Document id")
    .action(async function actionRead(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const result = await runWithStableApiError("docs", () => resolvedDeps.readDoc(opts.id));
      process.stdout.write(`${formatDocsReadResult(result, ctx.output.mode)}\n`);
    });

  docsCommand
    .command("markdown")
    .description("Export document as markdown")
    .requiredOption("--id <id>", "Document id")
    .action(async function actionMarkdown(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const result = await runWithStableApiError("docs", () => resolvedDeps.toMarkdown(opts.id));
      process.stdout.write(`${formatDocsReadResult(result, ctx.output.mode)}\n`);
    });

  docsCommand
    .command("write")
    .description("Update document markdown")
    .requiredOption("--id <id>", "Document id")
    .requiredOption("--markdown <markdown>", "Markdown content")
    .action(async function actionWrite(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; markdown: string }>();
      const result = await runWithStableApiError("docs", () => resolvedDeps.writeDoc(opts.id, opts.markdown));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.updated ? `Document updated (id=${result.id || "unknown"})\n` : "Document update was not applied\n");
    });
}
