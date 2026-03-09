import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatCalendarEvents, registerCalendarCommands } from "../../../src/cmd/calendar/commands.js";

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
