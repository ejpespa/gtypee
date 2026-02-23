import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type PersonProfile = {
  resourceName?: string;
  email: string;
  displayName: string;
};

export type PeopleCommandDeps = {
  me?: () => Promise<PersonProfile>;
  search?: (query: string) => Promise<PersonProfile[]>;
  getPerson?: (resourceName: string) => Promise<PersonProfile>;
  updatePerson?: (resourceName: string, input: { displayName?: string; email?: string }) => Promise<{ resourceName: string; updated: boolean }>;
};

const defaultDeps: Required<PeopleCommandDeps> = {
  me: async () => ({ email: "", displayName: "" }),
  search: async () => [],
  getPerson: async () => ({ email: "", displayName: "" }),
  updatePerson: async (resourceName) => ({ resourceName, updated: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatPeopleMe(profile: PersonProfile, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(profile, null, 2);
  }
  return `${profile.displayName} <${profile.email}>`;
}

export function registerPeopleCommands(peopleCommand: Command, deps: PeopleCommandDeps = {}): void {
  const resolvedDeps: Required<PeopleCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  peopleCommand
    .command("me")
    .description("Show your profile")
    .action(async function actionMe(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const profile = await runWithStableApiError("people", () => resolvedDeps.me());
      process.stdout.write(`${formatPeopleMe(profile, ctx.output.mode)}\n`);
    });

  peopleCommand
    .command("search")
    .description("Search people")
    .requiredOption("--query <query>", "Search query")
    .action(async function actionSearch(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query: string }>();
      const people = await runWithStableApiError("people", () => resolvedDeps.search(opts.query));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ people }, null, 2)}\n`);
        return;
      }
      if (people.length === 0) {
        process.stdout.write("No people found\n");
        return;
      }
      process.stdout.write(people.map((person) => `${person.displayName}\t${person.email}`).join("\n") + "\n");
    });

  peopleCommand
    .command("get")
    .description("Get person by resource name")
    .requiredOption("--resource <resourceName>", "Person resource name")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ resource: string }>();
      const person = await runWithStableApiError("people", () => resolvedDeps.getPerson(opts.resource));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(person, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${person.displayName}\t${person.email}\n`);
    });

  peopleCommand
    .command("update")
    .description("Update person profile")
    .requiredOption("--resource <resourceName>", "Person resource name")
    .option("--name <displayName>", "Display name")
    .option("--email <email>", "Primary email")
    .action(async function actionUpdate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ resource: string; name?: string; email?: string }>();
      const input: { displayName?: string; email?: string } = {};
      if (opts.name !== undefined) {
        input.displayName = opts.name;
      }
      if (opts.email !== undefined) {
        input.email = opts.email;
      }
      const result = await runWithStableApiError("people", () => resolvedDeps.updatePerson(opts.resource, input));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.updated ? `Person updated (${result.resourceName})\n` : "Person update was not applied\n");
    });
}
