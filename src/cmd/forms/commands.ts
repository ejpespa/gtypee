import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type FormInfo = {
  id: string;
  title: string;
};

export type FormsCommandDeps = {
  createForm?: (title: string) => Promise<FormInfo & { created: boolean }>;
  getForm?: (id: string) => Promise<FormInfo>;
  listResponses?: (id: string) => Promise<Array<{ id: string; submittedAt: string }>>;
};

const defaultDeps: Required<FormsCommandDeps> = {
  createForm: async (title) => ({ id: "", title, created: false }),
  getForm: async (id) => ({ id, title: "" }),
  listResponses: async () => [],
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatFormGet(form: FormInfo, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(form, null, 2);
  }
  return `Form ${form.id}: ${form.title}`;
}

export function registerFormsCommands(formsCommand: Command, deps: FormsCommandDeps = {}): void {
  const resolvedDeps: Required<FormsCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  formsCommand
    .command("create")
    .description("Create a form")
    .requiredOption("--title <title>", "Form title")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string }>();
      const form = await runWithStableApiError("forms", () => resolvedDeps.createForm(opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(form, null, 2)}\n`);
        return;
      }

      process.stdout.write(form.created ? `Form created (${form.id || "unknown"})\n` : "Form create was not applied\n");
    });

  formsCommand
    .command("get")
    .description("Get form metadata")
    .requiredOption("--id <id>", "Form id")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const form = await runWithStableApiError("forms", () => resolvedDeps.getForm(opts.id));
      process.stdout.write(`${formatFormGet(form, ctx.output.mode)}\n`);
    });

  formsCommand
    .command("responses")
    .description("List form responses")
    .requiredOption("--id <id>", "Form id")
    .action(async function actionResponses(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const responses = await runWithStableApiError("forms", () => resolvedDeps.listResponses(opts.id));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ responses }, null, 2)}\n`);
        return;
      }
      if (responses.length === 0) {
        process.stdout.write("No responses found\n");
        return;
      }
      process.stdout.write(responses.map((r) => `${r.id}\t${r.submittedAt}`).join("\n") + "\n");
    });
}
