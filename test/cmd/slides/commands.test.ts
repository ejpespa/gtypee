import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatSlidesList, registerSlidesCommands } from "../../../src/cmd/slides/commands.js";

describe("slides command formatters", () => {
  it("formats slides list as json", () => {
    const out = formatSlidesList([{ index: 1, title: "Intro" }], "json");
    const parsed = JSON.parse(out) as { slides: Array<{ index: number }> };
    expect(parsed.slides[0]?.index).toBe(1);
  });

  it("registers list and read subcommands", () => {
    const slides = new Command("slides");
    registerSlidesCommands(slides);
    const names = slides.commands.map((cmd) => cmd.name());
    expect(names).toContain("list");
    expect(names).toContain("read");
    expect(names).toContain("export");
  });

  it("exports slides in json mode", async () => {
    const root = new Command();
    root.option("--json");
    const slides = root.command("slides");
    registerSlidesCommands(slides, {
      exportSlides: async (id, format) => ({
        id,
        format,
        path: `./${id}.${format}`,
        exported: true,
      }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "--json", "slides", "export", "--id", "deck-1", "--format", "pdf"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { id: string; format: string; exported: boolean };
    expect(parsed.id).toBe("deck-1");
    expect(parsed.format).toBe("pdf");
    expect(parsed.exported).toBe(true);
  });
});
