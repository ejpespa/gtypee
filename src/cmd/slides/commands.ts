import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type SlideSummary = {
  index: number;
  title: string;
};

export type SlidesCreateResult = {
  id: string;
  title: string;
};

export type SlidesCommandDeps = {
  createPresentation?: (title: string) => Promise<SlidesCreateResult>;
  listSlides?: (presentationId: string) => Promise<SlideSummary[]>;
  readSlide?: (presentationId: string, index: number) => Promise<SlideSummary>;
  exportSlides?: (presentationId: string, format: string) => Promise<{ id: string; format: string; path: string; exported: boolean }>;
};

const defaultDeps: Required<SlidesCommandDeps> = {
  createPresentation: async (title) => ({ id: "", title }),
  listSlides: async () => [],
  readSlide: async (presentationId, index) => ({ index, title: `Slide ${index} in ${presentationId}` }),
  exportSlides: async (presentationId, format) => ({ id: presentationId, format, path: "", exported: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatSlidesList(slides: SlideSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ slides }, null, 2);
  }
  if (slides.length === 0) {
    return "No slides found";
  }
  const lines = ["INDEX\tTITLE"];
  for (const slide of slides) {
    lines.push(`${slide.index}\t${slide.title}`);
  }
  return lines.join("\n");
}

export function registerSlidesCommands(slidesCommand: Command, deps: SlidesCommandDeps = {}): void {
  const resolvedDeps: Required<SlidesCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  slidesCommand
    .command("create")
    .description("Create a new presentation")
    .requiredOption("--title <title>", "Presentation title")
    .action(async function actionCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ title: string }>();
      const result = await runWithStableApiError("slides", () => resolvedDeps.createPresentation(opts.title));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`Created presentation "${result.title}" (id=${result.id})\n`);
    });

  slidesCommand
    .command("list")
    .description("List slides")
    .requiredOption("--id <id>", "Presentation id")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const slides = await runWithStableApiError("slides", () => resolvedDeps.listSlides(opts.id));
      process.stdout.write(`${formatSlidesList(slides, ctx.output.mode)}\n`);
    });

  slidesCommand
    .command("read")
    .description("Read one slide")
    .requiredOption("--id <id>", "Presentation id")
    .requiredOption("--index <index>", "Slide index")
    .action(async function actionRead(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; index: string }>();
      const slide = await runWithStableApiError("slides", () => resolvedDeps.readSlide(opts.id, Number.parseInt(opts.index, 10)));
      process.stdout.write(`${formatSlidesList([slide], ctx.output.mode)}\n`);
    });

  slidesCommand
    .command("export")
    .description("Export presentation")
    .requiredOption("--id <id>", "Presentation id")
    .requiredOption("--format <format>", "Export format")
    .action(async function actionExport(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; format: string }>();
      const result = await runWithStableApiError("slides", () => resolvedDeps.exportSlides(opts.id, opts.format));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.exported ? `Exported ${result.id} to ${result.path}\n` : `Export failed for ${result.id}\n`);
    });
}
