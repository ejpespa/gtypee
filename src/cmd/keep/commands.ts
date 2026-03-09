import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type KeepNote = {
  id: string;
  title: string;
};

export type KeepCommandDeps = {
  ensureWorkspace?: () => Promise<void>;
  listNotes?: () => Promise<KeepNote[]>;
  getNote?: (id: string) => Promise<KeepNote>;
  searchNotes?: (query: string) => Promise<KeepNote[]>;
  createNote?: (title: string) => Promise<{ id: string; created: boolean }>;
  updateNote?: (id: string, title: string) => Promise<{ id: string; updated: boolean }>;
};

function noteMatchesQuery(note: KeepNote, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  return note.id.toLowerCase().includes(needle) || note.title.toLowerCase().includes(needle);
}

const defaultDeps: Required<KeepCommandDeps> = {
  ensureWorkspace: async () => undefined,
  listNotes: async () => [],
  getNote: async (id) => ({ id, title: "" }),
  searchNotes: async (query) => {
    const notes = await defaultDeps.listNotes();
    return notes.filter((note) => noteMatchesQuery(note, query));
  },
  createNote: async () => ({ id: "", created: false }),
  updateNote: async (id) => ({ id, updated: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatKeepNotes(notes: KeepNote[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ notes }, null, 2);
  }
  if (notes.length === 0) {
    return "No notes found";
  }
  return notes.map((note) => `${note.id}\t${note.title}`).join("\n");
}

export function registerKeepCommands(keepCommand: Command, deps: KeepCommandDeps = {}): void {
  const resolvedDeps: Required<KeepCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  keepCommand
    .command("list")
    .description("List keep notes")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      await resolvedDeps.ensureWorkspace();
      const notes = await runWithStableApiError("keep", () => resolvedDeps.listNotes());
      process.stdout.write(`${formatKeepNotes(notes, ctx.output.mode)}\n`);
    });

  keepCommand
    .command("get")
    .description("Get a note")
    .requiredOption("--id <id>", "Note id")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      await resolvedDeps.ensureWorkspace();
      const note = await runWithStableApiError("keep", () => resolvedDeps.getNote(opts.id));
      process.stdout.write(`${formatKeepNotes([note], ctx.output.mode)}\n`);
    });

  keepCommand
    .command("search")
    .description("Search notes by text")
    .requiredOption("--query <query>", "Search query")
    .action(async function actionSearch(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query: string }>();
      await resolvedDeps.ensureWorkspace();
      const notes = await runWithStableApiError("keep", () => resolvedDeps.searchNotes(opts.query));
      process.stdout.write(`${formatKeepNotes(notes, ctx.output.mode)}\n`);
    });

  keepCommand
    .command("create")
    .description("Create note")
    .requiredOption("--title <title>", "Note title")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string }>();
      await resolvedDeps.ensureWorkspace();
      const result = await runWithStableApiError("keep", () => resolvedDeps.createNote(opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.created ? `Note created (${result.id || "unknown"})\n` : "Note create was not applied\n");
    });

  keepCommand
    .command("update")
    .description("Update note")
    .requiredOption("--id <id>", "Note id")
    .requiredOption("--title <title>", "Note title")
    .action(async function actionUpdate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; title: string }>();
      await resolvedDeps.ensureWorkspace();
      const result = await runWithStableApiError("keep", () => resolvedDeps.updateNote(opts.id, opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.updated ? `Note updated (${result.id || "unknown"})\n` : "Note update was not applied\n");
    });
}
