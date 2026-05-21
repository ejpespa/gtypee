import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatCalendarEvents, formatFreeBusy, formatCalendarList, formatCalendarAcl, registerCalendarCommands } from "../../../src/cmd/calendar/commands.js";

describe("calendar command formatters", () => {
  it("formats events as json", () => {
    const out = formatCalendarEvents(
      {
        items: [
          { id: "e1", summary: "Standup", start: "2026-02-20T10:00:00Z" },
          { id: "e2", summary: "Demo", start: "2026-02-20T11:00:00Z" },
        ],
      },
      "json",
    );
    const parsed = JSON.parse(out) as { items: Array<{ id: string }> };
    expect(parsed.items).toHaveLength(2);
  });

  it("registers events and create subcommands", () => {
    const calendar = new Command("calendar");
    registerCalendarCommands(calendar);
    const names = calendar.commands.map((cmd) => cmd.name());
    expect(names).toContain("events");
    expect(names).toContain("create");
    expect(names).toContain("update");
    expect(names).toContain("respond");
    expect(names).toContain("conflicts");
  });
});

describe("calendar freebusy formatter", () => {
  it("formats freebusy as json", () => {
    const out = formatFreeBusy(
      [{ email: "user@test.com", busy: [{ start: "2026-06-01T10:00:00Z", end: "2026-06-01T11:00:00Z" }] }],
      "json",
    );
    const parsed = JSON.parse(out);
    expect(parsed.calendars).toHaveLength(1);
    expect(parsed.calendars[0].busy).toHaveLength(1);
  });

  it("formats freebusy with no busy slots", () => {
    const out = formatFreeBusy([{ email: "free@test.com", busy: [] }], "human");
    expect(out).toContain("free@test.com");
    expect(out).toContain("Free");
  });
});

describe("calendar list formatter", () => {
  it("formats calendar list as json", () => {
    const out = formatCalendarList(
      [{ id: "primary", summary: "My Calendar", primary: true, accessRole: "owner" }],
      "json",
    );
    const parsed = JSON.parse(out);
    expect(parsed.calendars).toHaveLength(1);
  });

  it("formats empty calendar list", () => {
    const out = formatCalendarList([], "human");
    expect(out).toContain("No calendars");
  });
});

describe("calendar acl formatter", () => {
  it("formats acl rules as json", () => {
    const out = formatCalendarAcl(
      [{ id: "user:a@test.com", role: "writer", scope: { type: "user", value: "a@test.com" } }],
      "json",
    );
    const parsed = JSON.parse(out);
    expect(parsed.rules).toHaveLength(1);
  });

  it("formats empty acl", () => {
    const out = formatCalendarAcl([], "human");
    expect(out).toContain("No access rules");
  });
});

describe("calendar deeper commands registration", () => {
  it("registers freebusy subcommand", () => {
    const calendar = new Command("calendar");
    registerCalendarCommands(calendar);
    const names = calendar.commands.map((cmd) => cmd.name());
    expect(names).toContain("freebusy");
  });

  it("registers calendars subcommand with list/get", () => {
    const calendar = new Command("calendar");
    registerCalendarCommands(calendar);
    const calendars = calendar.commands.find((c) => c.name() === "calendars");
    expect(calendars).toBeDefined();
    const subNames = calendars!.commands.map((c) => c.name());
    expect(subNames).toContain("list");
    expect(subNames).toContain("get");
  });

  it("registers acl subcommand with list/add/remove", () => {
    const calendar = new Command("calendar");
    registerCalendarCommands(calendar);
    const acl = calendar.commands.find((c) => c.name() === "acl");
    expect(acl).toBeDefined();
    const subNames = acl!.commands.map((c) => c.name());
    expect(subNames).toContain("list");
    expect(subNames).toContain("add");
    expect(subNames).toContain("remove");
  });
});

describe("calendar create and update commands", () => {
  it("prints stable message when create result is not created", async () => {
    const root = new Command();
    const calendar = root.command("calendar");
    registerCalendarCommands(calendar, {
      createEvent: async () => ({
        id: "",
        created: false,
      }),
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
        "calendar",
        "create",
        "--summary",
        "Standup",
        "--start",
        "2026-02-20T10:00:00Z",
        "--end",
        "2026-02-20T10:30:00Z",
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Event was not created");
    expect(stdout).not.toContain("not implemented yet in TypeScript port");
  });

  it("executes update and respond flows", async () => {
    let updated = false;
    let responded = false;
    const root = new Command();
    const calendar = root.command("calendar");
    registerCalendarCommands(calendar, {
      updateEvent: async (input) => {
        updated = true;
        expect(input.id).toBe("evt-1");
        return { id: input.id, updated: true };
      },
      respondEvent: async (input) => {
        responded = true;
        expect(input.id).toBe("evt-1");
        expect(input.response).toBe("accepted");
        return { id: input.id, response: input.response, applied: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "calendar", "update", "--id", "evt-1"]);
      await root.parseAsync(["node", "typee", "calendar", "respond", "--id", "evt-1", "--response", "accepted"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(updated).toBe(true);
    expect(responded).toBe(true);
  });

  it("prints conflicts in json mode", async () => {
    const root = new Command();
    root.option("--json");
    const calendar = root.command("calendar");
    registerCalendarCommands(calendar, {
      listConflicts: async () => [
        {
          firstId: "evt-1",
          secondId: "evt-2",
          overlapStart: "2026-02-20T10:05:00Z",
          overlapEnd: "2026-02-20T10:15:00Z",
        },
      ],
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "--json", "calendar", "conflicts"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { conflicts: Array<{ firstId: string }> };
    expect(parsed.conflicts[0]?.firstId).toBe("evt-1");
  });
});

describe("calendar events list with pagination", () => {
  it("should pass pageSize option to listEvents", async () => {
    const listEvents = vi.fn().mockResolvedValue({
      items: [{ id: "evt1", summary: "Meeting", start: "2026-01-01T10:00:00Z" }],
    });
    const program = new Command();
    const calendar = program.command("calendar");
    registerCalendarCommands(calendar, { listEvents } as any);

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "calendar", "events", "--page-size", "50"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listEvents).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pageSize: 50 }));
  });

  it("should pass pageToken option to listEvents", async () => {
    const listEvents = vi.fn().mockResolvedValue({
      items: [],
    });
    const program = new Command();
    const calendar = program.command("calendar");
    registerCalendarCommands(calendar, { listEvents } as any);

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "calendar", "events", "--page-token", "abc123"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listEvents).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pageToken: "abc123" }));
  });

  it("should output nextPageToken in JSON mode", async () => {
    const listEvents = vi.fn().mockResolvedValue({
      items: [{ id: "evt1", summary: "Meeting", start: "2026-01-01T10:00:00Z" }],
      nextPageToken: "cal-next-token",
    });
    const program = new Command();
    program.option("--json");
    const calendar = program.command("calendar");
    registerCalendarCommands(calendar, { listEvents } as any);

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "--json", "calendar", "events"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { nextPageToken?: string };
    expect(parsed.nextPageToken).toBe("cal-next-token");
  });

  it("should display nextPageToken in text mode", async () => {
    const listEvents = vi.fn().mockResolvedValue({
      items: [{ id: "evt1", summary: "Meeting", start: "2026-01-01T10:00:00Z" }],
      nextPageToken: "cal-next-token",
    });
    const program = new Command();
    const calendar = program.command("calendar");
    registerCalendarCommands(calendar, { listEvents } as any);

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "calendar", "events"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Next page token: cal-next-token");
  });
});
