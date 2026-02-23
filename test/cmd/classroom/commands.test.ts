import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatClassroomCourses, registerClassroomCommands } from "../../../src/cmd/classroom/commands.js";

describe("classroom command formatters", () => {
  it("formats courses as json", () => {
    const out = formatClassroomCourses([{ id: "c1", name: "Math" }], "json");
    const parsed = JSON.parse(out) as { courses: Array<{ id: string }> };
    expect(parsed.courses[0]?.id).toBe("c1");
  });

  it("registers courses and submissions subcommands", () => {
    const classroom = new Command("classroom");
    registerClassroomCommands(classroom);
    const names = classroom.commands.map((cmd) => cmd.name());
    expect(names).toContain("courses");
    expect(names).toContain("submissions");
    expect(names).toContain("get-course");
    expect(names).toContain("create-course");
  });

  it("supports create/get course flows", async () => {
    let created = false;
    let fetched = false;
    const root = new Command();
    const classroom = root.command("classroom");
    registerClassroomCommands(classroom, {
      createCourse: async (name) => {
        created = true;
        expect(name).toBe("Math");
        return { id: "c1", created: true };
      },
      getCourse: async (id) => {
        fetched = true;
        return { id, name: "Math" };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "classroom", "create-course", "--name", "Math"]);
      await root.parseAsync(["node", "typee", "classroom", "get-course", "--course", "c1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(created).toBe(true);
    expect(fetched).toBe(true);
  });

  it("returns clear workspace-required error", async () => {
    const root = new Command();
    const classroom = root.command("classroom");
    registerClassroomCommands(classroom, {
      ensureWorkspace: async () => {
        throw new Error("workspace account required for classroom");
      },
    });

    await expect(root.parseAsync(["node", "typee", "classroom", "courses"])).rejects.toThrow(
      "workspace account required for classroom",
    );
  });
});
