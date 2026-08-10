import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { PaginationOptions } from "../../types/pagination.js";
import { buildListUsersSearchQueries } from "../tui/search.js";
import type { ListUsersOptions } from "./commands.js";
import { mapGroupListItems } from "./userHubFilters.js";
import {
  type WorkspaceUserCommandDeps,
  type WorkspaceUser,
  type CreateUserInput,
  type CreateUserResult,
  type DeleteUserResult,
  type SuspendUserResult,
  type UnsuspendUserResult,
  type SetAdminResult,
  type ResetPasswordResult,
  type UserRecoveryInfo,
  type RecoveryInfoResult,
  type SetOrgUnitResult,
  type AliasResult,
  type PhotoResult,
  type BackupCodesResult,
  type RecoverUserResult,
  type OrgUnit,
  type WorkspaceGroupCommandDeps,
  type CreateGroupInput,
  type CreateGroupResult,
  type DeleteGroupResult,
  type GroupInfo,
  type GroupMember,
  type AddMemberResult,
  type RemoveMemberResult,
  type WorkspaceDeviceCommandDeps,
  type ListDevicesInput,
  type Device,
  type DeviceActionResult,
  type WorkspaceReportCommandDeps,
  type LoginActivity,
  type AdminActivity,
  type DeletedUser,
  type DeletedUserOptions,
  type WorkspaceOrgUnitCommandDeps,
  type CreateOrgUnitInput,
  type CreateOrgUnitResult,
  type UpdateOrgUnitInput,
  type UpdateOrgUnitResult,
  type DeleteOrgUnitResult,
} from "./commands.js";
import { generatePassword } from "./password.js";
import { buildRecoveryInfoPatch } from "./recoveryInfo.js";

export function buildWorkspaceUserCommandDeps(options: ServiceRuntimeOptions): Required<WorkspaceUserCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listUsers: async (orgUnitPath?: string, options?: ListUsersOptions) => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });
      const pageSize = options?.pageSize ?? 500;
      const queries = buildListUsersSearchQueries(orgUnitPath, options?.query);

      const mapUser = (user: {
        id?: string | null;
        primaryEmail?: string | null;
        name?: { givenName?: string | null; familyName?: string | null } | null;
        suspended?: boolean | null;
        orgUnitPath?: string | null;
        isAdmin?: boolean | null;
        lastLoginTime?: string | null;
      }): WorkspaceUser => {
        const item: WorkspaceUser = {
          id: user.id ?? "",
          primaryEmail: user.primaryEmail ?? "",
          name: {
            givenName: user.name?.givenName ?? "",
            familyName: user.name?.familyName ?? "",
          },
          suspended: user.suspended ?? false,
          orgUnitPath: user.orgUnitPath ?? "/",
          isAdmin: user.isAdmin ?? false,
        };
        if (user.lastLoginTime) {
          item.lastLoginTime = user.lastLoginTime;
        }
        return item;
      };

      if (queries.length === 1) {
        const params: Record<string, unknown> = {
          customer: "my_customer",
          maxResults: pageSize,
          orderBy: "email",
          query: queries[0],
        };

        if (options?.pageToken !== undefined) {
          params.pageToken = options.pageToken;
        }

        const response = await admin.users.list(params);
        const items = (response.data.users ?? []).map(mapUser);
        const result: { items: WorkspaceUser[]; nextPageToken?: string } = { items };

        if (response.data.nextPageToken) {
          result.nextPageToken = response.data.nextPageToken;
        }

        return result;
      }

      // Single-word search: merge name/email queries (Admin API has no OR across fields).
      if (options?.pageToken !== undefined) {
        return { items: [] };
      }

      const seen = new Set<string>();
      const merged: WorkspaceUser[] = [];

      for (const query of queries) {
        const response = await admin.users.list({
          customer: "my_customer",
          maxResults: pageSize,
          orderBy: "email",
          query,
        });

        for (const user of response.data.users ?? []) {
          const key = user.id ?? user.primaryEmail ?? "";
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(mapUser(user));
        }
      }

      merged.sort((a, b) => a.primaryEmail.localeCompare(b.primaryEmail));

      return { items: merged.slice(0, pageSize) };
    },

    createUser: async (input: CreateUserInput): Promise<CreateUserResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const password = input.password ?? generatePassword();

      try {
        const response = await admin.users.insert({
          requestBody: {
            primaryEmail: input.email,
            name: {
              givenName: input.firstName,
              familyName: input.lastName,
            },
            password,
            orgUnitPath: input.orgUnitPath ?? null,
          },
        });

        const userId = response.data.id ?? "";

        // Add to groups if specified
        if (input.groups !== undefined && input.groups.length > 0) {
          for (const groupEmail of input.groups) {
            try {
              await admin.members.insert({
                groupKey: groupEmail,
                requestBody: { email: input.email, role: "MEMBER" },
              });
            } catch {
              // Continue even if group add fails
            }
          }
        }

        // Make admin if specified
        if (input.makeAdmin) {
          try {
            await admin.users.makeAdmin({
              userKey: input.email,
              requestBody: { status: true },
            });
          } catch {
            // Continue even if admin set fails
          }
        }

        return {
          userId,
          primaryEmail: input.email,
          password,
          applied: true,
        };
      } catch {
        return {
          userId: "",
          primaryEmail: input.email,
          password: "",
          applied: false,
        };
      }
    },

    deleteUser: async (email: string): Promise<DeleteUserResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.delete({ userKey: email });
        return { email, applied: true };
      } catch {
        return { email, applied: false };
      }
    },

    suspendUser: async (email: string): Promise<SuspendUserResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.update({
          userKey: email,
          requestBody: { suspended: true },
        });
        return { email, suspended: true, applied: true };
      } catch {
        return { email, suspended: true, applied: false };
      }
    },

    unsuspendUser: async (email: string): Promise<UnsuspendUserResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.update({
          userKey: email,
          requestBody: { suspended: false },
        });
        return { email, suspended: false, applied: true };
      } catch {
        return { email, suspended: false, applied: false };
      }
    },

    setAdmin: async (email: string, makeAdmin: boolean): Promise<SetAdminResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.makeAdmin({
          userKey: email,
          requestBody: { status: makeAdmin },
        });
        return { email, isAdmin: makeAdmin, applied: true };
      } catch {
        return { email, isAdmin: makeAdmin, applied: false };
      }
    },

    resetPassword: async (email: string, password?: string): Promise<ResetPasswordResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const newPassword = password ?? generatePassword();

      try {
        await admin.users.update({
          userKey: email,
          requestBody: { password: newPassword },
        });
        return { email, newPassword, applied: true };
      } catch {
        return { email, newPassword: "", applied: false };
      }
    },

    getUserRecovery: async (email: string): Promise<UserRecoveryInfo> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.users.get({
        userKey: email,
        projection: "full",
        fields: "recoveryEmail,recoveryPhone",
      });

      const info: UserRecoveryInfo = {};
      if (response.data.recoveryEmail) info.recoveryEmail = response.data.recoveryEmail;
      if (response.data.recoveryPhone) info.recoveryPhone = response.data.recoveryPhone;
      return info;
    },

    setRecoveryInfo: async (email: string, info: { recoveryEmail?: string; recoveryPhone?: string }): Promise<RecoveryInfoResult> => {
      const patch = buildRecoveryInfoPatch(info);
      if (!patch) {
        return { email, applied: false };
      }

      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.update({
          userKey: email,
          requestBody: patch,
        });
        return { email, ...patch, applied: true };
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to update recovery info for ${email}: ${reason}`);
      }
    },

    setOrgUnit: async (email: string, orgUnitPath: string): Promise<SetOrgUnitResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.update({
          userKey: email,
          requestBody: { orgUnitPath },
        });
        return { email, orgUnitPath, applied: true };
      } catch {
        return { email, orgUnitPath, applied: false };
      }
    },

    listOrgUnits: async (): Promise<OrgUnit[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.orgunits.list({
        customerId: "my_customer",
      });

      const units = response.data.organizationUnits ?? [];

      return units.map((unit) => ({
        orgUnitId: unit.orgUnitId ?? "",
        name: unit.name ?? "",
        orgUnitPath: unit.orgUnitPath ?? "",
        parentOrgUnitId: unit.parentOrgUnitId ?? undefined,
      }));
    },

    addAlias: async (email: string, alias: string): Promise<AliasResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.aliases.insert({
          userKey: email,
          requestBody: { alias },
        });
        return { alias, applied: true };
      } catch {
        return { alias, applied: false };
      }
    },

    listAliases: async (email: string): Promise<string[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.users.aliases.list({ userKey: email });
        return response.data.aliases ?? [];
      } catch {
        return [];
      }
    },

    deleteAlias: async (email: string, alias: string): Promise<AliasResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.aliases.delete({ userKey: email, alias });
        return { alias, applied: true };
      } catch {
        return { alias, applied: false };
      }
    },

    setPhoto: async (email: string, _photoData: string): Promise<PhotoResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.photos.update({
          userKey: email,
          requestBody: { photoData: _photoData },
        });
        return { email, applied: true };
      } catch {
        return { email, applied: false };
      }
    },

    deletePhoto: async (email: string): Promise<PhotoResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.photos.delete({ userKey: email });
        return { email, applied: true };
      } catch {
        return { email, applied: false };
      }
    },

    getPhoto: async (email: string): Promise<string> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.users.photos.get({ userKey: email });
        return response.data.photoData ?? "";
      } catch {
        return "";
      }
    },

    generateBackupCodes: async (email: string): Promise<BackupCodesResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.verificationCodes.generate({ userKey: email });
        const response = await admin.verificationCodes.list({ userKey: email });
        
        const codes = response.data.items ?? [];
        return { email, codes: codes.map((c) => c.verificationCode ?? ""), applied: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to generate backup codes";
        return { email, codes: [], applied: false, error: message };
      }
    },

    exportUsers: async (domain?: string): Promise<WorkspaceUser[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });
      const users: WorkspaceUser[] = [];

      let pageToken: string | undefined = undefined;

      do {
        const listParams: {
          projection: string;
          pageToken?: string;
          maxResults: number;
          domain?: string;
        } = {
          projection: "basic",
          maxResults: 500,
        };

        if (domain !== undefined) {
          listParams.domain = domain;
        }

        const response = await admin.users.list(listParams);

        const userList = response.data.users ?? [];
        for (const u of userList) {
          users.push({
            id: u.id ?? "",
            primaryEmail: u.primaryEmail ?? "",
            name: {
              givenName: u.name?.givenName ?? "",
              familyName: u.name?.familyName ?? "",
            },
            suspended: u.suspended ?? false,
            orgUnitPath: u.orgUnitPath ?? "/",
            isAdmin: u.isAdmin ?? false,
          });
        }

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      return users;
    },

    addAliasBatch: async (mappings: Array<{ email: string; alias: string }>) => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      let added = 0;
      let failed = 0;
      const results: Array<{ email: string; alias: string; success: boolean }> = [];

      for (const mapping of mappings) {
        try {
          await admin.users.aliases.insert({
            userKey: mapping.email,
            requestBody: {
              alias: mapping.alias,
            },
          });
          results.push({ email: mapping.email, alias: mapping.alias, success: true });
          added++;
        } catch {
          results.push({ email: mapping.email, alias: mapping.alias, success: false });
          failed++;
        }
      }

      return { added, failed, results };
    },

    recoverUser: async (userId: string, orgUnitPath?: string): Promise<RecoverUserResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.users.undelete({
          userKey: userId,
          requestBody: { orgUnitPath: orgUnitPath ?? "/" },
        });
        return { userId, applied: true };
      } catch {
        return { userId, applied: false };
      }
    },

    listInactiveUsers: async (days: number, neverOnly?: boolean): Promise<WorkspaceUser[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffISO = cutoff.toISOString();

      const users: WorkspaceUser[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const params: Record<string, unknown> = {
          customer: "my_customer",
          maxResults: 500,
          orderBy: "email",
          query: "isSuspended=false",
          projection: "basic",
        };

        if (pageToken !== undefined) {
          params.pageToken = pageToken;
        }

        const response = await admin.users.list(params);
        const userList = response.data.users ?? [];

        for (const u of userList) {
          const lastLogin = u.lastLoginTime ?? undefined;
          const neverSignedIn = !lastLogin;
          const isInactive = neverSignedIn || lastLogin < cutoffISO;

          const shouldInclude = neverOnly ? neverSignedIn : isInactive;

          if (shouldInclude) {
            const user: WorkspaceUser = {
              id: u.id ?? "",
              primaryEmail: u.primaryEmail ?? "",
              name: {
                givenName: u.name?.givenName ?? "",
                familyName: u.name?.familyName ?? "",
              },
              suspended: u.suspended ?? false,
              orgUnitPath: u.orgUnitPath ?? "/",
              isAdmin: u.isAdmin ?? false,
            };
            if (lastLogin) {
              user.lastLoginTime = lastLogin;
            }
            users.push(user);
          }
        }

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      return users;
    },
  };
}

export function buildWorkspaceGroupCommandDeps(options: ServiceRuntimeOptions): Required<WorkspaceGroupCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    createGroup: async (input: CreateGroupInput): Promise<CreateGroupResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.groups.insert({
          requestBody: {
            email: input.email,
            name: input.name,
          },
        });
        return {
          groupId: response.data.id ?? "",
          email: input.email,
          name: input.name,
          applied: true,
        };
      } catch {
        return { groupId: "", email: input.email, name: input.name, applied: false };
      }
    },

    deleteGroup: async (email: string): Promise<DeleteGroupResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.groups.delete({ groupKey: email });
        return { email, applied: true };
      } catch {
        return { email, applied: false };
      }
    },

    updateGroup: async (email: string, name: string): Promise<{ email: string; name: string; applied: boolean }> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.groups.update({
          groupKey: email,
          requestBody: { name },
        });
        return { email, name, applied: true };
      } catch {
        return { email, name, applied: false };
      }
    },

    getGroup: async (email: string): Promise<GroupInfo> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.groups.get({ groupKey: email });
        return {
          id: response.data.id ?? "",
          email: response.data.email ?? "",
          name: response.data.name ?? "",
        };
      } catch {
        return { id: "", email: "", name: "" };
      }
    },

    listGroups: async (options?: PaginationOptions) => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const params: Record<string, unknown> = {
          customer: "my_customer",
        };

        if (options?.pageSize !== undefined) {
          params.maxResults = options.pageSize;
        }

        if (options?.pageToken !== undefined) {
          params.pageToken = options.pageToken;
        }

        const response = await admin.groups.list(params);
        const groups = response.data.groups ?? [];
        const items = mapGroupListItems(groups);

        const result: { items: typeof items; nextPageToken?: string } = { items };

        if (response.data.nextPageToken) {
          result.nextPageToken = response.data.nextPageToken;
        }

        return result;
      } catch {
        return { items: [] };
      }
    },

    listGroupsForUser: async (userEmail: string, options?: PaginationOptions) => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const params: Record<string, unknown> = {
          userKey: userEmail,
        };
        if (options?.pageSize !== undefined) {
          params.maxResults = options.pageSize;
        }
        if (options?.pageToken !== undefined) {
          params.pageToken = options.pageToken;
        }

        const response = await admin.groups.list(params);
        const groups = response.data.groups ?? [];
        const items = mapGroupListItems(groups);

        const result: { items: typeof items; nextPageToken?: string } = { items };
        if (response.data.nextPageToken) {
          result.nextPageToken = response.data.nextPageToken;
        }
        return result;
      } catch {
        return { items: [] };
      }
    },

    addGroupMember: async (groupEmail: string, memberEmail: string, role: string): Promise<AddMemberResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.members.insert({
          groupKey: groupEmail,
          requestBody: { email: memberEmail, role },
        });
        return { groupEmail, memberEmail, role, applied: true };
      } catch {
        return { groupEmail, memberEmail, role, applied: false };
      }
    },

    removeGroupMember: async (groupEmail: string, memberEmail: string): Promise<RemoveMemberResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.members.delete({
          groupKey: groupEmail,
          memberKey: memberEmail,
        });
        return { groupEmail, memberEmail, applied: true };
      } catch {
        return { groupEmail, memberEmail, applied: false };
      }
    },

    listGroupMembers: async (groupEmail: string): Promise<GroupMember[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.members.list({ groupKey: groupEmail });
        const members = response.data.members ?? [];
        return members.map((m) => ({
          email: m.email ?? "",
          role: m.role ?? "",
          status: m.status ?? "",
        }));
      } catch {
        return [];
      }
    },
  };
}

function arrayToString(value: string | string[] | undefined | null): string {
  if (value === undefined || value === null) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

export function buildWorkspaceDeviceCommandDeps(options: ServiceRuntimeOptions): Required<WorkspaceDeviceCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listDevices: async (input: ListDevicesInput, options?: PaginationOptions) => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });
      const items: Device[] = [];

      const maxResults = options?.pageSize ?? 500;
      const pageToken = options?.pageToken;

      try {
        if (input.type === "chromebook") {
          const params: Record<string, unknown> = {
            customerId: "my_customer",
            maxResults,
          };
          if (input.orgUnitPath) {
            params.orgUnitPath = input.orgUnitPath;
          }
          if (pageToken !== undefined) {
            params.pageToken = pageToken;
          }
          const response = await admin.chromeosdevices.list(params);
          const devices = response.data.chromeosdevices ?? [];
          for (const d of devices) {
            items.push({
              deviceId: d.deviceId ?? "",
              email: d.annotatedUser ?? "",
              modelName: d.model ?? "",
              osVersion: d.osVersion ?? "",
              status: d.status ?? "",
              orgUnitPath: d.orgUnitPath ?? "",
              lastSync: d.lastSync ?? "",
            });
          }

          const result: { items: typeof items; nextPageToken?: string } = { items };
          if (response.data.nextPageToken) {
            result.nextPageToken = response.data.nextPageToken;
          }
          return result;
        } else if (input.type === "mobile") {
          const params: Record<string, unknown> = {
            customerId: "my_customer",
            maxResults,
          };
          if (pageToken !== undefined) {
            params.pageToken = pageToken;
          }
          const response = await admin.mobiledevices.list(params);
          const devices = response.data.mobiledevices ?? [];
          for (const d of devices) {
            items.push({
              deviceId: d.deviceId ?? "",
              email: arrayToString(d.email),
              modelName: arrayToString(d.model),
              osVersion: arrayToString(d.os),
              status: d.status ?? "",
              orgUnitPath: "",
              lastSync: d.lastSync ?? "",
            });
          }

          const result: { items: typeof items; nextPageToken?: string } = { items };
          if (response.data.nextPageToken) {
            result.nextPageToken = response.data.nextPageToken;
          }
          return result;
        } else {
          // Both types - fetch chromebooks and mobile
          const chromeParams: Record<string, unknown> = {
            customerId: "my_customer",
            maxResults,
          };
          if (input.orgUnitPath) {
            chromeParams.orgUnitPath = input.orgUnitPath;
          }
          if (pageToken !== undefined) {
            chromeParams.pageToken = pageToken;
          }

          const [chromeResponse, mobileResponse] = await Promise.all([
            admin.chromeosdevices.list(chromeParams),
            admin.mobiledevices.list({
              customerId: "my_customer",
              maxResults,
            }),
          ]);

          const chromeDevices = chromeResponse.data.chromeosdevices ?? [];
          for (const d of chromeDevices) {
            items.push({
              deviceId: d.deviceId ?? "",
              email: d.annotatedUser ?? "",
              modelName: d.model ?? "",
              osVersion: d.osVersion ?? "",
              status: d.status ?? "",
              orgUnitPath: d.orgUnitPath ?? "",
              lastSync: d.lastSync ?? "",
            });
          }

          const mobileDevices = mobileResponse.data.mobiledevices ?? [];
          for (const d of mobileDevices) {
            items.push({
              deviceId: d.deviceId ?? "",
              email: arrayToString(d.email),
              modelName: arrayToString(d.model),
              osVersion: arrayToString(d.os),
              status: d.status ?? "",
              orgUnitPath: "",
              lastSync: d.lastSync ?? "",
            });
          }

          const result: { items: typeof items; nextPageToken?: string } = { items };
          if (chromeResponse.data.nextPageToken) {
            result.nextPageToken = chromeResponse.data.nextPageToken;
          }
          return result;
        }
      } catch {
        return { items: [] };
      }
    },

    getDevice: async (deviceId: string): Promise<Device> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      // Try chromebook first
      try {
        const response = await admin.chromeosdevices.get({
          customerId: "my_customer",
          deviceId,
        });
        const d = response.data;
        return {
          deviceId: d.deviceId ?? "",
          email: d.annotatedUser ?? "",
          modelName: d.model ?? "",
          osVersion: d.osVersion ?? "",
          status: d.status ?? "",
          orgUnitPath: d.orgUnitPath ?? "",
          lastSync: d.lastSync ?? "",
        };
      } catch {
        // Try mobile device
        try {
          const response = await admin.mobiledevices.get({
            customerId: "my_customer",
            resourceId: deviceId,
          });
          const d = response.data;
          return {
            deviceId: d.deviceId ?? "",
            email: arrayToString(d.email),
            modelName: arrayToString(d.model),
            osVersion: arrayToString(d.os),
            status: d.status ?? "",
            orgUnitPath: "",
            lastSync: d.lastSync ?? "",
          };
        } catch {
          return { deviceId, email: "", modelName: "", osVersion: "", status: "", orgUnitPath: "", lastSync: "" };
        }
      }
    },

    wipeDevice: async (deviceId: string): Promise<DeviceActionResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      // Try mobile device wipe first
      try {
        await admin.mobiledevices.action({
          customerId: "my_customer",
          resourceId: deviceId,
          requestBody: { action: "admin_remote_wipe" },
        });
        return { deviceId, applied: true };
      } catch {
        // Try chromebook wipe
        try {
          await admin.chromeosdevices.action({
            customerId: "my_customer",
            resourceId: deviceId,
            requestBody: { action: "wipe_users" },
          });
          return { deviceId, applied: true };
        } catch {
          return { deviceId, applied: false };
        }
      }
    },

    disableDevice: async (deviceId: string): Promise<DeviceActionResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      // Try mobile device disable
      try {
        await admin.mobiledevices.action({
          customerId: "my_customer",
          resourceId: deviceId,
          requestBody: { action: "disable" },
        });
        return { deviceId, applied: true };
      } catch {
        // Try chromebook disable
        try {
          await admin.chromeosdevices.action({
            customerId: "my_customer",
            resourceId: deviceId,
            requestBody: { action: "disable" },
          });
          return { deviceId, applied: true };
        } catch {
          return { deviceId, applied: false };
        }
      }
    },
  };
}

export function buildWorkspaceReportCommandDeps(options: ServiceRuntimeOptions): Required<WorkspaceReportCommandDeps> {
  const runtime = new ServiceRuntime(options);

  /**
   * Calculate the start time for a given number of days ago in RFC 3339 format
   */
  function getStartTime(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  return {
    getLoginAudit: async (days: number): Promise<LoginActivity[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "reports_v1", auth });

      const result: LoginActivity[] = [];

      try {
        const response = await admin.activities.list({
          userKey: "all",
          applicationName: "login",
          startTime: getStartTime(days),
          maxResults: 1000,
        });

        const activities = response.data.items ?? [];

        for (const activity of activities) {
          const events = activity.events ?? [];
          for (const event of events) {
            // Extract IP address from the event parameters
            const parameters = event.parameters ?? [];
            const ipParam = parameters.find((p) => p.name === "ip_address");
            const ipAddress = ipParam?.value ?? "";

            // Determine if login was successful based on event name
            const success = event.name === "login_success";

            result.push({
              userEmail: activity.actor?.email ?? "",
              timestamp: activity.id?.time ?? "",
              ipAddress: ipAddress as string,
              success,
            });
          }
        }
      } catch (err) {
        console.error("getLoginAudit error:", err);
      }

      return result;
    },

    getAdminAudit: async (days: number): Promise<AdminActivity[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "reports_v1", auth });

      const result: AdminActivity[] = [];

      try {
        const response = await admin.activities.list({
          userKey: "all",
          applicationName: "admin",
          startTime: getStartTime(days),
          maxResults: 1000,
        });

        const activities = response.data.items ?? [];

        for (const activity of activities) {
          const events = activity.events ?? [];
          for (const event of events) {
            result.push({
              userEmail: activity.actor?.email ?? "",
              timestamp: activity.id?.time ?? "",
              action: event.name ?? "",
              resource: activity.id?.uniqueQualifier ?? "",
            });
          }
        }
      } catch (err) {
        console.error("getAdminAudit error:", err);
      }

      return result;
    },

    getDeletedUsers: async (days: number, options?: DeletedUserOptions): Promise<{ items: DeletedUser[]; nextPageToken?: string }> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "reports_v1", auth });

      const items: DeletedUser[] = [];
      let pageToken = options?.pageToken;
      const targetCount = options?.pageSize ?? 1000;
      let offset = 0;

      // Unpack our custom offset token
      if (pageToken !== undefined && typeof pageToken === 'string' && pageToken.includes('::')) {
        const parts = pageToken.split('::');
        pageToken = parts[0] === 'EMPTY' ? undefined : parts[0];
        offset = parseInt(parts[1] ?? '0', 10);
      }

      let currentGoogleToken = pageToken;

      try {
        let keepFetching = true;
        let loops = 0; // Prevent infinite loop

        while (keepFetching && loops < 100) {
          loops++;
          const params: Record<string, any> = {
            userKey: "all",
            applicationName: "admin",
            startTime: getStartTime(days),
            maxResults: 1000, // use maximum chunk size to minimize API calls for sparse data
          };

          if (currentGoogleToken) {
            params.pageToken = currentGoogleToken;
          }

          const response = await admin.activities.list(params);
          const activities = response.data.items ?? [];
          const nextGoogleToken = response.data.nextPageToken ?? undefined;

          const pageItems: DeletedUser[] = [];

          for (const activity of activities) {
            const events = activity.events ?? [];
            for (const event of events) {
              if (event.name === "DELETE_USER" || event.name === "delete_user") {
                const parameters = event.parameters ?? [];
                // Case-insensitive checks to guarantee reliable extraction
                const userEmailParam = parameters.find((p) => (p.name || "").toLowerCase() === "user_email");
                const firstNameParam = parameters.find((p) => (p.name || "").toLowerCase() === "first_name");
                const lastNameParam = parameters.find((p) => (p.name || "").toLowerCase() === "last_name");

                const userEmail = userEmailParam?.value ?? "";
                const firstName = firstNameParam?.value ? (firstNameParam.value as string) : undefined;
                const lastName = lastNameParam?.value ? (lastNameParam.value as string) : undefined;

                if (userEmail) {
                  let match = true;
                  const fn = firstName?.toLowerCase() ?? "";
                  const ln = lastName?.toLowerCase() ?? "";

                  if (options?.query) {
                    const q = options.query.toLowerCase();
                    if (!fn.includes(q) && !ln.includes(q) && !(userEmail as string).toLowerCase().includes(q)) {
                      match = false;
                    }
                  }

                  if (options?.firstName && !fn.includes(options.firstName.toLowerCase())) {
                    match = false;
                  }

                  if (options?.lastName && !ln.includes(options.lastName.toLowerCase())) {
                    match = false;
                  }

                  if (match) {
                    const deletedUser: DeletedUser = {
                      userEmail: userEmail as string,
                      deletionTime: activity.id?.time ?? "",
                    };
                    if (firstName) deletedUser.firstName = firstName;
                    if (lastName) deletedUser.lastName = lastName;
                    pageItems.push(deletedUser);
                  }
                }
              }
            }
          } // End processing activities

          // Extract the slice we need taking the offset into account
          let pageItemsToUse = pageItems;
          if (offset > 0) {
            pageItemsToUse = pageItems.slice(offset);
          }

          const itemsNeeded = targetCount - items.length;

          // If this slice hits our limit, return it with the updated custom pageToken state!
          if (pageItemsToUse.length >= itemsNeeded) {
            items.push(...pageItemsToUse.slice(0, itemsNeeded));

            const nextOffset = (offset > 0 ? offset : 0) + itemsNeeded;
            let returnToken = "";

            if (nextOffset >= pageItems.length) {
              if (!nextGoogleToken) {
                return { items };
              }
              returnToken = (nextGoogleToken || "EMPTY") + "::0";
            } else {
              returnToken = (currentGoogleToken || "EMPTY") + "::" + nextOffset;
            }

            return { items, nextPageToken: returnToken };
          } else {
            items.push(...pageItemsToUse);
            offset = 0;
            currentGoogleToken = nextGoogleToken;

            if (!currentGoogleToken) {
              keepFetching = false;
            }
          }
        }

        return { items };
      } catch (err) {
        console.error("getDeletedUsers error:", err);
        return { items }; // Don't wipe items out on failure anymore!
      }
    },

  };
}

export function buildWorkspaceOrgUnitCommandDeps(options: ServiceRuntimeOptions): Required<WorkspaceOrgUnitCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listOrgUnits: async (): Promise<OrgUnit[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.orgunits.list({
        customerId: "my_customer",
      });

      const units = response.data.organizationUnits ?? [];

      return units.map((unit) => ({
        orgUnitId: unit.orgUnitId ?? "",
        name: unit.name ?? "",
        orgUnitPath: unit.orgUnitPath ?? "",
        parentOrgUnitId: unit.parentOrgUnitId ?? undefined,
        description: unit.description ?? undefined,
      }));
    },

    createOrgUnit: async (input: CreateOrgUnitInput): Promise<CreateOrgUnitResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.orgunits.insert({
          customerId: "my_customer",
          requestBody: {
            name: input.name,
            parentOrgUnitPath: input.parentOrgUnitPath,
            description: input.description ?? null,
          },
        });

        return {
          orgUnitId: response.data.orgUnitId ?? "",
          name: response.data.name ?? input.name,
          orgUnitPath: response.data.orgUnitPath ?? "",
          applied: true,
        };
      } catch (err) {
        console.error("createOrgUnit error:", err);
        return {
          orgUnitId: "",
          name: input.name,
          orgUnitPath: "",
          applied: false,
        };
      }
    },

    getOrgUnit: async (orgUnitPath: string): Promise<OrgUnit> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.orgunits.get({
          customerId: "my_customer",
          orgUnitPath,
        });

        return {
          orgUnitId: response.data.orgUnitId ?? "",
          name: response.data.name ?? "",
          orgUnitPath: response.data.orgUnitPath ?? "",
          parentOrgUnitId: response.data.parentOrgUnitId ?? undefined,
          description: response.data.description ?? undefined,
        };
      } catch (err) {
        console.error("getOrgUnit error:", err);
        return {
          orgUnitId: "",
          name: "",
          orgUnitPath: "",
        };
      }
    },

    updateOrgUnit: async (orgUnitPath: string, input: UpdateOrgUnitInput): Promise<UpdateOrgUnitResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const requestBody: Record<string, unknown> = {};
        if (input.name) requestBody.name = input.name;
        if (input.description) requestBody.description = input.description;
        if (input.parentOrgUnitId) requestBody.parentOrgUnitId = input.parentOrgUnitId;

        const response = await admin.orgunits.update({
          customerId: "my_customer",
          orgUnitPath,
          requestBody,
        });

        return {
          orgUnitId: response.data.orgUnitId ?? "",
          name: response.data.name ?? "",
          applied: true,
        };
      } catch (err) {
        console.error("updateOrgUnit error:", err);
        return {
          orgUnitId: "",
          name: input.name ?? "",
          applied: false,
        };
      }
    },

    deleteOrgUnit: async (orgUnitPath: string): Promise<DeleteOrgUnitResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        await admin.orgunits.delete({
          customerId: "my_customer",
          orgUnitPath,
        });

        return {
          orgUnitPath,
          applied: true,
        };
      } catch (err) {
        console.error("deleteOrgUnit error:", err);
        return {
          orgUnitPath,
          applied: false,
        };
      }
    },
  };
}
