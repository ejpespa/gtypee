import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { buildProgram } from "../../../src/cmd/root.js";
import { AuthRequiredError } from "../../../src/googleapi/errors.js";
import {
  formatGmailLabels,
  formatGmailSearchResult,
  registerGmailCommands,
} from "../../../src/cmd/gmail/commands.js";

function captureStdout(fn: () => Promise<unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    fn()
      .then(() => {
        process.stdout.write = originalWrite;
        resolve(stdout);
      })
      .catch((err) => {
        process.stdout.write = originalWrite;
        reject(err);
      });
  });
}

describe("gmail command formatters", () => {
  it("formats gmail search result as json", () => {
    const out = formatGmailSearchResult(
      [
        { id: "m1", threadId: "t1", subject: "hello" },
        { id: "m2", threadId: "t2", subject: "world" },
      ],
      "json",
    );

    const parsed = JSON.parse(out) as { messages: Array<{ id: string }> };
    expect(parsed.messages).toHaveLength(2);
  });

  it("formats gmail labels as json", () => {
    const out = formatGmailLabels(
      [
        { id: "INBOX", name: "INBOX" },
        { id: "STARRED", name: "STARRED" },
      ],
      "json",
    );

    const parsed = JSON.parse(out) as { labels: Array<{ id: string }> };
    expect(parsed.labels).toHaveLength(2);
  });
});

describe("gmail command registration", () => {
  it("registers all core subcommands", () => {
    const gmail = new Command("gmail");
    registerGmailCommands(gmail);

    const names = gmail.commands.map((cmd) => cmd.name());
    expect(names).toContain("send");
    expect(names).toContain("search");
    expect(names).toContain("list");
    expect(names).toContain("labels");
    expect(names).toContain("get");
    expect(names).toContain("delete");
    expect(names).toContain("trash");
    expect(names).toContain("untrash");
    expect(names).toContain("modify");
    expect(names).toContain("draft");
    expect(names).toContain("thread");
    expect(names).toContain("label");
    expect(names).toContain("filter");
    expect(names).toContain("signature");
  });

  it("registers draft subcommands", () => {
    const gmail = new Command("gmail");
    registerGmailCommands(gmail);

    const draftCmd = gmail.commands.find((cmd) => cmd.name() === "draft");
    expect(draftCmd).toBeDefined();
    const draftSubcmds = draftCmd!.commands.map((cmd) => cmd.name());
    expect(draftSubcmds).toContain("create");
    expect(draftSubcmds).toContain("list");
    expect(draftSubcmds).toContain("get");
    expect(draftSubcmds).toContain("delete");
    expect(draftSubcmds).toContain("send");
  });

  it("registers thread subcommands", () => {
    const gmail = new Command("gmail");
    registerGmailCommands(gmail);

    const threadCmd = gmail.commands.find((cmd) => cmd.name() === "thread");
    expect(threadCmd).toBeDefined();
    const threadSubcmds = threadCmd!.commands.map((cmd) => cmd.name());
    expect(threadSubcmds).toContain("list");
    expect(threadSubcmds).toContain("get");
  });

  it("registers label subcommands", () => {
    const gmail = new Command("gmail");
    registerGmailCommands(gmail);

    const labelCmd = gmail.commands.find((cmd) => cmd.name() === "label");
    expect(labelCmd).toBeDefined();
    const labelSubcmds = labelCmd!.commands.map((cmd) => cmd.name());
    expect(labelSubcmds).toContain("create");
    expect(labelSubcmds).toContain("get");
    expect(labelSubcmds).toContain("update");
    expect(labelSubcmds).toContain("delete");
  });

  it("registers filter subcommands", () => {
    const gmail = new Command("gmail");
    registerGmailCommands(gmail);

    const filterCmd = gmail.commands.find((cmd) => cmd.name() === "filter");
    expect(filterCmd).toBeDefined();
    const filterSubcmds = filterCmd!.commands.map((cmd) => cmd.name());
    expect(filterSubcmds).toContain("list");
    expect(filterSubcmds).toContain("create");
    expect(filterSubcmds).toContain("delete");
  });

  it("registers signature subcommands", () => {
    const gmail = new Command("gmail");
    registerGmailCommands(gmail);

    const sigCmd = gmail.commands.find((cmd) => cmd.name() === "signature");
    expect(sigCmd).toBeDefined();
    const sigSubcmds = sigCmd!.commands.map((cmd) => cmd.name());
    expect(sigSubcmds).toContain("list");
    expect(sigSubcmds).toContain("get");
    expect(sigSubcmds).toContain("set");
  });
});

describe("gmail core commands", () => {
  it("prints stable send output for non-accepted messages", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      sendEmail: async () => ({
        id: "",
        threadId: "",
        accepted: false,
      }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "gmail", "send", "--to", "a@b.com", "--subject", "s", "--body", "hello"])
    );

    expect(stdout).toContain("Message was not accepted by Gmail");
    expect(stdout).not.toContain("not implemented yet in TypeScript port");
  });

  it("uses default query for gmail list", async () => {
    let querySeen = "";
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      searchEmails: async (query) => {
        querySeen = query;
        return [];
      },
    });

    await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "list"]));
    expect(querySeen).toBe("in:anywhere");
  });

  it("maps generic API errors to stable gmail error messages", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      sendEmail: async () => {
        throw new Error("boom");
      },
    });

    await expect(
      root.parseAsync(["node", "typee", "gmail", "send", "--to", "a@b.com", "--subject", "s", "--body", "hello"]),
    ).rejects.toThrow("gmail api request failed: boom");
  });

  it("keeps typed googleapi errors stable", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      sendEmail: async () => {
        throw new AuthRequiredError("gmail", "a@b.com", "team");
      },
    });

    await expect(
      root.parseAsync(["node", "typee", "gmail", "send", "--to", "a@b.com", "--subject", "s", "--body", "hello"]),
    ).rejects.toThrow("auth required for gmail a@b.com (client team)");
  });
});

describe("gmail message commands", () => {
  it("gmail get returns message details", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      getMessage: async () => ({
        id: "msg1",
        threadId: "t1",
        from: "sender@example.com",
        to: "me@example.com",
        subject: "Test Subject",
        date: "2024-01-01",
        body: "Hello World",
      }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "get", "msg1"]));
    expect(stdout).toContain("Test Subject");
    expect(stdout).toContain("sender@example.com");
  });

  it("gmail delete requires force flag", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      deleteMessage: async () => ({ id: "msg1", applied: true }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "delete", "msg1"]));
    expect(stdout).toContain("Use --force to confirm");
  });

  it("gmail delete with force deletes message", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      deleteMessage: async () => ({ id: "msg1", applied: true }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "delete", "msg1", "--force"]));
    expect(stdout).toContain("Message deleted: msg1");
  });

  it("gmail trash moves message to trash", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      trashMessage: async () => ({ id: "msg1", applied: true }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "trash", "msg1"]));
    expect(stdout).toContain("trash");
    expect(stdout).toContain("msg1");
  });

  it("gmail untrash restores message", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      untrashMessage: async () => ({ id: "msg1", applied: true }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "untrash", "msg1"]));
    expect(stdout).toContain("restored");
    expect(stdout).toContain("msg1");
  });

  it("gmail modify adds and removes labels", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      modifyMessage: async () => ({
        id: "msg1",
        addedLabels: ["STARRED"],
        removedLabels: ["UNREAD"],
        applied: true,
      }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "gmail", "modify", "msg1", "--add-label", "STARRED", "--remove-label", "UNREAD"])
    );
    expect(stdout).toContain("msg1");
    expect(stdout).toContain("modified");
  });
});

describe("gmail draft commands", () => {
  it("draft create creates a draft", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      createDraft: async () => ({
        id: "draft1",
        message: { id: "m1", threadId: "", subject: "Test" },
        applied: true,
      }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "gmail", "draft", "create", "--to", "a@b.com", "--subject", "test", "--body", "hello"])
    );
    expect(stdout).toContain("draft1");
    expect(stdout).toContain("Draft");
  });

  it("draft list lists drafts", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      listDrafts: async () => [{ id: "draft1", message: { id: "m1", threadId: "", subject: "Test" } }],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "draft", "list"]));
    expect(stdout).toContain("draft1");
  });
});

describe("gmail thread commands", () => {
  it("thread list lists threads", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      listThreads: async () => [{ id: "t1", snippet: "Hello", messageCount: 2 }],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "thread", "list"]));
    expect(stdout).toContain("t1");
  });
});

describe("gmail label CRUD commands", () => {
  it("label create creates a label", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      createLabel: async () => ({ id: "label1", name: "MyLabel", applied: true }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "label", "create", "--name", "MyLabel"]));
    expect(stdout).toContain("Label created: MyLabel");
  });

  it("label delete requires force", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      deleteLabel: async () => ({ id: "label1", applied: true }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "label", "delete", "label1"]));
    expect(stdout).toContain("Use --force");
  });
});

describe("gmail filter commands", () => {
  it("filter list lists filters", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      listFilters: async () => [{ id: "f1", query: "from:spam", addLabelIds: ["TRASH"] }],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "filter", "list"]));
    expect(stdout).toContain("f1");
  });
});

describe("gmail signature commands", () => {
  it("signature list lists send-as aliases", async () => {
    const root = new Command();
    const gmail = root.command("gmail");
    registerGmailCommands(gmail, {
      listSendAs: async () => [{ sendAsEmail: "me@example.com", displayName: "Me", isPrimary: true, signature: "Thanks!" }],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "gmail", "signature", "list"]));
    expect(stdout).toContain("me@example.com");
  });
});
