import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatFormGet, registerFormsCommands } from "../../../src/cmd/forms/commands.js";

describe("forms command formatters", () => {
  it("formats form get as json", () => {
    const out = formatFormGet({ id: "f1", title: "Survey" }, "json");
    const parsed = JSON.parse(out) as { id: string };
    expect(parsed.id).toBe("f1");
  });

  it("registers get and responses subcommands", () => {
    const forms = new Command("forms");
    registerFormsCommands(forms);
    const names = forms.commands.map((cmd) => cmd.name());
    expect(names).toContain("create");
    expect(names).toContain("get");
    expect(names).toContain("responses");
  });

  it("creates a form and prints json output", async () => {
    const root = new Command();
    root.option("--json");
    const forms = root.command("forms");
    registerFormsCommands(forms, {
      createForm: async (title) => ({ id: "f-created", title, created: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "--json", "forms", "create", "--title", "Survey 2026"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { id: string; created: boolean };
    expect(parsed.id).toBe("f-created");
    expect(parsed.created).toBe(true);
  });
});
