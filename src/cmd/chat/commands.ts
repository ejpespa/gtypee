import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type ChatMessage = {
  id: string;
  text: string;
};

export type ChatSpace = {
  id: string;
  displayName: string;
};

export type ChatCommandDeps = {
  ensureWorkspace?: () => Promise<void>;
  listSpaces?: () => Promise<ChatSpace[]>;
  getSpace?: (spaceId: string) => Promise<ChatSpace>;
  createSpace?: (displayName: string) => Promise<{ id: string; created: boolean }>;
  listMessages?: (spaceId: string) => Promise<ChatMessage[]>;
  sendMessage?: (spaceId: string, text: string) => Promise<{ id: string; sent: boolean }>;
  findDirectMessage?: (email: string) => Promise<ChatSpace | null>;
  setupDirectMessage?: (email: string) => Promise<ChatSpace>;
};

const defaultDeps: Required<ChatCommandDeps> = {
  ensureWorkspace: async () => undefined,
  listSpaces: async () => [],
  getSpace: async (spaceId) => ({ id: spaceId, displayName: "" }),
  createSpace: async () => ({ id: "", created: false }),
  listMessages: async () => [],
  sendMessage: async () => ({ id: "", sent: false }),
  findDirectMessage: async () => null,
  setupDirectMessage: async () => ({ id: "", displayName: "" }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatChatMessages(messages: ChatMessage[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ messages }, null, 2);
  }
  if (messages.length === 0) {
    return "No messages found";
  }
  return messages.map((message) => `${message.id}\t${message.text}`).join("\n");
}

export function registerChatCommands(chatCommand: Command, deps: ChatCommandDeps = {}): void {
  const resolvedDeps: Required<ChatCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  chatCommand
    .command("spaces")
    .description("List chat spaces")
    .action(async function actionSpaces(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      await resolvedDeps.ensureWorkspace();
      const spaces = await runWithStableApiError("chat", () => resolvedDeps.listSpaces());
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ spaces }, null, 2)}\n`);
        return;
      }
      if (spaces.length === 0) {
        process.stdout.write("No spaces found\n");
        return;
      }
      process.stdout.write(spaces.map((space) => `${space.id}\t${space.displayName}`).join("\n") + "\n");
    });

  chatCommand
    .command("get-space")
    .description("Get chat space")
    .requiredOption("--space <spaceId>", "Space id")
    .action(async function actionGetSpace(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ space: string }>();
      await resolvedDeps.ensureWorkspace();
      const space = await runWithStableApiError("chat", () => resolvedDeps.getSpace(opts.space));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(space, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${space.id}\t${space.displayName}\n`);
    });

  chatCommand
    .command("create-space")
    .description("Create chat space")
    .requiredOption("--name <displayName>", "Space display name")
    .action(async function actionCreateSpace(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string }>();
      await resolvedDeps.ensureWorkspace();
      const result = await runWithStableApiError("chat", () => resolvedDeps.createSpace(opts.name));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.created ? `Space created (${result.id || "unknown"})\n` : "Space create was not applied\n");
    });

  chatCommand
    .command("messages")
    .description("List chat messages in a space")
    .requiredOption("--space <spaceId>", "Space id")
    .action(async function actionMessages(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ space: string }>();
      await resolvedDeps.ensureWorkspace();
      const messages = await runWithStableApiError("chat", () => resolvedDeps.listMessages(opts.space));
      process.stdout.write(`${formatChatMessages(messages, ctx.output.mode)}\n`);
    });

  chatCommand
    .command("send")
    .description("Send chat message to a space or directly to a user by email")
    .option("--space <spaceId>", "Space id")
    .option("--to <email>", "Recipient email (sends as direct message)")
    .requiredOption("--text <text>", "Message text")
    .action(async function actionSend(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ space?: string; to?: string; text: string }>();

      if (!opts.space && !opts.to) {
        throw new Error("Either --space or --to is required");
      }
      if (opts.space && opts.to) {
        throw new Error("Cannot combine --space and --to; use one or the other");
      }

      await resolvedDeps.ensureWorkspace();

      let targetSpace = opts.space ?? "";

      if (opts.to) {
        // Resolve email to a DM space: try finding existing, otherwise set one up
        const existing = await runWithStableApiError("chat", () => resolvedDeps.findDirectMessage(opts.to!));
        if (existing) {
          targetSpace = existing.id;
        } else {
          const created = await runWithStableApiError("chat", () => resolvedDeps.setupDirectMessage(opts.to!));
          targetSpace = created.id;
        }
      }

      const result = await runWithStableApiError("chat", () => resolvedDeps.sendMessage(targetSpace, opts.text));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.sent ? `Message sent (${result.id || "unknown"})\n` : "Message send was not applied\n");
    })
    .addHelpText("after", "\nExamples:\n  gtypee chat send --to user@example.com --text \"Hello!\"\n  gtypee chat send --space spaces/ABC123 --text \"Hello!\"");
}
