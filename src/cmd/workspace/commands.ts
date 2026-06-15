import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { DeletedUsersTui } from "./DeletedUsersTui.js";

import { buildExecutionContext, stderr, type RootOptions } from "../execution-context.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export type WorkspaceUserCommandDeps = {
  listUsers?: (orgUnitPath?: string, options?: PaginationOptions) => Promise<PaginatedResult<WorkspaceUser>>;
  createUser?: (input: CreateUserInput) => Promise<CreateUserResult>;
  deleteUser?: (email: string) => Promise<DeleteUserResult>;
  suspendUser?: (email: string) => Promise<SuspendUserResult>;
  unsuspendUser?: (email: string) => Promise<UnsuspendUserResult>;
  setAdmin?: (email: string, makeAdmin: boolean) => Promise<SetAdminResult>;
  resetPassword?: (email: string, password?: string) => Promise<ResetPasswordResult>;
  setOrgUnit?: (email: string, orgUnitPath: string) => Promise<SetOrgUnitResult>;
  listOrgUnits?: () => Promise<OrgUnit[]>;
  addAlias?: (email: string, alias: string) => Promise<AliasResult>;
  listAliases?: (email: string) => Promise<string[]>;
  deleteAlias?: (email: string, alias: string) => Promise<AliasResult>;
  setPhoto?: (email: string, photoData: string) => Promise<PhotoResult>;
  deletePhoto?: (email: string) => Promise<PhotoResult>;
  getPhoto?: (email: string) => Promise<string>;
  generateBackupCodes?: (email: string) => Promise<BackupCodesResult>;
  exportUsers?: (domain?: string) => Promise<WorkspaceUser[]>;
  addAliasBatch?: (mappings: Array<{ email: string; alias: string }>) => Promise<{ added: number; failed: number; results: Array<{ email: string; alias: string; success: boolean }> }>;
  listInactiveUsers?: (days: number, neverOnly?: boolean) => Promise<WorkspaceUser[]>;
  recoverUser?: (userId: string, orgUnitPath?: string) => Promise<RecoverUserResult>;
};

// Migration types
export type DomainMigrationResult = {
  sourceDomain: string;
  destDomain: string;
  userCount: number;
  generatedAt: string;
  users: Array<{
    primaryEmail: string;
    newEmail: string;
    givenName: string;
    familyName: string;
    suspended: boolean;
    orgUnitPath: string;
  }>;
};

export type WorkspaceUser = {
  id: string;
  primaryEmail: string;
  name: { givenName: string; familyName: string };
  suspended: boolean;
  orgUnitPath: string;
  isAdmin: boolean;
  lastLoginTime?: string;
};

export type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  orgUnitPath?: string | undefined;
  groups?: string[] | undefined;
  makeAdmin?: boolean | undefined;
};

export type CreateUserResult = {
  userId: string;
  primaryEmail: string;
  password: string;
  applied: boolean;
};

export type DeleteUserResult = {
  email: string;
  applied: boolean;
};

export type SuspendUserResult = {
  email: string;
  suspended: boolean;
  applied: boolean;
};

export type UnsuspendUserResult = {
  email: string;
  suspended: boolean;
  applied: boolean;
};

export type SetAdminResult = {
  email: string;
  isAdmin: boolean;
  applied: boolean;
};

export type ResetPasswordResult = {
  email: string;
  newPassword: string;
  applied: boolean;
};

export type SetOrgUnitResult = {
  email: string;
  orgUnitPath: string;
  applied: boolean;
};

export type AliasResult = {
  alias: string;
  applied: boolean;
};

export type PhotoResult = {
  email: string;
  applied: boolean;
};

export type BackupCodesResult = {
  email: string;
  codes: string[];
  applied: boolean;
};

export type RecoverUserResult = {
  userId: string;
  applied: boolean;
};

export type WorkspaceGroupCommandDeps = {
  createGroup?: (input: CreateGroupInput) => Promise<CreateGroupResult>;
  deleteGroup?: (email: string) => Promise<DeleteGroupResult>;
  updateGroup?: (email: string, name: string) => Promise<UpdateGroupResult>;
  getGroup?: (email: string) => Promise<GroupInfo>;
  listGroups?: (options?: PaginationOptions) => Promise<PaginatedResult<GroupInfo>>;
  addGroupMember?: (groupEmail: string, memberEmail: string, role: string) => Promise<AddMemberResult>;
  removeGroupMember?: (groupEmail: string, memberEmail: string) => Promise<RemoveMemberResult>;
  listGroupMembers?: (groupEmail: string) => Promise<GroupMember[]>;
};

export type CreateGroupInput = {
  email: string;
  name: string;
};

export type CreateGroupResult = {
  groupId: string;
  email: string;
  name: string;
  applied: boolean;
};

export type DeleteGroupResult = {
  email: string;
  applied: boolean;
};

export type UpdateGroupResult = {
  email: string;
  name: string;
  applied: boolean;
};

export type GroupInfo = {
  id: string;
  email: string;
  name: string;
};

export type GroupMember = {
  email: string;
  role: string;
  status: string;
};

export type AddMemberResult = {
  groupEmail: string;
  memberEmail: string;
  role: string;
  applied: boolean;
};

export type RemoveMemberResult = {
  groupEmail: string;
  memberEmail: string;
  applied: boolean;
};

export type WorkspaceDeviceCommandDeps = {
  listDevices?: (input: ListDevicesInput, options?: PaginationOptions) => Promise<PaginatedResult<Device>>;
  getDevice?: (deviceId: string) => Promise<Device>;
  wipeDevice?: (deviceId: string) => Promise<DeviceActionResult>;
  disableDevice?: (deviceId: string) => Promise<DeviceActionResult>;
};

export type ListDevicesInput = {
  type?: "chromebook" | "mobile" | undefined;
  orgUnitPath?: string | undefined;
};

export type Device = {
  deviceId: string;
  email: string;
  modelName: string;
  osVersion: string;
  status: string;
  orgUnitPath: string;
  lastSync: string;
};

export type DeviceActionResult = {
  deviceId: string;
  applied: boolean;
};

export type DeletedUserOptions = PaginationOptions & {
  query?: string;
  firstName?: string;
  lastName?: string;
};

export type WorkspaceReportCommandDeps = {
  getLoginAudit?: (days: number) => Promise<LoginActivity[]>;
  getAdminAudit?: (days: number) => Promise<AdminActivity[]>;
  getDeletedUsers?: (days: number, options?: DeletedUserOptions) => Promise<PaginatedResult<DeletedUser>>;
};

export type LoginActivity = {
  userEmail: string;
  timestamp: string;
  ipAddress: string;
  success: boolean;
};

export type AdminActivity = {
  userEmail: string;
  timestamp: string;
  action: string;
  resource: string;
};

export type DeletedUser = {
  userEmail: string;
  deletionTime: string;
  firstName?: string;
  lastName?: string;
};

export type WorkspaceOrgUnitCommandDeps = {
  listOrgUnits?: () => Promise<OrgUnit[]>;
  createOrgUnit?: (input: CreateOrgUnitInput) => Promise<CreateOrgUnitResult>;
  getOrgUnit?: (orgUnitPath: string) => Promise<OrgUnit>;
  updateOrgUnit?: (orgUnitPath: string, input: UpdateOrgUnitInput) => Promise<UpdateOrgUnitResult>;
  deleteOrgUnit?: (orgUnitPath: string) => Promise<DeleteOrgUnitResult>;
};

export type OrgUnit = {
  orgUnitId: string;
  name: string;
  orgUnitPath: string;
  parentOrgUnitId?: string | undefined;
  description?: string | undefined;
};

export type CreateOrgUnitInput = {
  name: string;
  parentOrgUnitPath: string;
  description?: string | undefined;
};

export type CreateOrgUnitResult = {
  orgUnitId: string;
  name: string;
  orgUnitPath: string;
  applied: boolean;
};

export type UpdateOrgUnitInput = {
  name?: string | undefined;
  description?: string | undefined;
  parentOrgUnitId?: string | undefined;
};

export type UpdateOrgUnitResult = {
  orgUnitId: string;
  name: string;
  applied: boolean;
};

export type DeleteOrgUnitResult = {
  orgUnitPath: string;
  applied: boolean;
};

const defaultUserDeps: Required<WorkspaceUserCommandDeps> = {
  listUsers: async (_orgUnitPath?: string) => ({ items: [] }),
  createUser: async () => ({ userId: "", primaryEmail: "", password: "", applied: false }),
  deleteUser: async () => ({ email: "", applied: false }),
  suspendUser: async () => ({ email: "", suspended: false, applied: false }),
  unsuspendUser: async () => ({ email: "", suspended: false, applied: false }),
  setAdmin: async () => ({ email: "", isAdmin: false, applied: false }),
  resetPassword: async () => ({ email: "", newPassword: "", applied: false }),
  setOrgUnit: async () => ({ email: "", orgUnitPath: "", applied: false }),
  listOrgUnits: async () => [],
  addAlias: async () => ({ alias: "", applied: false }),
  listAliases: async () => [],
  deleteAlias: async () => ({ alias: "", applied: false }),
  setPhoto: async () => ({ email: "", applied: false }),
  deletePhoto: async () => ({ email: "", applied: false }),
  getPhoto: async () => "",
  generateBackupCodes: async () => ({ email: "", codes: [], applied: false }),
  exportUsers: async () => [],
  addAliasBatch: async () => ({ added: 0, failed: 0, results: [] }),
  listInactiveUsers: async () => [],
  recoverUser: async () => ({ userId: "", applied: false }),
};

const defaultGroupDeps: Required<WorkspaceGroupCommandDeps> = {
  createGroup: async () => ({ groupId: "", email: "", name: "", applied: false }),
  deleteGroup: async () => ({ email: "", applied: false }),
  updateGroup: async () => ({ email: "", name: "", applied: false }),
  getGroup: async () => ({ id: "", email: "", name: "" }),
  listGroups: async () => ({ items: [] }),
  addGroupMember: async () => ({ groupEmail: "", memberEmail: "", role: "", applied: false }),
  removeGroupMember: async () => ({ groupEmail: "", memberEmail: "", applied: false }),
  listGroupMembers: async () => [],
};

const defaultDeviceDeps: Required<WorkspaceDeviceCommandDeps> = {
  listDevices: async () => ({ items: [] }),
  getDevice: async () => ({ deviceId: "", email: "", modelName: "", osVersion: "", status: "", orgUnitPath: "", lastSync: "" }),
  wipeDevice: async () => ({ deviceId: "", applied: false }),
  disableDevice: async () => ({ deviceId: "", applied: false }),
};

const defaultReportDeps: Required<WorkspaceReportCommandDeps> = {
  getLoginAudit: async () => [],
  getAdminAudit: async () => [],
  getDeletedUsers: async () => ({ items: [] }),
};

const defaultOrgUnitDeps: Required<WorkspaceOrgUnitCommandDeps> = {
  listOrgUnits: async () => [],
  createOrgUnit: async () => ({ orgUnitId: "", name: "", orgUnitPath: "", applied: false }),
  getOrgUnit: async () => ({ orgUnitId: "", name: "", orgUnitPath: "" }),
  updateOrgUnit: async () => ({ orgUnitId: "", name: "", applied: false }),
  deleteOrgUnit: async () => ({ orgUnitPath: "", applied: false }),
};

function fixOrgUnitPath(path: string | undefined): string | undefined {
  if (!path) return path;
  const normalized = path.replace(/\\/g, "/");
  if (normalized.match(/^[A-Z]:\//i)) {
    return "/" + normalized.split("/").pop();
  }
  return path;
}

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function registerWorkspaceCommands(
  workspaceCommand: Command,
  deps: WorkspaceUserCommandDeps & WorkspaceGroupCommandDeps & WorkspaceDeviceCommandDeps & WorkspaceReportCommandDeps & WorkspaceOrgUnitCommandDeps = {},
): void {
  const userDeps: Required<WorkspaceUserCommandDeps> = { ...defaultUserDeps, ...deps };
  const groupDeps: Required<WorkspaceGroupCommandDeps> = { ...defaultGroupDeps, ...deps };
  const deviceDeps: Required<WorkspaceDeviceCommandDeps> = { ...defaultDeviceDeps, ...deps };
  const reportDeps: Required<WorkspaceReportCommandDeps> = { ...defaultReportDeps, ...deps };
  const orgUnitDeps: Required<WorkspaceOrgUnitCommandDeps> = { ...defaultOrgUnitDeps, ...deps };

  const userCmd = workspaceCommand.command("user").description("User management");
  const orgCmd = workspaceCommand.command("org").description("Organization unit management");

  // typee workspace user list [--org-unit <path>]
  userCmd
    .command("list")
    .description("List users in the domain, optionally filtered by org unit")
    .option("--org-unit <path>", "Organization unit path to filter by")
    .option("--page-size <number>", "Number of users per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionListUsers(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ orgUnit?: string; pageSize?: number; pageToken?: string }>();

      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;

      const result = await userDeps.listUsers(fixOrgUnitPath(opts.orgUnit), paginationOpts);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      for (const user of result.items) {
        const adminTag = user.isAdmin ? " [ADMIN]" : "";
        const susTag = user.suspended ? " [SUSPENDED]" : "";
        process.stdout.write(`${user.primaryEmail}${adminTag}${susTag} - ${user.orgUnitPath}\n`);
      }

      if (result.nextPageToken) {
        process.stdout.write("---\n");
        process.stdout.write(`Next page token: ${result.nextPageToken}\n`);
      }
    });

  // gtypee workspace user inactive [--days <number>] [--never]
  userCmd
    .command("inactive")
    .description("List users who have not logged in within a given period")
    .option("--days <number>", "Inactivity threshold in days (default: 365)", parseInt)
    .option("--never", "Only show users who have never signed in", false)
    .action(async function actionInactiveUsers(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ days?: number; never?: boolean }>();

      const days = opts.days ?? 365;
      const neverOnly = opts.never ?? false;
      const users = await userDeps.listInactiveUsers(days, neverOnly);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify({ users, days, neverOnly, count: users.length }, null, 2)}\n`);
        return;
      }

      if (users.length === 0) {
        const label = neverOnly ? "No users found who have never signed in" : `No inactive users found (threshold: ${days} days)`;
        process.stdout.write(`${label}\n`);
        return;
      }

      const header = neverOnly
        ? `Users who have never signed in (${users.length} found):`
        : `Users with no login in the last ${days} days (${users.length} found):`;
      process.stdout.write(`${header}\n\n`);
      process.stdout.write("EMAIL\tLAST LOGIN\tORG UNIT\n");
      for (const user of users) {
        const lastLogin = user.lastLoginTime ?? "never";
        process.stdout.write(`${user.primaryEmail}\t${lastLogin}\t${user.orgUnitPath}\n`);
      }
    });

  // typee workspace user create --email <email> --first-name <name> --last-name <name> [--password <pwd>] [--org-unit <path>] [--groups <emails>] [--admin]
  userCmd
    .command("create")
    .description("Create a new user")
    .requiredOption("--email <email>", "User email address")
    .requiredOption("--first-name <name>", "First name")
    .requiredOption("--last-name <name>", "Last name")
    .option("--password <password>", "Password (auto-generated if not provided)")
    .option("--org-unit <path>", "Organization unit path, e.g., /Sales")
    .option("--groups <emails>", "Comma-separated list of group emails to add user to")
    .option("--admin", "Make user an admin", false)
    .action(async function actionCreateUser(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{
        email: string;
        firstName: string;
        lastName: string;
        password?: string;
        orgUnit?: string;
        groups?: string;
        admin: boolean;
      }>();

      const password = opts.password ?? generatePassword(8);
      const groups = opts.groups ? opts.groups.split(",").map((g) => g.trim()) : [];

      const result = await userDeps.createUser({
        email: opts.email,
        firstName: opts.firstName,
        lastName: opts.lastName,
        password,
        orgUnitPath: fixOrgUnitPath(opts.orgUnit),
        groups,
        makeAdmin: opts.admin,
      });

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.applied) {
        process.stdout.write(`User created: ${result.primaryEmail}\n`);
        process.stdout.write(`Password: ${result.password}\n`);
        process.stdout.write("Save this password - it will not be shown again!\n");
      } else {
        process.stdout.write("Failed to create user\n");
      }
    });

  // typee workspace user delete --email <email>
  userCmd
    .command("delete")
    .description("Delete a user")
    .requiredOption("--email <email>", "User email address")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDeleteUser(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; force: boolean }>();

      if (!opts.force) {
        process.stdout.write(`Delete user ${opts.email}? Use --force to confirm\n`);
        return;
      }

      const result = await userDeps.deleteUser(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `User deleted: ${result.email}\n` : "Failed to delete user\n");
    });

  // typee workspace user recover --user-id <id> [--org-unit <path>]
  userCmd
    .command("recover")
    .description("Recover a recently deleted user (within 20 days)")
    .requiredOption("--user-id <id>", "Google user ID of the deleted user")
    .option("--org-unit <path>", "Organization unit path to place recovered user in (default: /)")
    .action(async function actionRecoverUser(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ userId: string; orgUnit?: string }>();

      const result = await userDeps.recoverUser(opts.userId, fixOrgUnitPath(opts.orgUnit));

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `User recovered: ${result.userId}\n` : "Failed to recover user\n");
    });

  // typee workspace user suspend --email <email>
  userCmd
    .command("suspend")
    .description("Suspend a user")
    .requiredOption("--email <email>", "User email address")
    .action(async function actionSuspendUser(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();

      const result = await userDeps.suspendUser(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `User suspended: ${result.email}\n` : "Failed to suspend user\n");
    });

  // typee workspace user unsuspend --email <email>
  userCmd
    .command("unsuspend")
    .description("Unsuspend a user")
    .requiredOption("--email <email>", "User email address")
    .action(async function actionUnsuspendUser(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();

      const result = await userDeps.unsuspendUser(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `User unsuspended: ${result.email}\n` : "Failed to unsuspend user\n");
    });

  // typee workspace user reset-password --email <email>
  userCmd
    .command("reset-password")
    .description("Reset user password (generates a random password unless --password is given)")
    .requiredOption("--email <email>", "User email address")
    .option("--password <password>", "Specific password to set (auto-generated if omitted)")
    .action(async function actionResetPassword(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; password?: string }>();

      const result = await userDeps.resetPassword(opts.email, opts.password);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.applied) {
        process.stdout.write(`Password reset for: ${result.email}\n`);
        process.stdout.write(`New password: ${result.newPassword}\n`);
        process.stdout.write("Save this password - it will not be shown again!\n");
      } else {
        process.stdout.write("Failed to reset password\n");
      }
    });

  // typee workspace user set-admin --email <email> [--yes]
  userCmd
    .command("set-admin")
    .description("Make or remove admin privileges")
    .requiredOption("--email <email>", "User email address")
    .option("--yes", "Confirm admin promotion", false)
    .action(async function actionSetAdmin(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; yes: boolean }>();

      if (!opts.yes) {
        process.stdout.write(`Make ${opts.email} an admin? Use --yes to confirm\n`);
        return;
      }

      const result = await userDeps.setAdmin(opts.email, true);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Admin privileges granted to: ${result.email}\n` : "Failed to set admin\n");
    });

  // typee workspace user set-org-unit --email <email> --org-unit <path>
  userCmd
    .command("set-org-unit")
    .description("Set user's organization unit")
    .requiredOption("--email <email>", "User email address")
    .requiredOption("--org-unit <path>", "Organization unit path, e.g., /Sales")
    .action(async function actionSetOrgUnit(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; orgUnit: string }>();

      const result = await userDeps.setOrgUnit(opts.email, fixOrgUnitPath(opts.orgUnit) ?? opts.orgUnit);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Org unit set for ${result.email}: ${result.orgUnitPath}\n` : "Failed to set org unit\n");
    });

  // Alias commands
  // typee workspace user add-alias --email <email> --alias <alias@domain.com>
  userCmd
    .command("add-alias")
    .description("Add an email alias to a user")
    .requiredOption("--email <email>", "User email address")
    .requiredOption("--alias <email>", "Alias email address")
    .action(async function actionAddAlias(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; alias: string }>();

      const result = await userDeps.addAlias(opts.email, opts.alias);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Alias added: ${result.alias}\n` : "Failed to add alias\n");
    });

  // typee workspace user list-aliases --email <email>
  userCmd
    .command("list-aliases")
    .description("List all aliases for a user")
    .requiredOption("--email <email>", "User email address")
    .action(async function actionListAliases(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();

      const aliases = await userDeps.listAliases(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(aliases, null, 2)}\n`);
        return;
      }

      if (aliases.length === 0) {
        process.stdout.write(`No aliases found for ${opts.email}\n`);
        return;
      }

      for (const alias of aliases) {
        process.stdout.write(`${alias}\n`);
      }
    });

  // typee workspace user delete-alias --email <email> --alias <alias@domain.com>
  userCmd
    .command("delete-alias")
    .description("Delete an email alias from a user")
    .requiredOption("--email <email>", "User email address")
    .requiredOption("--alias <email>", "Alias email address")
    .action(async function actionDeleteAlias(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; alias: string }>();

      const result = await userDeps.deleteAlias(opts.email, opts.alias);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Alias deleted: ${result.alias}\n` : "Failed to delete alias\n");
    });

  // typee workspace user set-photo --email <email> --path <path>
  userCmd
    .command("set-photo")
    .description("Set user profile photo")
    .requiredOption("--email <email>", "User email address")
    .requiredOption("--path <path>", "Path to photo file (base64 encoded)")
    .action(async function actionSetPhoto(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; path: string }>();

      const result = await userDeps.setPhoto(opts.email, opts.path);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Photo set for ${result.email}\n` : "Failed to set photo\n");
    });

  // typee workspace user delete-photo --email <email>
  userCmd
    .command("delete-photo")
    .description("Delete user profile photo")
    .requiredOption("--email <email>", "User email address")
    .action(async function actionDeletePhoto(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();

      const result = await userDeps.deletePhoto(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Photo deleted for ${result.email}\n` : "Failed to delete photo\n");
    });

  // typee workspace user generate-backup-codes --email <email>
  userCmd
    .command("generate-backup-codes")
    .description("Generate backup codes for user's 2-step verification")
    .requiredOption("--email <email>", "User email address")
    .action(async function actionGenerateBackupCodes(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string }>();

      const result = await userDeps.generateBackupCodes(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.applied) {
        process.stdout.write(`Backup codes generated for: ${result.email}\n\n`);
        for (let i = 0; i < result.codes.length; i += 2) {
          process.stdout.write(`${result.codes[i]}\t${result.codes[i + 1] || ""}\n`);
        }
        process.stdout.write("\nSave these codes - they will not be shown again!\n");
      } else {
        process.stdout.write("Failed to generate backup codes\n");
      }
    });

  // ========================
  // Migration Commands
  // ========================
  const migrationCmd = workspaceCommand.command("migration").description("Domain migration helpers");

  migrationCmd
    .command("prepare")
    .description("Prepare a migration plan from source domain to destination domain")
    .requiredOption("--source-domain <domain>", "Source domain (e.g., asscat.edu.ph)")
    .requiredOption("--dest-domain <domain>", "Destination domain (e.g., adssu.edu.ph)")
    .option("--org-unit <path>", "Filter by org unit path")
    .option("--output <path>", "Output CSV file path")
    .action(async function actionPrepareMigration(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const opts = this.opts<{
        sourceDomain: string;
        destDomain: string;
        orgUnit?: string;
        output?: string;
      }>();

      const users = await userDeps.exportUsers(opts.sourceDomain);

      // Filter users by domain if possible
      const filteredUsers = users.filter((u) => u.primaryEmail.endsWith(`@${opts.sourceDomain}`));

      // Generate migration plan
      const plan: DomainMigrationResult = {
        sourceDomain: opts.sourceDomain,
        destDomain: opts.destDomain,
        userCount: filteredUsers.length,
        generatedAt: new Date().toISOString(),
        users: filteredUsers.map((u) => {
          const username = u.primaryEmail.split("@")[0];
          return {
            primaryEmail: u.primaryEmail,
            newEmail: `${username}@${opts.destDomain}`,
            givenName: u.name.givenName,
            familyName: u.name.familyName,
            suspended: u.suspended,
            orgUnitPath: u.orgUnitPath,
          };
        }),
      };

      if (opts.output) {
        // Write CSV file
        const fs = await import("fs");
        const header = "currentEmail,newEmail,givenName,familyName,suspended,orgUnitPath\n";
        const rows = plan.users.map((u) =>
          `${u.primaryEmail},${u.newEmail},${u.givenName},${u.familyName},${u.suspended},${u.orgUnitPath}`
        );
        await fs.promises.writeFile(opts.output, header + rows.join("\n"));
        process.stdout.write(`Migration plan saved to: ${opts.output}\n`);
      } else if (rootOptions.json) {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      } else {
        process.stdout.write(`\n=== Domain Migration Plan ===\n`);
        process.stdout.write(`Source: ${opts.sourceDomain}\n`);
        process.stdout.write(`Destination: ${opts.destDomain}\n`);
        process.stdout.write(`Users to migrate: ${plan.userCount}\n`);
        process.stdout.write(`Generated: ${plan.generatedAt}\n\n`);

        for (const user of plan.users) {
          const status = user.suspended ? " [SUSPENDED]" : "";
          process.stdout.write(`  ${user.primaryEmail} → ${user.newEmail}${status}\n`);
        }
        process.stdout.write(`\nNote: Domain change must be done in Google Admin Console:\n`);
        process.stdout.write(`  Admin Console > Directory > Users > Select users > Change domain\n`);
      }
    });

  migrationCmd
    .command("add-aliases")
    .description("Add email aliases from old domain to new domain users (post-migration)")
    .argument("<csv-file>", "CSV file with old and new email mappings")
    .option("--dry-run", "Show what would be done without making changes")
    .action(async function actionAddAliases(this: Command, csvFile: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const fs = await import("fs");
      const csvContent = await fs.promises.readFile(csvFile, "utf-8");

      // Parse CSV
      const lines = csvContent.trim().split("\n");
      const mappings: Array<{ email: string; alias: string }> = [];

      for (const line of lines.slice(1)) { // Skip header
        const [currentEmail, newEmail] = line.split(",");
        if (currentEmail && newEmail) {
          mappings.push({ email: newEmail.trim(), alias: currentEmail.trim() });
        }
      }

      if (this.opts<{ dryRun?: boolean }>().dryRun) {
        process.stdout.write(`[DRY RUN] Would add ${mappings.length} aliases:\n`);
        for (const m of mappings) {
          process.stdout.write(`  ${m.email} ← ${m.alias}\n`);
        }
        return;
      }

      const result = await userDeps.addAliasBatch(mappings);

      process.stdout.write(`Added: ${result.added} aliases\n`);
      if (result.failed > 0) {
        stderr(`Failed: ${result.failed} aliases\n`, ctx.quiet);
      }
    });

  // typee workspace org list
  orgCmd
    .command("list")
    .description("List all organizational units")
    .action(async function actionListOrgUnits(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const orgUnits = await orgUnitDeps.listOrgUnits();

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(orgUnits, null, 2)}\n`);
        return;
      }

      for (const ou of orgUnits) {
        process.stdout.write(`${ou.orgUnitPath}\n`);
      }
    });

  // typee workspace org create --name <name> --parent <parent-org-unit-id-or-path> [--description <desc>]
  orgCmd
    .command("create")
    .description("Create an organizational unit")
    .requiredOption("--name <name>", "Name of the organizational unit")
    .requiredOption("--parent <parent>", "Parent org unit ID or path (e.g., / or /Sales)")
    .option("--description <desc>", "Description of the organizational unit")
    .action(async function actionCreateOrgUnit(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string; parent: string; description?: string }>();

      const result = await orgUnitDeps.createOrgUnit({
        name: opts.name,
        parentOrgUnitPath: opts.parent,
        description: opts.description,
      });

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.applied) {
        process.stdout.write(`Org unit created: ${result.orgUnitPath} (ID: ${result.orgUnitId})\n`);
      } else {
        process.stdout.write("Failed to create org unit\n");
      }
    });

  // typee workspace org get --path <org-unit-path> or --id <org-unit-id>
  orgCmd
    .command("get")
    .description("Get organizational unit details")
    .option("--path <org-unit-path>", "Org unit path (e.g., /Sales)")
    .option("--id <org-unit-id>", "Org unit ID")
    .action(async function actionGetOrgUnit(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ path?: string; id?: string }>();

      if (!opts.path && !opts.id) {
        process.stdout.write("Error: Either --path or --id is required\n");
        return;
      }

      const orgUnitPath = opts.path ?? opts.id ?? "";
      const orgUnit = await orgUnitDeps.getOrgUnit(orgUnitPath);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(orgUnit, null, 2)}\n`);
        return;
      }

      if (orgUnit.orgUnitId) {
        process.stdout.write(`Name: ${orgUnit.name}\n`);
        process.stdout.write(`Path: ${orgUnit.orgUnitPath}\n`);
        process.stdout.write(`ID: ${orgUnit.orgUnitId}\n`);
        if (orgUnit.parentOrgUnitId) {
          process.stdout.write(`Parent ID: ${orgUnit.parentOrgUnitId}\n`);
        }
        if (orgUnit.description) {
          process.stdout.write(`Description: ${orgUnit.description}\n`);
        }
      } else {
        process.stdout.write("Org unit not found\n");
      }
    });

  // typee workspace org update --path <org-unit-path> or --id <org-unit-id> [--name <new-name>] [--description <desc>] [--parent <new-parent>]
  orgCmd
    .command("update")
    .description("Update an organizational unit")
    .option("--path <org-unit-path>", "Org unit path (e.g., /Sales)")
    .option("--id <org-unit-id>", "Org unit ID")
    .option("--name <new-name>", "New name for the org unit")
    .option("--description <desc>", "New description for the org unit")
    .option("--parent <new-parent>", "New parent org unit ID")
    .action(async function actionUpdateOrgUnit(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ path?: string; id?: string; name?: string; description?: string; parent?: string }>();

      if (!opts.path && !opts.id) {
        process.stdout.write("Error: Either --path or --id is required\n");
        return;
      }

      if (!opts.name && !opts.description && !opts.parent) {
        process.stdout.write("Error: At least one of --name, --description, or --parent is required\n");
        return;
      }

      const orgUnitPath = opts.path ?? opts.id ?? "";
      const result = await orgUnitDeps.updateOrgUnit(orgUnitPath, {
        name: opts.name,
        description: opts.description,
        parentOrgUnitId: opts.parent,
      });

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.applied) {
        process.stdout.write(`Org unit updated: ${result.name} (ID: ${result.orgUnitId})\n`);
      } else {
        process.stdout.write("Failed to update org unit\n");
      }
    });

  // typee workspace org delete --path <org-unit-path> or --id <org-unit-id> [-y, --force]
  orgCmd
    .command("delete")
    .description("Delete an organizational unit")
    .option("--path <org-unit-path>", "Org unit path (e.g., /Sales)")
    .option("--id <org-unit-id>", "Org unit ID")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDeleteOrgUnit(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ path?: string; id?: string; force: boolean }>();

      if (!opts.path && !opts.id) {
        process.stdout.write("Error: Either --path or --id is required\n");
        return;
      }

      const orgUnitPath = opts.path ?? opts.id ?? "";

      if (!opts.force) {
        process.stdout.write(`Delete org unit ${orgUnitPath}? Use --force to confirm\n`);
        return;
      }

      const result = await orgUnitDeps.deleteOrgUnit(orgUnitPath);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Org unit deleted: ${result.orgUnitPath}\n` : "Failed to delete org unit\n");
    });

  // Group commands
  const groupCmd = workspaceCommand.command("group").description("Group management");

  // typee workspace group create --email <email> --name <name>
  groupCmd
    .command("create")
    .description("Create a new group")
    .requiredOption("--email <email>", "Group email address")
    .requiredOption("--name <name>", "Group name")
    .action(async function actionCreateGroup(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; name: string }>();

      const result = await groupDeps.createGroup({ email: opts.email, name: opts.name });

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Group created: ${result.email}\n` : "Failed to create group\n");
    });

  // typee workspace group delete --email <email>
  groupCmd
    .command("delete")
    .description("Delete a group")
    .requiredOption("--email <email>", "Group email address")
    .option("-y, --force", "Skip confirmation", false)
    .action(async function actionDeleteGroup(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; force: boolean }>();

      if (!opts.force) {
        process.stdout.write(`Delete group ${opts.email}? Use --force to confirm\n`);
        return;
      }

      const result = await groupDeps.deleteGroup(opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Group deleted: ${result.email}\n` : "Failed to delete group\n");
    });

  // typee workspace group list
  groupCmd
    .command("list")
    .description("List all groups")
    .option("--page-size <number>", "Number of groups per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionListGroups(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: number; pageToken?: string }>();

      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;

      const result = await groupDeps.listGroups(paginationOpts);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      for (const group of result.items) {
        process.stdout.write(`${group.email} - ${group.name}\n`);
      }

      if (result.nextPageToken) {
        process.stdout.write("---\n");
        process.stdout.write(`Next page token: ${result.nextPageToken}\n`);
      }
    });

  // typee workspace group add-member --group <group-email> --email <member-email> [--role <MEMBER|MANAGER|OWNER>]
  groupCmd
    .command("add-member")
    .description("Add member to group")
    .requiredOption("--group <email>", "Group email address")
    .requiredOption("--email <email>", "Member email address")
    .option("--role <role>", "Member role: MEMBER, MANAGER, or OWNER", "MEMBER")
    .action(async function actionAddGroupMember(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string; email: string; role: string }>();

      const validRoles = ["MEMBER", "MANAGER", "OWNER"];
      const role = opts.role.toUpperCase();
      if (!validRoles.includes(role)) {
        process.stdout.write(`Invalid role: ${opts.role}. Must be MEMBER, MANAGER, or OWNER\n`);
        return;
      }

      const result = await groupDeps.addGroupMember(opts.group, opts.email, role);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Member added: ${result.memberEmail} to ${result.groupEmail} as ${result.role}\n` : "Failed to add member\n");
    });

  // typee workspace group remove-member --group <group-email> --email <member-email>
  groupCmd
    .command("remove-member")
    .description("Remove member from group")
    .requiredOption("--group <email>", "Group email address")
    .requiredOption("--email <email>", "Member email address")
    .action(async function actionRemoveGroupMember(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string; email: string }>();

      const result = await groupDeps.removeGroupMember(opts.group, opts.email);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(result.applied ? `Member removed: ${result.memberEmail} from ${result.groupEmail}\n` : "Failed to remove member\n");
    });

  // typee workspace group list-members --group <group-email>
  groupCmd
    .command("list-members")
    .description("List all members of a group")
    .requiredOption("--group <email>", "Group email address")
    .action(async function actionListGroupMembers(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ group: string }>();

      const members = await groupDeps.listGroupMembers(opts.group);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(members, null, 2)}\n`);
        return;
      }

      if (members.length === 0) {
        process.stdout.write(`No members found in ${opts.group}\n`);
        return;
      }

      for (const member of members) {
        process.stdout.write(`${member.email} - ${member.role} - ${member.status}\n`);
      }
    });

  // Device commands
  const deviceCmd = workspaceCommand.command("device").description("Device management");

  // typee workspace device list
  deviceCmd
    .command("list")
    .description("List devices")
    .option("--type <type>", "Device type: chromebook, mobile")
    .option("--org-unit <path>", "Organization unit path")
    .option("--page-size <number>", "Number of devices per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionListDevices(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ type?: string; orgUnit?: string; pageSize?: number; pageToken?: string }>();

      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;

      const result = await deviceDeps.listDevices({ type: opts.type as "chromebook" | "mobile" | undefined, orgUnitPath: fixOrgUnitPath(opts.orgUnit) }, paginationOpts);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      for (const device of result.items) {
        process.stdout.write(`${device.deviceId} - ${device.email} - ${device.modelName} - ${device.status}\n`);
      }

      if (result.nextPageToken) {
        process.stdout.write("---\n");
        process.stdout.write(`Next page token: ${result.nextPageToken}\n`);
      }
    });

  // Report commands
  const reportCmd = workspaceCommand.command("report").description("Reports and audit logs");

  // typee workspace report logins
  reportCmd
    .command("logins")
    .description("List login activities")
    .option("--days <number>", "Number of days to look back", "30")
    .action(async function actionReportLogins(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ days: string }>();
      const days = parseInt(opts.days, 10);

      const logins = await reportDeps.getLoginAudit(days);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(logins, null, 2)}\n`);
        return;
      }

      for (const login of logins) {
        process.stdout.write(`${login.timestamp} - ${login.userEmail} - ${login.ipAddress}\n`);
      }
    });

  // typee workspace report admin
  reportCmd
    .command("admin")
    .description("List admin activities")
    .option("--days <number>", "Number of days to look back", "30")
    .action(async function actionReportAdmin(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ days: string }>();
      const days = parseInt(opts.days, 10);

      const activities = await reportDeps.getAdminAudit(days);

      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(activities, null, 2)}\n`);
        return;
      }

      for (const activity of activities) {
        process.stdout.write(`${activity.timestamp} - ${activity.userEmail} - ${activity.action} - ${activity.resource}\n`);
      }
    });

  // typee workspace report deleted-users [--days <number>]
  reportCmd
    .command("deleted-users")
    .description("List recently deleted users")
    .option("--days <number>", "Number of days to look back", "30")
    .option("--page-size <number>", "Number of audit events per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .option("--query <text>", "Search deleted users by name or email")
    .option("--first-name <text>", "Filter by first name")
    .option("--last-name <text>", "Filter by last name")
    .action(async function actionReportDeletedUsers(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ days: string; pageSize?: number; pageToken?: string; query?: string; firstName?: string; lastName?: string }>();
      const days = parseInt(opts.days, 10);

      const searchOpts: DeletedUserOptions = {};
      if (opts.pageSize !== undefined) searchOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) searchOpts.pageToken = opts.pageToken;
      if (opts.query !== undefined) searchOpts.query = opts.query;
      if (opts.firstName !== undefined) searchOpts.firstName = opts.firstName;
      if (opts.lastName !== undefined) searchOpts.lastName = opts.lastName;

      // Standard linear fallback setup
      const runStandardMode = async () => {
        const result = await reportDeps.getDeletedUsers!(days, searchOpts);

        if (ctx.output.mode === "json") {
          process.stdout.write(JSON.stringify(result, null, 2) + "\n");
          return;
        }

        if (result.items.length === 0) {
          process.stdout.write(`No deleted users found in the last ${days} days\n`);
          return;
        }

        process.stdout.write(`Deleted users in the last ${days} days (${result.items.length} found on this page):\n\n`);
        for (const user of result.items) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
          const namePart = fullName ? ` (${fullName})` : "";
          process.stdout.write(`${user.userEmail}${namePart} - deleted ${user.deletionTime}\n`);
        }

        if (result.nextPageToken) {
          process.stdout.write("---\n");
          process.stdout.write(`Next page token: ${result.nextPageToken}\n`);
        }
      };

      if (!process.stdin.isTTY || process.stdout.isTTY === false || ctx.output.mode === "json") {
        return runStandardMode();
      }

      // TUI Interactive Mode
      const { waitUntilExit } = render(
        React.createElement(DeletedUsersTui, {
          reportDeps,
          days,
          searchOpts
        })
      );

      await waitUntilExit();
    });
}
