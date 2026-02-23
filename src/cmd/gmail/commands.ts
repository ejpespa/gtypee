import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { defaultGmailListQuery } from "../../googleapi/client.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  subject: string;
};

export type GmailSendResult = {
  id: string;
  threadId: string;
  accepted: boolean;
};

export type GmailLabelSummary = {
  id: string;
  name: string;
};

export type GmailMessageDetail = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
};

export type GmailDeleteResult = {
  id: string;
  applied: boolean;
};

export type GmailTrashResult = {
  id: string;
  applied: boolean;
};

export type GmailUntrashResult = {
  id: string;
  applied: boolean;
};

export type GmailModifyResult = {
  id: string;
  addedLabels: string[];
  removedLabels: string[];
  applied: boolean;
};

// Draft types
export type GmailDraftSummary = {
  id: string;
  message: GmailMessageSummary;
};

export type GmailDraftDetail = {
  id: string;
  message: GmailMessageDetail;
};

export type GmailDraftCreateResult = {
  id: string;
  message: GmailMessageSummary;
  applied: boolean;
};

export type GmailDraftSendResult = {
  id: string;
  threadId: string;
  sent: boolean;
};

// Thread types
export type GmailThreadSummary = {
  id: string;
  snippet: string;
  messageCount: number;
};

export type GmailThreadDetail = {
  id: string;
  messages: GmailMessageDetail[];
};

// Label CRUD types
export type GmailLabelDetail = {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
};

export type GmailLabelCreateResult = {
  id: string;
  name: string;
  applied: boolean;
};

export type GmailLabelUpdateResult = {
  id: string;
  name: string;
  applied: boolean;
};

export type GmailLabelDeleteResult = {
  id: string;
  applied: boolean;
};

// Filter types
export type GmailFilterSummary = {
  id: string;
  query: string;
  addLabelIds: string[];
};

export type GmailFilterCreateResult = {
  id: string;
  query: string;
  addLabelIds: string[];
  applied: boolean;
};

export type GmailFilterDeleteResult = {
  id: string;
  applied: boolean;
};

// Signature types
export type GmailSendAsAlias = {
  sendAsEmail: string;
  displayName?: string;
  isPrimary: boolean;
  signature?: string;
  isDefault?: boolean;
  treatAsAlias?: boolean;
  verificationStatus?: string;
};

export type GmailSignatureSetResult = {
  email: string;
  applied: boolean;
};

export type GmailCommandDeps = {
  sendEmail?: (input: { to: string; subject: string; body: string }) => Promise<GmailSendResult>;
  searchEmails?: (query: string) => Promise<GmailMessageSummary[]>;
  listLabels?: () => Promise<GmailLabelSummary[]>;
  getMessage?: (messageId: string) => Promise<GmailMessageDetail>;
  deleteMessage?: (messageId: string) => Promise<GmailDeleteResult>;
  trashMessage?: (messageId: string) => Promise<GmailTrashResult>;
  untrashMessage?: (messageId: string) => Promise<GmailUntrashResult>;
  modifyMessage?: (messageId: string, addLabels?: string[], removeLabels?: string[]) => Promise<GmailModifyResult>;
};

export type GmailDraftDeps = {
  createDraft?: (input: { to: string; subject: string; body: string }) => Promise<GmailDraftCreateResult>;
  listDrafts?: () => Promise<GmailDraftSummary[]>;
  getDraft?: (draftId: string) => Promise<GmailDraftDetail>;
  deleteDraft?: (draftId: string) => Promise<GmailDeleteResult>;
  sendDraft?: (draftId: string) => Promise<GmailDraftSendResult>;
};

export type GmailThreadDeps = {
  listThreads?: (query?: string) => Promise<GmailThreadSummary[]>;
  getThread?: (threadId: string) => Promise<GmailThreadDetail>;
};

export type GmailLabelDeps = {
  createLabel?: (input: { name: string; textColor?: string; backgroundColor?: string }) => Promise<GmailLabelCreateResult>;
  getLabel?: (labelId: string) => Promise<GmailLabelDetail>;
  updateLabel?: (labelId: string, name: string, textColor?: string, backgroundColor?: string) => Promise<GmailLabelUpdateResult>;
  deleteLabel?: (labelId: string) => Promise<GmailLabelDeleteResult>;
};

export type GmailFilterDeps = {
  listFilters?: () => Promise<GmailFilterSummary[]>;
  createFilter?: (query: string, addLabelIds: string[]) => Promise<GmailFilterCreateResult>;
  deleteFilter?: (filterId: string) => Promise<GmailFilterDeleteResult>;
};

export type GmailSignatureDeps = {
  listSendAs?: () => Promise<GmailSendAsAlias[]>;
  getSendAs?: (email: string) => Promise<GmailSendAsAlias>;
  setSignature?: (email: string, signature: string) => Promise<GmailSignatureSetResult>;
};

const defaultDeps: Required<GmailCommandDeps> = {
  sendEmail: async () => ({
    id: "",
    threadId: "",
    accepted: false,
  }),
  searchEmails: async () => [],
  listLabels: async () => [],
  getMessage: async () => ({
    id: "",
    threadId: "",
    from: "",
    to: "",
    subject: "",
    date: "",
    body: "",
  }),
  deleteMessage: async () => ({
    id: "",
    applied: false,
  }),
  trashMessage: async () => ({
    id: "",
    applied: false,
  }),
  untrashMessage: async () => ({
    id: "",
    applied: false,
  }),
  modifyMessage: async () => ({
    id: "",
    addedLabels: [],
    removedLabels: [],
    applied: false,
  }),
};

const defaultDraftDeps: Required<GmailDraftDeps> = {
  createDraft: async () => ({
    id: "",
    message: { id: "", threadId: "", subject: "" },
    applied: false,
  }),
  listDrafts: async () => [],
  getDraft: async () => ({
    id: "",
    message: { id: "", threadId: "", from: "", to: "", subject: "", date: "", body: "" },
  }),
  deleteDraft: async () => ({
    id: "",
    applied: false,
  }),
  sendDraft: async () => ({
    id: "",
    threadId: "",
    sent: false,
  }),
};

const defaultThreadDeps: Required<GmailThreadDeps> = {
  listThreads: async () => [],
  getThread: async () => ({
    id: "",
    messages: [],
  }),
};

const defaultLabelDeps: Required<GmailLabelDeps> = {
  createLabel: async () => ({
    id: "",
    name: "",
    applied: false,
  }),
  getLabel: async () => ({
    id: "",
    name: "",
    type: "",
  }),
  updateLabel: async () => ({
    id: "",
    name: "",
    applied: false,
  }),
  deleteLabel: async () => ({
    id: "",
    applied: false,
  }),
};

const defaultFilterDeps: Required<GmailFilterDeps> = {
  listFilters: async () => [],
  createFilter: async () => ({
    id: "",
    query: "",
    addLabelIds: [],
    applied: false,
  }),
  deleteFilter: async () => ({
    id: "",
    applied: false,
  }),
};

const defaultSignatureDeps: Required<GmailSignatureDeps> = {
  listSendAs: async () => [],
  getSendAs: async () => ({
    sendAsEmail: "",
    isPrimary: false,
  }),
  setSignature: async () => ({
    email: "",
    applied: false,
  }),
};

export function formatGmailLabels(labels: GmailLabelSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ labels }, null, 2);
  }

  if (labels.length === 0) {
    return "No labels found";
  }

  const lines = ["ID\tNAME"];
  for (const label of labels) {
    lines.push(`${label.id}\t${label.name}`);
  }
  return lines.join("\n");
}

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatGmailSearchResult(messages: GmailMessageSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ messages }, null, 2);
  }

  if (messages.length === 0) {
    return "No messages found";
  }

  const lines = ["ID\tTHREAD\tSUBJECT"];
  for (const message of messages) {
    lines.push(`${message.id}\t${message.threadId}\t${message.subject}`);
  }
  return lines.join("\n");
}

export function formatGmailMessageDetail(message: GmailMessageDetail, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(message, null, 2);
  }

  const lines = [
    `Message-ID: ${message.id}`,
    `Thread-ID: ${message.threadId}`,
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    `Date: ${message.date}`,
    "",
    message.body,
  ];
  return lines.join("\n");
}

// Formatter functions for new types
export function formatGmailDrafts(drafts: GmailDraftSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ drafts }, null, 2);
  }

  if (drafts.length === 0) {
    return "No drafts found";
  }

  const lines = ["DRAFT-ID\tMESSAGE-ID\tSUBJECT"];
  for (const draft of drafts) {
    lines.push(`${draft.id}\t${draft.message.id}\t${draft.message.subject}`);
  }
  return lines.join("\n");
}

export function formatGmailDraftDetail(draft: GmailDraftDetail, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(draft, null, 2);
  }

  const lines = [
    `Draft-ID: ${draft.id}`,
    `Message-ID: ${draft.message.id}`,
    `Thread-ID: ${draft.message.threadId}`,
    `From: ${draft.message.from}`,
    `To: ${draft.message.to}`,
    `Subject: ${draft.message.subject}`,
    `Date: ${draft.message.date}`,
    "",
    draft.message.body,
  ];
  return lines.join("\n");
}

export function formatGmailThreads(threads: GmailThreadSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ threads }, null, 2);
  }

  if (threads.length === 0) {
    return "No threads found";
  }

  const lines = ["THREAD-ID\tMESSAGES\tSNIPPET"];
  for (const thread of threads) {
    const snippet = thread.snippet.length > 50 ? thread.snippet.substring(0, 47) + "..." : thread.snippet;
    lines.push(`${thread.id}\t${thread.messageCount}\t${snippet}`);
  }
  return lines.join("\n");
}

export function formatGmailThreadDetail(thread: GmailThreadDetail, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(thread, null, 2);
  }

  const lines = [`Thread-ID: ${thread.id}`, `Messages: ${thread.messages.length}`, ""];
  for (let i = 0; i < thread.messages.length; i++) {
    const msg = thread.messages[i];
    if (!msg) continue;
    lines.push(`--- Message ${i + 1} ---`);
    lines.push(`From: ${msg.from}`);
    lines.push(`To: ${msg.to}`);
    lines.push(`Subject: ${msg.subject}`);
    lines.push(`Date: ${msg.date}`);
    lines.push("");
    lines.push(msg.body);
    lines.push("");
  }
  return lines.join("\n");
}

export function formatGmailLabelDetail(label: GmailLabelDetail, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(label, null, 2);
  }

  const lines = [
    `ID: ${label.id}`,
    `Name: ${label.name}`,
    `Type: ${label.type}`,
  ];
  if (label.messagesTotal !== undefined) {
    lines.push(`Total Messages: ${label.messagesTotal}`);
  }
  if (label.messagesUnread !== undefined) {
    lines.push(`Unread Messages: ${label.messagesUnread}`);
  }
  if (label.threadsTotal !== undefined) {
    lines.push(`Total Threads: ${label.threadsTotal}`);
  }
  if (label.threadsUnread !== undefined) {
    lines.push(`Unread Threads: ${label.threadsUnread}`);
  }
  if (label.color) {
    lines.push(`Color: ${label.color.backgroundColor} / ${label.color.textColor}`);
  }
  return lines.join("\n");
}

export function formatGmailFilters(filters: GmailFilterSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ filters }, null, 2);
  }

  if (filters.length === 0) {
    return "No filters found";
  }

  const lines = ["FILTER-ID\tQUERY\tADD-LABELS"];
  for (const filter of filters) {
    lines.push(`${filter.id}\t${filter.query}\t${filter.addLabelIds.join(",")}`);
  }
  return lines.join("\n");
}

export function formatGmailSendAsAliases(aliases: GmailSendAsAlias[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ aliases }, null, 2);
  }

  if (aliases.length === 0) {
    return "No send-as aliases found";
  }

  const lines = ["EMAIL\tDISPLAY-NAME\tPRIMARY\tDEFAULT"];
  for (const alias of aliases) {
    const primary = alias.isPrimary ? "yes" : "no";
    const isDefault = alias.isDefault ? "yes" : "no";
    lines.push(`${alias.sendAsEmail}\t${alias.displayName || ""}\t${primary}\t${isDefault}`);
  }
  return lines.join("\n");
}

export function formatGmailSendAsAlias(alias: GmailSendAsAlias, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(alias, null, 2);
  }

  const lines = [
    `Email: ${alias.sendAsEmail}`,
    `Display Name: ${alias.displayName || "(none)"}`,
    `Primary: ${alias.isPrimary ? "yes" : "no"}`,
    `Default: ${alias.isDefault ? "yes" : "no"}`,
    `Treat as Alias: ${alias.treatAsAlias ? "yes" : "no"}`,
    `Verification Status: ${alias.verificationStatus || "unknown"}`,
    "",
    "Signature:",
    alias.signature || "(no signature)",
  ];
  return lines.join("\n");
}

export function registerGmailCommands(
  gmailCommand: Command,
  deps: GmailCommandDeps & GmailDraftDeps & GmailThreadDeps & GmailLabelDeps & GmailFilterDeps & GmailSignatureDeps = {},
): void {
  const resolvedDeps: Required<GmailCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };
  const draftDeps: Required<GmailDraftDeps> = { ...defaultDraftDeps, ...deps };
  const threadDeps: Required<GmailThreadDeps> = { ...defaultThreadDeps, ...deps };
  const labelDeps: Required<GmailLabelDeps> = { ...defaultLabelDeps, ...deps };
  const filterDeps: Required<GmailFilterDeps> = { ...defaultFilterDeps, ...deps };
  const signatureDeps: Required<GmailSignatureDeps> = { ...defaultSignatureDeps, ...deps };

  gmailCommand
    .command("send")
    .description("Send an email")
    .requiredOption("--to <email>", "Recipient email")
    .requiredOption("--subject <subject>", "Email subject")
    .requiredOption("--body <body>", "Email body")
    .action(async function actionSend(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ to: string; subject: string; body: string }>();
      const result = await runWithStableApiError("gmail", () =>
        resolvedDeps.sendEmail({
          to: opts.to,
          subject: opts.subject,
          body: opts.body,
        }),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.accepted ? `Message sent (id=${result.id || "unknown"})\n` : "Message was not accepted by Gmail\n");
    });

  gmailCommand
    .command("list")
    .description("List messages")
    .option("--query <query>", "Gmail search query")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query?: string }>();
      const query = defaultGmailListQuery(opts.query);
      const messages = await runWithStableApiError("gmail", () => resolvedDeps.searchEmails(query));
      process.stdout.write(`${formatGmailSearchResult(messages, ctx.output.mode)}\n`);
    });

  gmailCommand
    .command("search")
    .description("Search messages")
    .requiredOption("--query <query>", "Gmail search query")
    .action(async function actionSearch(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query: string }>();
      const messages = await runWithStableApiError("gmail", () => resolvedDeps.searchEmails(opts.query));
      process.stdout.write(`${formatGmailSearchResult(messages, ctx.output.mode)}\n`);
    });

  gmailCommand
    .command("labels")
    .description("List Gmail labels")
    .action(async function actionLabels(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const labels = await runWithStableApiError("gmail", () => resolvedDeps.listLabels());
      process.stdout.write(`${formatGmailLabels(labels, ctx.output.mode)}\n`);
    });

  // gmail get <message-id>
  gmailCommand
    .command("get")
    .description("Get full message content")
    .argument("<message-id>", "Message ID")
    .action(async function actionGet(this: Command, messageId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const message = await runWithStableApiError("gmail", () => resolvedDeps.getMessage(messageId));
      process.stdout.write(`${formatGmailMessageDetail(message, ctx.output.mode)}\n`);
    });

  // gmail delete <message-id>
  gmailCommand
    .command("delete")
    .description("Permanently delete a message")
    .argument("<message-id>", "Message ID")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDelete(this: Command, messageId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ force: boolean }>();

      if (!opts.force) {
        process.stdout.write(`Permanently delete message ${messageId}? Use --force to confirm\n`);
        return;
      }

      const result = await runWithStableApiError("gmail", () => resolvedDeps.deleteMessage(messageId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Message deleted: ${result.id}\n` : "Failed to delete message\n");
    });

  // gmail trash <message-id>
  gmailCommand
    .command("trash")
    .description("Move a message to trash")
    .argument("<message-id>", "Message ID")
    .action(async function actionTrash(this: Command, messageId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("gmail", () => resolvedDeps.trashMessage(messageId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Message moved to trash: ${result.id}\n` : "Failed to trash message\n");
    });

  // gmail untrash <message-id>
  gmailCommand
    .command("untrash")
    .description("Restore a message from trash")
    .argument("<message-id>", "Message ID")
    .action(async function actionUntrash(this: Command, messageId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("gmail", () => resolvedDeps.untrashMessage(messageId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Message restored from trash: ${result.id}\n` : "Failed to untrash message\n");
    });

  // gmail modify <message-id>
  gmailCommand
    .command("modify")
    .description("Modify message labels")
    .argument("<message-id>", "Message ID")
    .option("--add-label <id>", "Label ID to add (can be repeated)", (val: string, prev: string[] = []) => [...prev, val])
    .option("--remove-label <id>", "Label ID to remove (can be repeated)", (val: string, prev: string[] = []) => [...prev, val])
    .action(async function actionModify(this: Command, messageId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ addLabel?: string[]; removeLabel?: string[] }>();

      const addLabels = opts.addLabel ?? [];
      const removeLabels = opts.removeLabel ?? [];

      if (addLabels.length === 0 && removeLabels.length === 0) {
        process.stdout.write("No labels specified. Use --add-label and/or --remove-label\n");
        return;
      }

      const result = await runWithStableApiError("gmail", () => resolvedDeps.modifyMessage(messageId, addLabels, removeLabels));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.applied) {
        process.stdout.write(`Message labels modified: ${result.id}\n`);
        if (result.addedLabels.length > 0) {
          process.stdout.write(`  Added: ${result.addedLabels.join(", ")}\n`);
        }
        if (result.removedLabels.length > 0) {
          process.stdout.write(`  Removed: ${result.removedLabels.join(", ")}\n`);
        }
      } else {
        process.stdout.write("Failed to modify message labels\n");
      }
    });

  // ========================
  // Draft commands (gmail draft)
  // ========================
  const draftCmd = gmailCommand.command("draft").description("Draft management");

  // gmail draft create --to <email> --subject <subj> --body <text>
  draftCmd
    .command("create")
    .description("Create a draft email")
    .requiredOption("--to <email>", "Recipient email")
    .requiredOption("--subject <subject>", "Email subject")
    .requiredOption("--body <body>", "Email body")
    .action(async function actionCreateDraft(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ to: string; subject: string; body: string }>();
      const result = await runWithStableApiError("gmail", () =>
        draftDeps.createDraft({
          to: opts.to,
          subject: opts.subject,
          body: opts.body,
        }),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Draft created (id=${result.id})\n` : "Failed to create draft\n");
    });

  // gmail draft list
  draftCmd
    .command("list")
    .description("List all drafts")
    .action(async function actionListDrafts(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const drafts = await runWithStableApiError("gmail", () => draftDeps.listDrafts());
      process.stdout.write(`${formatGmailDrafts(drafts, ctx.output.mode)}\n`);
    });

  // gmail draft get <draft-id>
  draftCmd
    .command("get")
    .description("Get draft details")
    .argument("<draft-id>", "Draft ID")
    .action(async function actionGetDraft(this: Command, draftId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const draft = await runWithStableApiError("gmail", () => draftDeps.getDraft(draftId));
      process.stdout.write(`${formatGmailDraftDetail(draft, ctx.output.mode)}\n`);
    });

  // gmail draft delete <draft-id>
  draftCmd
    .command("delete")
    .description("Delete a draft")
    .argument("<draft-id>", "Draft ID")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDeleteDraft(this: Command, draftId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ force: boolean }>();

      if (!opts.force) {
        process.stdout.write(`Delete draft ${draftId}? Use --force to confirm\n`);
        return;
      }

      const result = await runWithStableApiError("gmail", () => draftDeps.deleteDraft(draftId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Draft deleted: ${result.id}\n` : "Failed to delete draft\n");
    });

  // gmail draft send <draft-id>
  draftCmd
    .command("send")
    .description("Send a draft")
    .argument("<draft-id>", "Draft ID")
    .action(async function actionSendDraft(this: Command, draftId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("gmail", () => draftDeps.sendDraft(draftId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.sent ? `Draft sent (id=${result.id}, thread=${result.threadId})\n` : "Failed to send draft\n");
    });

  // ========================
  // Thread commands (gmail thread)
  // ========================
  const threadCmd = gmailCommand.command("thread").description("Thread management");

  // gmail thread list [--query <query>]
  threadCmd
    .command("list")
    .description("List email threads")
    .option("--query <query>", "Gmail search query")
    .action(async function actionListThreads(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query?: string }>();
      const threads = await runWithStableApiError("gmail", () => threadDeps.listThreads(opts.query));
      process.stdout.write(`${formatGmailThreads(threads, ctx.output.mode)}\n`);
    });

  // gmail thread get <thread-id>
  threadCmd
    .command("get")
    .description("Get all messages in a thread")
    .argument("<thread-id>", "Thread ID")
    .action(async function actionGetThread(this: Command, threadId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const thread = await runWithStableApiError("gmail", () => threadDeps.getThread(threadId));
      process.stdout.write(`${formatGmailThreadDetail(thread, ctx.output.mode)}\n`);
    });

  // ========================
  // Label CRUD commands (gmail label)
  // ========================
  const labelCmd = gmailCommand.command("label").description("Label management");

  // gmail label create --name <name> [--color <bg:text>]
  labelCmd
    .command("create")
    .description("Create a label")
    .requiredOption("--name <name>", "Label name")
    .option("--color <color>", "Label color (format: backgroundColor:textColor)")
    .action(async function actionCreateLabel(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string; color?: string }>();

      let textColor: string | undefined;
      let backgroundColor: string | undefined;
      if (opts.color) {
        const parts = opts.color.split(":");
        if (parts.length === 2) {
          backgroundColor = parts[0];
          textColor = parts[1];
        } else {
          backgroundColor = opts.color;
        }
      }

      const result = await runWithStableApiError("gmail", () => {
        const input: { name: string; textColor?: string; backgroundColor?: string } = { name: opts.name };
        if (textColor && backgroundColor) {
          input.textColor = textColor;
          input.backgroundColor = backgroundColor;
        }
        return labelDeps.createLabel(input);
      });

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Label created: ${result.name} (id=${result.id})\n` : "Failed to create label\n");
    });

  // gmail label get <label-id>
  labelCmd
    .command("get")
    .description("Get label details with counts")
    .argument("<label-id>", "Label ID")
    .action(async function actionGetLabel(this: Command, labelId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const label = await runWithStableApiError("gmail", () => labelDeps.getLabel(labelId));
      process.stdout.write(`${formatGmailLabelDetail(label, ctx.output.mode)}\n`);
    });

  // gmail label update <label-id> --name <name> [--color <bg:text>]
  labelCmd
    .command("update")
    .description("Update a label")
    .argument("<label-id>", "Label ID")
    .requiredOption("--name <name>", "New label name")
    .option("--color <color>", "Label color (format: backgroundColor:textColor)")
    .action(async function actionUpdateLabel(this: Command, labelId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string; color?: string }>();

      let textColor: string | undefined;
      let backgroundColor: string | undefined;
      if (opts.color) {
        const parts = opts.color.split(":");
        if (parts.length === 2) {
          backgroundColor = parts[0];
          textColor = parts[1];
        } else {
          backgroundColor = opts.color;
        }
      }

      const result = await runWithStableApiError("gmail", () =>
        labelDeps.updateLabel(labelId, opts.name, textColor, backgroundColor),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Label updated: ${result.name} (id=${result.id})\n` : "Failed to update label\n");
    });

  // gmail label delete <label-id>
  labelCmd
    .command("delete")
    .description("Delete a custom label")
    .argument("<label-id>", "Label ID")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDeleteLabel(this: Command, labelId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ force: boolean }>();

      if (!opts.force) {
        process.stdout.write(`Delete label ${labelId}? Use --force to confirm\n`);
        return;
      }

      const result = await runWithStableApiError("gmail", () => labelDeps.deleteLabel(labelId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Label deleted: ${result.id}\n` : "Failed to delete label\n");
    });

  // ========================
  // Filter commands (gmail filter)
  // ========================
  const filterCmd = gmailCommand.command("filter").description("Filter management");

  // gmail filter list
  filterCmd
    .command("list")
    .description("List all filters")
    .action(async function actionListFilters(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const filters = await runWithStableApiError("gmail", () => filterDeps.listFilters());
      process.stdout.write(`${formatGmailFilters(filters, ctx.output.mode)}\n`);
    });

  // gmail filter create --query <query> --add-label <id>
  filterCmd
    .command("create")
    .description("Create a filter")
    .requiredOption("--query <query>", "Filter query")
    .requiredOption("--add-label <id>", "Label ID to add (can be repeated)", (val: string, prev: string[] = []) => [...prev, val])
    .action(async function actionCreateFilter(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query: string; addLabel: string[] }>();

      const result = await runWithStableApiError("gmail", () =>
        filterDeps.createFilter(opts.query, opts.addLabel),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Filter created (id=${result.id})\n` : "Failed to create filter\n");
    });

  // gmail filter delete <filter-id>
  filterCmd
    .command("delete")
    .description("Delete a filter")
    .argument("<filter-id>", "Filter ID")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDeleteFilter(this: Command, filterId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ force: boolean }>();

      if (!opts.force) {
        process.stdout.write(`Delete filter ${filterId}? Use --force to confirm\n`);
        return;
      }

      const result = await runWithStableApiError("gmail", () => filterDeps.deleteFilter(filterId));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Filter deleted: ${result.id}\n` : "Failed to delete filter\n");
    });

  // ========================
  // Signature commands (gmail signature)
  // ========================
  const signatureCmd = gmailCommand.command("signature").description("Signature management");

  // gmail signature list
  signatureCmd
    .command("list")
    .description("List send-as aliases with signatures")
    .action(async function actionListSignatures(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const aliases = await runWithStableApiError("gmail", () => signatureDeps.listSendAs());
      process.stdout.write(`${formatGmailSendAsAliases(aliases, ctx.output.mode)}\n`);
    });

  // gmail signature get --email <alias>
  signatureCmd
    .command("get")
    .description("Get signature for alias")
    .requiredOption("--email <alias>", "Send-as email alias")
    .action(async function actionGetSignature(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();
      const alias = await runWithStableApiError("gmail", () => signatureDeps.getSendAs(opts.email));
      process.stdout.write(`${formatGmailSendAsAlias(alias, ctx.output.mode)}\n`);
    });

  // gmail signature set --email <alias> --signature <text>
  signatureCmd
    .command("set")
    .description("Set signature for alias")
    .requiredOption("--email <alias>", "Send-as email alias")
    .requiredOption("--signature <text>", "Signature text")
    .action(async function actionSetSignature(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; signature: string }>();
      const result = await runWithStableApiError("gmail", () =>
        signatureDeps.setSignature(opts.email, opts.signature),
      );

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Signature set for ${result.email}\n` : "Failed to set signature\n");
    });
}
