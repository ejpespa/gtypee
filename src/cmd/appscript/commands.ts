import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type AppScriptProject = {
  id: string;
  title: string;
};

export type AppScriptCommandDeps = {
  listProjects?: () => Promise<AppScriptProject[]>;
  getProject?: (scriptId: string) => Promise<AppScriptProject>;
  createProject?: (title: string) => Promise<AppScriptProject & { created: boolean }>;
  runFunction?: (
    scriptId: string,
    fn: string,
    input?: { params?: unknown[]; devMode?: boolean },
  ) => Promise<{ done: boolean; result?: unknown; error?: string }>;
};

const defaultDeps: Required<AppScriptCommandDeps> = {
  listProjects: async () => [],
  getProject: async (scriptId) => ({ id: scriptId, title: "" }),
  createProject: async (title) => ({ id: "", title, created: false }),
  runFunction: async () => ({ done: true }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

function parseParamsJson(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error: unknown) {
    throw new Error(`invalid --params JSON array: ${String(error)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("invalid --params JSON array: expected array");
  }
  return parsed;
}

export function formatAppScriptProjects(projects: AppScriptProject[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ projects }, null, 2);
  }
  if (projects.length === 0) {
    return "No projects found";
  }
  return projects.map((project) => `${project.id}\t${project.title}`).join("\n");
}

export function registerAppScriptCommands(appScriptCommand: Command, deps: AppScriptCommandDeps = {}): void {
  const resolvedDeps: Required<AppScriptCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  appScriptCommand
    .command("list")
    .description("List script projects")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const projects = await runWithStableApiError("appscript", () => resolvedDeps.listProjects());
      process.stdout.write(`${formatAppScriptProjects(projects, ctx.output.mode)}\n`);
    });

  appScriptCommand
    .command("get")
    .description("Get script project")
    .requiredOption("--id <id>", "Script id")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const project = await runWithStableApiError("appscript", () => resolvedDeps.getProject(opts.id));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(project, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${project.id}\t${project.title}\n`);
    });

  appScriptCommand
    .command("create")
    .description("Create script project")
    .requiredOption("--title <title>", "Project title")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string }>();
      const project = await runWithStableApiError("appscript", () => resolvedDeps.createProject(opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(project, null, 2)}\n`);
        return;
      }
      process.stdout.write(project.created ? `Project created (${project.id || "unknown"})\n` : "Project create was not applied\n");
    });

  appScriptCommand
    .command("run")
    .description("Run script function")
    .requiredOption("--id <id>", "Script id")
    .requiredOption("--fn <name>", "Function name")
    .option("--params <json>", "JSON array of function parameters", "[]")
    .option("--dev-mode", "Run latest saved code if you own the script", false)
    .action(async function actionRun(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; fn: string; params: string; devMode?: boolean }>();
      const params = parseParamsJson(opts.params);
      const result = await runWithStableApiError("appscript", () =>
        resolvedDeps.runFunction(opts.id, opts.fn, {
          params,
          devMode: opts.devMode ?? false,
        }),
      );
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`done\t${result.done}\n`);
      if ((result.error ?? "").trim() !== "") {
        process.stdout.write(`error\t${result.error}\n`);
      }
      if (result.result !== undefined) {
        process.stdout.write(`result\t${JSON.stringify(result.result)}\n`);
      }
    });
}
