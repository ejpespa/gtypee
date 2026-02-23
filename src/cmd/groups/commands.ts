import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";

export type GroupSummary = {
  name: string;
  groupKey: string;
};

export type GroupsCommandDeps = {
  listGroups?: () => Promise<GroupSummary[]>;
  listMembers?: (group: string) => Promise<Array<{ email: string; role: string }>>;
  getGroup?: (group: string) => Promise<GroupSummary>;
  addMember?: (group: string, email: string, role: string) => Promise<{ groupKey: string; email: string; role: string; applied: boolean }>;
  removeMember?: (group: string, email: string) => Promise<{ applied: boolean }>;
};

const defaultDeps: Required<GroupsCommandDeps> = {
  listGroups: async () => [],
  listMembers: async () => [],
  getGroup: async (group) => ({ name: "", groupKey: group }),
  addMember: async (group, email, role) => ({ groupKey: group, email, role, applied: false }),
  removeMember: async () => ({ applied: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatGroupsList(groups: GroupSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ groups }, null, 2);
  }
  if (groups.length === 0) {
    return "No groups found";
  }
  return groups.map((group) => `${group.groupKey}\t${group.name}`).join("\n");
}

export function registerGroupsCommands(groupsCommand: Command, deps: GroupsCommandDeps = {}): void {
  const resolvedDeps: Required<GroupsCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };

  groupsCommand
    .command("list")
    .description("List groups")
    .action(async function actionList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const groups = await runWithStableApiError("groups", () => resolvedDeps.listGroups());
      process.stdout.write(`${formatGroupsList(groups, ctx.output.mode)}\n`);
    });

  groupsCommand
    .command("get")
    .description("Get group details")
    .requiredOption("--group <groupKey>", "Group key")
    .action(async function actionGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string }>();
      const group = await runWithStableApiError("groups", () => resolvedDeps.getGroup(opts.group));
      process.stdout.write(`${formatGroupsList([group], ctx.output.mode)}\n`);
    });

  groupsCommand
    .command("members")
    .description("List group members")
    .requiredOption("--group <groupKey>", "Group key")
    .action(async function actionMembers(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string }>();
      const members = await runWithStableApiError("groups", () => resolvedDeps.listMembers(opts.group));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ members }, null, 2)}\n`);
        return;
      }
      if (members.length === 0) {
        process.stdout.write("No members found\n");
        return;
      }
      process.stdout.write(members.map((member) => `${member.email}\t${member.role}`).join("\n") + "\n");
    });

  groupsCommand
    .command("add-member")
    .description("Add member to group")
    .requiredOption("--group <groupKey>", "Group key")
    .requiredOption("--email <email>", "Member email")
    .option("--role <role>", "Member role", "MEMBER")
    .action(async function actionAddMember(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string; email: string; role: string }>();
      const result = await runWithStableApiError("groups", () => resolvedDeps.addMember(opts.group, opts.email, opts.role));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Member added (${result.email})\n` : "Member add was not applied\n");
    });

  groupsCommand
    .command("remove-member")
    .description("Remove member from group")
    .requiredOption("--group <groupKey>", "Group key")
    .requiredOption("--email <email>", "Member email")
    .action(async function actionRemoveMember(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string; email: string }>();
      const result = await runWithStableApiError("groups", () => resolvedDeps.removeMember(opts.group, opts.email));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Member removed (${opts.email})\n` : "Member removal was not applied\n");
    });
}
