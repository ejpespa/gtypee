import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { formatChatMessages, registerChatCommands } from "../../../src/cmd/chat/commands.js";

describe("chat command formatters", () => {
  it("formats chat messages as json", () => {
    const out = formatChatMessages([{ id: "m1", text: "hello" }], "json");
    const parsed = JSON.parse(out) as { messages: Array<{ id: string }> };
    expect(parsed.messages[0]?.id).toBe("m1");
  });

  it("registers spaces and messages subcommands", () => {
    const chat = new Command("chat");
    registerChatCommands(chat);
    const names = chat.commands.map((cmd) => cmd.name());
    expect(names).toContain("spaces");
    expect(names).toContain("messages");
    expect(names).toContain("get-space");
    expect(names).toContain("create-space");
    expect(names).toContain("send");
  });

  it("forwards send message input", async () => {
    let seenSpace = "";
    let seenText = "";
    const root = new Command();
    const chat = root.command("chat");
    registerChatCommands(chat, {
      sendMessage: async (spaceId, text) => {
        seenSpace = spaceId;
        seenText = text;
        return { id: "m1", sent: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "chat", "send", "--space", "spaces/1", "--text", "hello"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(seenSpace).toBe("spaces/1");
    expect(seenText).toBe("hello");
  });

  it("sends via --to by finding existing DM", async () => {
    let seenSpace = "";
    let seenText = "";
    const root = new Command();
    const chat = root.command("chat");
    registerChatCommands(chat, {
      findDirectMessage: async () => ({ id: "spaces/dm-123", displayName: "DM" }),
      sendMessage: async (spaceId, text) => {
        seenSpace = spaceId;
        seenText = text;
        return { id: "m2", sent: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "chat", "send", "--to", "user@example.com", "--text", "hi"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(seenSpace).toBe("spaces/dm-123");
    expect(seenText).toBe("hi");
  });

  it("sends via --to by setting up new DM when none exists", async () => {
    let seenSpace = "";
    let setupCalledWith = "";
    const root = new Command();
    const chat = root.command("chat");
    registerChatCommands(chat, {
      findDirectMessage: async () => null,
      setupDirectMessage: async (email) => {
        setupCalledWith = email;
        return { id: "spaces/new-dm", displayName: "" };
      },
      sendMessage: async (spaceId, text) => {
        seenSpace = spaceId;
        void text;
        return { id: "m3", sent: true };
      },
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "chat", "send", "--to", "new@example.com", "--text", "hello"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(setupCalledWith).toBe("new@example.com");
    expect(seenSpace).toBe("spaces/new-dm");
  });

  it("throws when neither --space nor --to is provided", async () => {
    const root = new Command();
    root.exitOverride();
    const chat = root.command("chat");
    registerChatCommands(chat);

    // Commander will throw because --text is required but --space/--to validation is in the action
    // We need to provide --text to get past Commander's own validation
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await expect(root.parseAsync(["node", "typee", "chat", "send", "--text", "hello"])).rejects.toThrow("Either --space or --to is required");
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it("throws when both --space and --to are provided", async () => {
    const root = new Command();
    root.exitOverride();
    const chat = root.command("chat");
    registerChatCommands(chat);

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      void chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await expect(
        root.parseAsync(["node", "typee", "chat", "send", "--space", "spaces/1", "--to", "u@ex.com", "--text", "hi"]),
      ).rejects.toThrow("Cannot combine --space and --to");
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it("returns clear workspace-required error", async () => {
    const root = new Command();
    const chat = root.command("chat");
    registerChatCommands(chat, {
      ensureWorkspace: async () => {
        throw new Error("workspace account required for chat");
      },
    });

    await expect(root.parseAsync(["node", "typee", "chat", "spaces"])).rejects.toThrow("workspace account required for chat");
  });
});
