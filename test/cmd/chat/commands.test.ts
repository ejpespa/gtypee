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
