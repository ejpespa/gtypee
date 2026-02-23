import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
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
  type SetOrgUnitResult,
  type AliasResult,
  type PhotoResult,
  type BackupCodesResult,
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
  type WorkspaceOrgUnitCommandDeps,
  type CreateOrgUnitInput,
  type CreateOrgUnitResult,
  type UpdateOrgUnitInput,
  type UpdateOrgUnitResult,
  type DeleteOrgUnitResult,
} from "./commands.js";

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function buildWorkspaceUserCommandDeps(options: ServiceRuntimeOptions): Required<WorkspaceUserCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listUsers: async (orgUnitPath?: string): Promise<WorkspaceUser[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      let query = "isSuspended=false";
      if (orgUnitPath) {
        query = `orgUnitPath='${orgUnitPath}'`;
      }

      const response = await admin.users.list({
        customer: "my_customer",
        maxResults: 500,
        orderBy: "email",
        query,
      });

      const users = response.data.users ?? [];
      const result: WorkspaceUser[] = [];

      for (const user of users) {
        result.push({
          id: user.id ?? "",
          primaryEmail: user.primaryEmail ?? "",
          name: {
            givenName: user.name?.givenName ?? "",
            familyName: user.name?.familyName ?? "",
          },
          suspended: user.suspended ?? false,
          orgUnitPath: user.orgUnitPath ?? "/",
          isAdmin: user.isAdmin ?? false,
        });
      }

      return result;
    },

    createUser: async (input: CreateUserInput): Promise<CreateUserResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const password = input.password ?? generatePassword(8);

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

    resetPassword: async (email: string): Promise<ResetPasswordResult> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      const newPassword = generatePassword(8);

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
      } catch (err) {
        console.error("generateBackupCodes error:", err);
        return { email, codes: [], applied: false };
      }
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

    listGroups: async (): Promise<GroupInfo[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });

      try {
        const response = await admin.groups.list({ customer: "my_customer" });
        const groups = response.data.groups ?? [];
        return groups.map((g) => ({
          id: g.id ?? "",
          email: g.email ?? "",
          name: g.name ?? "",
        }));
      } catch {
        return [];
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
    listDevices: async (input: ListDevicesInput): Promise<Device[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "directory_v1", auth });
      const result: Device[] = [];

      try {
        if (input.type === "chromebook") {
          const params: Record<string, unknown> = {
            customerId: "my_customer",
            maxResults: 500,
          };
          if (input.orgUnitPath) {
            params.orgUnitPath = input.orgUnitPath;
          }
          const response = await admin.chromeosdevices.list(params);
          const devices = response.data.chromeosdevices ?? [];
          for (const d of devices) {
            result.push({
              deviceId: d.deviceId ?? "",
              email: d.annotatedUser ?? "",
              modelName: d.model ?? "",
              osVersion: d.osVersion ?? "",
              status: d.status ?? "",
              orgUnitPath: d.orgUnitPath ?? "",
              lastSync: d.lastSync ?? "",
            });
          }
        } else if (input.type === "mobile") {
          const response = await admin.mobiledevices.list({
            customerId: "my_customer",
            maxResults: 500,
          });
          const devices = response.data.mobiledevices ?? [];
          for (const d of devices) {
            result.push({
              deviceId: d.deviceId ?? "",
              email: arrayToString(d.email),
              modelName: arrayToString(d.model),
              osVersion: arrayToString(d.os),
              status: d.status ?? "",
              orgUnitPath: "",
              lastSync: d.lastSync ?? "",
            });
          }
        } else {
          // Both types - fetch chromebooks and mobile
          const chromeParams: Record<string, unknown> = {
            customerId: "my_customer",
            maxResults: 500,
          };
          if (input.orgUnitPath) {
            chromeParams.orgUnitPath = input.orgUnitPath;
          }
          const [chromeResponse, mobileResponse] = await Promise.all([
            admin.chromeosdevices.list(chromeParams),
            admin.mobiledevices.list({
              customerId: "my_customer",
              maxResults: 500,
            }),
          ]);

          const chromeDevices = chromeResponse.data.chromeosdevices ?? [];
          for (const d of chromeDevices) {
            result.push({
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
            result.push({
              deviceId: d.deviceId ?? "",
              email: arrayToString(d.email),
              modelName: arrayToString(d.model),
              osVersion: arrayToString(d.os),
              status: d.status ?? "",
              orgUnitPath: "",
              lastSync: d.lastSync ?? "",
            });
          }
        }
      } catch {
        return [];
      }

      return result;
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

    getDeletedUsers: async (days: number): Promise<DeletedUser[]> => {
      const auth = await runtime.getClient(scopes("workspace"));
      const admin = google.admin({ version: "reports_v1", auth });

      const result: DeletedUser[] = [];

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
            // Filter for user deletion events
            if (event.name === "DELETE_USER" || event.name === "delete_user") {
              // Try to extract the deleted user's email from parameters
              const parameters = event.parameters ?? [];
              const userEmailParam = parameters.find(
                (p) => p.name === "user_email" || p.name === "USER_EMAIL"
              );
              const userEmail = userEmailParam?.value ?? "";

              if (userEmail) {
                result.push({
                  userEmail: userEmail as string,
                  deletionTime: activity.id?.time ?? "",
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("getDeletedUsers error:", err);
      }

      return result;
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
