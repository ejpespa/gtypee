import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export type ContactSummary = {
  resourceName: string;
  email: string;
};

export type ContactsCommandDeps = {
  listContacts?: (options?: PaginationOptions) => Promise<PaginatedResult<ContactSummary>>;
  searchContacts?: (query: string) => Promise<ContactSummary[]>;
  getContact?: (resourceName: string) => Promise<ContactSummary>;
  updateContact?: (resourceName: string, email: string) => Promise<{ resourceName: string; updated: boolean }>;
};

const defaultDeps: Required<ContactsCommandDeps> = {
  listContacts: async () => ({ items: [] }),
  searchContacts: async () => [],
  getContact: async (resourceName) => ({ resourceName, email: "" }),
  updateContact: async (resourceName) => ({ resourceName, updated: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

function asPaginatedResult(items: ContactSummary[]): PaginatedResult<ContactSummary> {
  return { items };
}

export function formatContactsList(result: PaginatedResult<ContactSummary>, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  const contacts = result.items;
  if (contacts.length === 0) {
    return "No contacts found";
  }
  const lines = contacts.map((contact) => `${contact.resourceName}\t${contact.email}`);
  if (result.nextPageToken) {
    lines.push("---");
    lines.push(`Next page token: ${result.nextPageToken}`);
  }
  return lines.join("\n");
}

export function registerContactsCommands(contactsCommand: Command, deps: ContactsCommandDeps = {}): void {
  const resolvedDeps: Required<ContactsCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  contactsCommand
    .command("list")
    .description("List contacts")
    .option("--page-size <number>", "Number of contacts per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: number; pageToken?: string }>();
      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;
      const result = await runWithStableApiError("contacts", () =>
        resolvedDeps.listContacts(paginationOpts)
      );
      process.stdout.write(`${formatContactsList(result, ctx.output.mode)}\n`);
    });

  contactsCommand
    .command("search")
    .description("Search contacts")
    .requiredOption("--query <query>", "Search query")
    .action(async function actionSearch(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query: string }>();
      const contacts = await runWithStableApiError("contacts", () => resolvedDeps.searchContacts(opts.query));
      process.stdout.write(`${formatContactsList(asPaginatedResult(contacts), ctx.output.mode)}\n`);
    });

  contactsCommand
    .command("get")
    .description("Get contact by resource name")
    .requiredOption("--resource <resourceName>", "Contact resource name")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ resource: string }>();
      const contact = await runWithStableApiError("contacts", () => resolvedDeps.getContact(opts.resource));
      process.stdout.write(`${formatContactsList(asPaginatedResult([contact]), ctx.output.mode)}\n`);
    });

  contactsCommand
    .command("update")
    .description("Update contact email")
    .requiredOption("--resource <resourceName>", "Contact resource name")
    .requiredOption("--email <email>", "New contact email")
    .action(async function actionUpdate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ resource: string; email: string }>();
      const result = await runWithStableApiError("contacts", () => resolvedDeps.updateContact(opts.resource, opts.email));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.updated ? `Contact updated (${result.resourceName})\n` : "Contact update was not applied\n");
    });
}
