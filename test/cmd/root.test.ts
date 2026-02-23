import { describe, expect, it } from "vitest";

import { buildProgram } from "../../src/cmd/root.js";

describe("buildProgram", () => {
  it("registers key global options", () => {
    const program = buildProgram();
    const longFlags = program.options.map((option) => option.long);

    expect(longFlags).toContain("--account");
    expect(longFlags).toContain("--client");
    expect(longFlags).toContain("--json");
    expect(longFlags).toContain("--plain");
    expect(longFlags).toContain("--verbose");
    expect(longFlags).toContain("--sa");
    expect(longFlags).toContain("--impersonate");
  });

  it("registers desire-path aliases", () => {
    const program = buildProgram();
    const names = program.commands.map((command) => command.name());

    expect(names).toContain("send");
    expect(names).toContain("ls");
    expect(names).toContain("search");
    expect(names).toContain("login");
    expect(names).toContain("logout");
    expect(names).toContain("status");
    expect(names).toContain("me");
    expect(names).toContain("whoami");
  });

  it("registers service command groups", () => {
    const program = buildProgram();
    const names = program.commands.map((command) => command.name());

    expect(names).toContain("auth");
    expect(names).toContain("drive");
    expect(names).toContain("gmail");
    expect(names).toContain("calendar");
    expect(names).toContain("people");
    expect(names).toContain("sheets");
    expect(names).toContain("forms");
  });

  it("renders help text including key aliases and groups", () => {
    const program = buildProgram();
    const help = program.helpInformation();

    expect(help).toContain("auth");
    expect(help).toContain("gmail");
    expect(help).toContain("drive");
    expect(help).toContain("calendar");
    expect(help).toContain("chat");
    expect(help).toContain("classroom");
    expect(help).toContain("keep");
    expect(help).toContain("login");
    expect(help).toContain("logout");
    expect(help).toContain("status");
  });

  it("wires auth subcommands", () => {
    const program = buildProgram();
    const auth = program.commands.find((command) => command.name() === "auth");
    expect(auth).toBeDefined();

    const authSubcommands = auth?.commands.map((command) => command.name()) ?? [];
    expect(authSubcommands).toContain("add");
    expect(authSubcommands).toContain("remove");
    expect(authSubcommands).toContain("list");
    expect(authSubcommands).toContain("status");
  });

  it("uses injected auth deps for auth status execution", async () => {
    let called = false;
    const program = buildProgram({
      authDeps: {
        status: async () => {
          called = true;
          return {
            tokenCount: 7,
            configPath: "/tmp/typee/config.json",
            keyringBackend: "file",
          };
        },
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "typee", "auth", "status"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(called).toBe(true);
  });

  it("routes login desire-path command to auth add deps", async () => {
    let called = false;
    const program = buildProgram({
      authDeps: {
        addToken: async (email, input) => {
          called = true;
          expect(email).toBe("a@b.com");
          expect(input?.remote).toBe(true);
          expect(input?.step).toBe(1);
          return {
            email,
            message: "Run again with --remote --step 2 --auth-url <redirect-url>",
            authUrl: "https://example.test/auth?state=s1",
            stateReused: false,
          };
        },
      },
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "typee", "login", "--email", "a@b.com", "--remote", "--step", "1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(called).toBe(true);
    expect(stdout).toContain("auth_url\thttps://example.test/auth?state=s1");
  });

  it("routes logout desire-path command to auth remove deps", async () => {
    let called = false;
    const program = buildProgram({
      authDeps: {
        removeToken: async (email) => {
          called = true;
          expect(email).toBe("a@b.com");
          return { email, removed: true };
        },
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "typee", "logout", "--email", "a@b.com"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(called).toBe(true);
  });

  it("wires gmail subcommands", () => {
    const program = buildProgram();
    const gmail = program.commands.find((command) => command.name() === "gmail");
    expect(gmail).toBeDefined();

    const gmailSubcommands = gmail?.commands.map((command) => command.name()) ?? [];
    expect(gmailSubcommands).toContain("send");
    expect(gmailSubcommands).toContain("search");
  });

  it("wires calendar subcommands", () => {
    const program = buildProgram();
    const calendar = program.commands.find((command) => command.name() === "calendar");
    expect(calendar).toBeDefined();

    const calendarSubcommands = calendar?.commands.map((command) => command.name()) ?? [];
    expect(calendarSubcommands).toContain("events");
    expect(calendarSubcommands).toContain("create");
  });

  it("wires drive subcommands", () => {
    const program = buildProgram();
    const drive = program.commands.find((command) => command.name() === "drive");
    expect(drive).toBeDefined();

    const driveSubcommands = drive?.commands.map((command) => command.name()) ?? [];
    expect(driveSubcommands).toContain("ls");
    expect(driveSubcommands).toContain("search");
    expect(driveSubcommands).toContain("download");
    expect(driveSubcommands).toContain("upload");
  });

  it("wires docs subcommands", () => {
    const program = buildProgram();
    const docs = program.commands.find((command) => command.name() === "docs");
    expect(docs).toBeDefined();

    const docsSubcommands = docs?.commands.map((command) => command.name()) ?? [];
    expect(docsSubcommands).toContain("read");
    expect(docsSubcommands).toContain("markdown");
  });

  it("wires slides subcommands", () => {
    const program = buildProgram();
    const slides = program.commands.find((command) => command.name() === "slides");
    expect(slides).toBeDefined();

    const slidesSubcommands = slides?.commands.map((command) => command.name()) ?? [];
    expect(slidesSubcommands).toContain("list");
    expect(slidesSubcommands).toContain("read");
  });

  it("wires sheets subcommands", () => {
    const program = buildProgram();
    const sheets = program.commands.find((command) => command.name() === "sheets");
    expect(sheets).toBeDefined();

    const sheetsSubcommands = sheets?.commands.map((command) => command.name()) ?? [];
    expect(sheetsSubcommands).toContain("read");
    expect(sheetsSubcommands).toContain("update");
  });

  it("wires forms subcommands", () => {
    const program = buildProgram();
    const forms = program.commands.find((command) => command.name() === "forms");
    expect(forms).toBeDefined();

    const formsSubcommands = forms?.commands.map((command) => command.name()) ?? [];
    expect(formsSubcommands).toContain("get");
    expect(formsSubcommands).toContain("responses");
  });

  it("wires tasks subcommands", () => {
    const program = buildProgram();
    const tasks = program.commands.find((command) => command.name() === "tasks");
    expect(tasks).toBeDefined();

    const tasksSubcommands = tasks?.commands.map((command) => command.name()) ?? [];
    expect(tasksSubcommands).toContain("list");
    expect(tasksSubcommands).toContain("add");
  });

  it("wires people subcommands", () => {
    const program = buildProgram();
    const people = program.commands.find((command) => command.name() === "people");
    expect(people).toBeDefined();

    const peopleSubcommands = people?.commands.map((command) => command.name()) ?? [];
    expect(peopleSubcommands).toContain("me");
    expect(peopleSubcommands).toContain("search");
  });

  it("wires chat subcommands", () => {
    const program = buildProgram();
    const chat = program.commands.find((command) => command.name() === "chat");
    expect(chat).toBeDefined();

    const chatSubcommands = chat?.commands.map((command) => command.name()) ?? [];
    expect(chatSubcommands).toContain("spaces");
    expect(chatSubcommands).toContain("messages");
  });

  it("wires classroom subcommands", () => {
    const program = buildProgram();
    const classroom = program.commands.find((command) => command.name() === "classroom");
    expect(classroom).toBeDefined();

    const classroomSubcommands = classroom?.commands.map((command) => command.name()) ?? [];
    expect(classroomSubcommands).toContain("courses");
    expect(classroomSubcommands).toContain("submissions");
  });

  it("wires contacts subcommands", () => {
    const program = buildProgram();
    const contacts = program.commands.find((command) => command.name() === "contacts");
    expect(contacts).toBeDefined();

    const contactsSubcommands = contacts?.commands.map((command) => command.name()) ?? [];
    expect(contactsSubcommands).toContain("list");
    expect(contactsSubcommands).toContain("search");
  });

  it("wires groups subcommands", () => {
    const program = buildProgram();
    const groups = program.commands.find((command) => command.name() === "groups");
    expect(groups).toBeDefined();

    const groupsSubcommands = groups?.commands.map((command) => command.name()) ?? [];
    expect(groupsSubcommands).toContain("list");
    expect(groupsSubcommands).toContain("members");
  });

  it("wires keep subcommands", () => {
    const program = buildProgram();
    const keep = program.commands.find((command) => command.name() === "keep");
    expect(keep).toBeDefined();

    const keepSubcommands = keep?.commands.map((command) => command.name()) ?? [];
    expect(keepSubcommands).toContain("list");
    expect(keepSubcommands).toContain("get");
  });

  it("wires appscript subcommands", () => {
    const program = buildProgram();
    const appscript = program.commands.find((command) => command.name() === "appscript");
    expect(appscript).toBeDefined();

    const appscriptSubcommands = appscript?.commands.map((command) => command.name()) ?? [];
    expect(appscriptSubcommands).toContain("list");
    expect(appscriptSubcommands).toContain("run");
  });

  it("wires time subcommands", () => {
    const program = buildProgram();
    const time = program.commands.find((command) => command.name() === "time");
    expect(time).toBeDefined();

    const timeSubcommands = time?.commands.map((command) => command.name()) ?? [];
    expect(timeSubcommands).toContain("now");
    expect(timeSubcommands).toContain("timezone");
  });

  it("wires config subcommands", () => {
    const program = buildProgram();
    const config = program.commands.find((command) => command.name() === "config");
    expect(config).toBeDefined();

    const configSubcommands = config?.commands.map((command) => command.name()) ?? [];
    expect(configSubcommands).toContain("path");
    expect(configSubcommands).toContain("list");
    expect(configSubcommands).toContain("get");
    expect(configSubcommands).toContain("set");
    expect(configSubcommands).toContain("unset");
  });

  it("wires exit-codes subcommands", () => {
    const program = buildProgram();
    const exitCodes = program.commands.find((command) => command.name() === "exit-codes");
    expect(exitCodes).toBeDefined();

    const exitCodeSubcommands = exitCodes?.commands.map((command) => command.name()) ?? [];
    expect(exitCodeSubcommands).toContain("print");
  });

  it("wires version subcommands", () => {
    const program = buildProgram();
    const version = program.commands.find((command) => command.name() === "version");
    expect(version).toBeDefined();

    const versionSubcommands = version?.commands.map((command) => command.name()) ?? [];
    expect(versionSubcommands).toContain("print");
  });

  it("wires schema subcommands", () => {
    const program = buildProgram();
    const schema = program.commands.find((command) => command.name() === "schema");
    expect(schema).toBeDefined();

    const schemaSubcommands = schema?.commands.map((command) => command.name()) ?? [];
    expect(schemaSubcommands).toContain("print");
  });

  it("wires completion subcommands", () => {
    const program = buildProgram();
    const completion = program.commands.find((command) => command.name() === "completion");
    expect(completion).toBeDefined();

    const completionSubcommands = completion?.commands.map((command) => command.name()) ?? [];
    expect(completionSubcommands).toContain("script");
  });

  it("wires agent subcommands", () => {
    const program = buildProgram();
    const agent = program.commands.find((command) => command.name() === "agent");
    expect(agent).toBeDefined();

    const agentSubcommands = agent?.commands.map((command) => command.name()) ?? [];
    expect(agentSubcommands).toContain("ping");
  });
});
