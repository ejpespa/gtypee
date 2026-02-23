import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
};

export type TasksCommandDeps = {
  listTasks?: (listId?: string) => Promise<TaskItem[]>;
  addTask?: (title: string, listId?: string) => Promise<{ id: string; added: boolean }>;
  updateTask?: (id: string, input: { title?: string; listId?: string }) => Promise<{ id: string; updated: boolean }>;
  completeTask?: (id: string, listId?: string) => Promise<{ id: string; done: boolean }>;
};

const defaultDeps: Required<TasksCommandDeps> = {
  listTasks: async () => [],
  addTask: async () => ({ id: "", added: false }),
  updateTask: async (id) => ({ id, updated: false }),
  completeTask: async (id) => ({ id, done: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatTaskList(tasks: TaskItem[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ tasks }, null, 2);
  }
  if (tasks.length === 0) {
    return "No tasks found";
  }
  const lines = ["ID\tDONE\tTITLE"];
  for (const task of tasks) {
    lines.push(`${task.id}\t${task.done ? "yes" : "no"}\t${task.title}`);
  }
  return lines.join("\n");
}

export function registerTasksCommands(tasksCommand: Command, deps: TasksCommandDeps = {}): void {
  const resolvedDeps: Required<TasksCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  tasksCommand
    .command("list")
    .description("List tasks")
    .option("--list <listId>", "Task list id")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ list?: string }>();
      const tasks = await runWithStableApiError("tasks", () => resolvedDeps.listTasks(opts.list));
      process.stdout.write(`${formatTaskList(tasks, ctx.output.mode)}\n`);
    });

  tasksCommand
    .command("add")
    .description("Add task")
    .requiredOption("--title <title>", "Task title")
    .option("--list <listId>", "Task list id")
    .action(async function actionAdd(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string; list?: string }>();
      const result = await runWithStableApiError("tasks", () => resolvedDeps.addTask(opts.title, opts.list));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.added ? `Task added (${result.id})\n` : "Task add was not applied\n");
    });

  tasksCommand
    .command("update")
    .description("Update task")
    .requiredOption("--id <id>", "Task id")
    .option("--title <title>", "Task title")
    .option("--list <listId>", "Task list id")
    .action(async function actionUpdate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; title?: string; list?: string }>();
      const input: { title?: string; listId?: string } = {};
      if (opts.title !== undefined) {
        input.title = opts.title;
      }
      if (opts.list !== undefined) {
        input.listId = opts.list;
      }
      const result = await runWithStableApiError("tasks", () => resolvedDeps.updateTask(opts.id, input));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.updated ? `Task updated (${result.id})\n` : "Task update was not applied\n");
    });

  tasksCommand
    .command("done")
    .description("Mark task done")
    .requiredOption("--id <id>", "Task id")
    .option("--list <listId>", "Task list id")
    .action(async function actionDone(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; list?: string }>();
      const result = await runWithStableApiError("tasks", () => resolvedDeps.completeTask(opts.id, opts.list));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.done ? `Task completed (${result.id})\n` : "Task completion was not applied\n");
    });
}
