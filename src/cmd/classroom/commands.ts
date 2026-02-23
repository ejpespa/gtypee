import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type ClassroomCourse = {
  id: string;
  name: string;
};

export type ClassroomCommandDeps = {
  ensureWorkspace?: () => Promise<void>;
  listCourses?: () => Promise<ClassroomCourse[]>;
  getCourse?: (courseId: string) => Promise<ClassroomCourse>;
  createCourse?: (name: string) => Promise<{ id: string; created: boolean }>;
  listSubmissions?: (courseId: string) => Promise<Array<{ id: string; state: string }>>;
};

const defaultDeps: Required<ClassroomCommandDeps> = {
  ensureWorkspace: async () => undefined,
  listCourses: async () => [],
  getCourse: async (courseId) => ({ id: courseId, name: "" }),
  createCourse: async () => ({ id: "", created: false }),
  listSubmissions: async () => [],
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatClassroomCourses(courses: ClassroomCourse[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ courses }, null, 2);
  }
  if (courses.length === 0) {
    return "No courses found";
  }
  return courses.map((course) => `${course.id}\t${course.name}`).join("\n");
}

export function registerClassroomCommands(classroomCommand: Command, deps: ClassroomCommandDeps = {}): void {
  const resolvedDeps: Required<ClassroomCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  classroomCommand
    .command("courses")
    .description("List courses")
    .action(async function actionCourses(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      await resolvedDeps.ensureWorkspace();
      const courses = await runWithStableApiError("classroom", () => resolvedDeps.listCourses());
      process.stdout.write(`${formatClassroomCourses(courses, ctx.output.mode)}\n`);
    });

  classroomCommand
    .command("get-course")
    .description("Get course")
    .requiredOption("--course <courseId>", "Course id")
    .action(async function actionGetCourse(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ course: string }>();
      await resolvedDeps.ensureWorkspace();
      const course = await runWithStableApiError("classroom", () => resolvedDeps.getCourse(opts.course));
      process.stdout.write(`${formatClassroomCourses([course], ctx.output.mode)}\n`);
    });

  classroomCommand
    .command("create-course")
    .description("Create course")
    .requiredOption("--name <name>", "Course name")
    .action(async function actionCreateCourse(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string }>();
      await resolvedDeps.ensureWorkspace();
      const result = await runWithStableApiError("classroom", () => resolvedDeps.createCourse(opts.name));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.created ? `Course created (${result.id || "unknown"})\n` : "Course create was not applied\n");
    });

  classroomCommand
    .command("submissions")
    .description("List submissions for a course")
    .requiredOption("--course <courseId>", "Course id")
    .action(async function actionSubmissions(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ course: string }>();
      await resolvedDeps.ensureWorkspace();
      const submissions = await runWithStableApiError("classroom", () => resolvedDeps.listSubmissions(opts.course));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ submissions }, null, 2)}\n`);
        return;
      }
      if (submissions.length === 0) {
        process.stdout.write("No submissions found\n");
        return;
      }
      process.stdout.write(submissions.map((s) => `${s.id}\t${s.state}`).join("\n") + "\n");
    });
}
