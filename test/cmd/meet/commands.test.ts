import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import {
  formatMeetSpace,
  registerMeetCommands,
} from "../../../src/cmd/meet/commands.js";

describe("meet space formatter", () => {
  it("formats meet space as json", () => {
    const out = formatMeetSpace(
      { name: "spaces/abc123", meetingUri: "https://meet.google.com/abc-defg-hij", meetingCode: "abc-defg-hij" },
      "json",
    );
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe("spaces/abc123");
    expect(parsed.meetingUri).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("formats meet space as human text", () => {
    const out = formatMeetSpace(
      { name: "spaces/abc123", meetingUri: "https://meet.google.com/abc-defg-hij", meetingCode: "abc-defg-hij" },
      "human",
    );
    expect(out).toContain("spaces/abc123");
    expect(out).toContain("https://meet.google.com/abc-defg-hij");
    expect(out).toContain("abc-defg-hij");
  });
});

describe("meet commands", () => {
  it("registers create/get/end subcommands", () => {
    const meet = new Command("meet");
    registerMeetCommands(meet);
    const names = meet.commands.map((cmd) => cmd.name());
    expect(names).toContain("create");
    expect(names).toContain("get");
    expect(names).toContain("end");
  });

  it("create calls createSpace and prints result", async () => {
    const root = new Command();
    const meet = root.command("meet");
    const createSpace = vi.fn().mockResolvedValue({
      name: "spaces/newspace",
      meetingUri: "https://meet.google.com/new-meet-xyz",
      meetingCode: "new-meet-xyz",
    });
    registerMeetCommands(meet, { createSpace });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    await root.parseAsync(["node", "test", "meet", "create"]);
    process.stdout.write = originalWrite;

    expect(createSpace).toHaveBeenCalled();
    expect(stdout).toContain("new-meet-xyz");
  });

  it("get calls getSpace with space name", async () => {
    const root = new Command();
    const meet = root.command("meet");
    const getSpace = vi.fn().mockResolvedValue({
      name: "spaces/abc123",
      meetingUri: "https://meet.google.com/abc-defg-hij",
      meetingCode: "abc-defg-hij",
    });
    registerMeetCommands(meet, { getSpace });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    await root.parseAsync(["node", "test", "meet", "get", "--space", "spaces/abc123"]);
    process.stdout.write = originalWrite;

    expect(getSpace).toHaveBeenCalledWith("spaces/abc123");
    expect(stdout).toContain("abc-defg-hij");
  });

  it("end calls endMeeting with space name", async () => {
    const root = new Command();
    const meet = root.command("meet");
    const endMeeting = vi.fn().mockResolvedValue({ ended: true });
    registerMeetCommands(meet, { endMeeting });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    await root.parseAsync(["node", "test", "meet", "end", "--space", "spaces/abc123"]);
    process.stdout.write = originalWrite;

    expect(endMeeting).toHaveBeenCalledWith("spaces/abc123");
    expect(stdout).toContain("ended");
  });
});
