import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatTaskList, registerTasksCommands } from "../../../src/cmd/tasks/commands.js";

describe("tasks command formatters", () => {
  it("formats tasks list as json", () => {
    const out = formatTaskList([{ id: "t1", title: "Buy milk", done: false }], "json");
    const parsed = JSON.parse(out) as { tasks: Array<{ id: string }> };
    expect(parsed.tasks[0]?.id).toBe("t1");
  });

  it("registers list and add subcommands", () => {
    const tasks = new Command("tasks");
    registerTasksCommands(tasks);
    const names = tasks.commands.map((cmd) => cmd.name());
    expect(names).toContain("list");
    expect(names).toContain("add");
    expect(names).toContain("update");
    expect(names).toContain("done");
  });

  it("prints stable message when add is not applied", async () => {
    const root = new Command();
    const tasks = root.command("tasks");
    registerTasksCommands(tasks, {
      addTask: async () => ({ id: "", added: false }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "tasks", "add", "--title", "Buy milk"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Task add was not applied");
    expect(stdout).not.toContain("not implemented yet in TypeScript port");
  });

  it("executes update and done actions", async () => {
    let updated = false;
    let completed = false;
    const root = new Command();
    const tasks = root.command("tasks");
    registerTasksCommands(tasks, {
      updateTask: async (id, input) => {
        updated = true;
        expect(id).toBe("t1");
        expect(input.title).toBe("Updated");
        return { id, updated: true };
      },
      completeTask: async (id) => {
        completed = true;
        expect(id).toBe("t1");
        return { id, done: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "tasks", "update", "--id", "t1", "--title", "Updated"]);
      await root.parseAsync(["node", "typee", "tasks", "done", "--id", "t1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(updated).toBe(true);
    expect(completed).toBe(true);
  });
});
