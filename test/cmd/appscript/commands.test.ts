import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatAppScriptProjects, registerAppScriptCommands } from "../../../src/cmd/appscript/commands.js";

describe("appscript command formatters", () => {
  it("formats projects as json", () => {
    const out = formatAppScriptProjects([{ id: "p1", title: "Project" }], "json");
    const parsed = JSON.parse(out) as { projects: Array<{ id: string }> };
    expect(parsed.projects[0]?.id).toBe("p1");
  });

  it("registers list and run subcommands", () => {
    const appscript = new Command("appscript");
    registerAppScriptCommands(appscript);
    const names = appscript.commands.map((cmd) => cmd.name());
    expect(names).toContain("list");
    expect(names).toContain("get");
    expect(names).toContain("create");
    expect(names).toContain("run");
  });

  it("forwards params and dev mode to run deps", async () => {
    let seenId = "";
    let seenFn = "";
    let seenParams: unknown[] = [];
    let seenDevMode = false;

    const root = new Command();
    const appscript = root.command("appscript");
    registerAppScriptCommands(appscript, {
      runFunction: async (scriptId, fn, input) => {
        seenId = scriptId;
        seenFn = fn;
        seenParams = input?.params ?? [];
        seenDevMode = input?.devMode ?? false;
        return { done: true, result: { ok: true } };
      },
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node",
        "typee",
        "appscript",
        "run",
        "--id",
        "script-1",
        "--fn",
        "main",
        "--params",
        "[1,\"x\"]",
        "--dev-mode",
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(seenId).toBe("script-1");
    expect(seenFn).toBe("main");
    expect(seenParams).toEqual([1, "x"]);
    expect(seenDevMode).toBe(true);
    expect(stdout).toContain("done\ttrue");
    expect(stdout).toContain("result\t{\"ok\":true}");
  });

  it("supports get and create in json mode", async () => {
    const root = new Command();
    root.option("--json");
    const appscript = root.command("appscript");
    let createCalled = false;
    let getCalled = false;
    registerAppScriptCommands(appscript, {
      createProject: async (title) => {
        createCalled = true;
        return { id: "script-1", title, created: true };
      },
      getProject: async (id) => {
        getCalled = true;
        return { id, title: "Project One" };
      },
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "--json", "appscript", "create", "--title", "Project One"]);
      await root.parseAsync(["node", "typee", "--json", "appscript", "get", "--id", "script-1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const chunks = stdout.trim().split(/\r?\n(?=\{)/);
    const created = JSON.parse(chunks[0] ?? "{}") as { created: boolean };
    const fetched = JSON.parse(chunks[1] ?? "{}") as { id: string };
    expect(createCalled).toBe(true);
    expect(getCalled).toBe(true);
    expect(created.created).toBe(true);
    expect(fetched.id).toBe("script-1");
  });
});
