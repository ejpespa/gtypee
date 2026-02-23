import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { GroupsCommandDeps, GroupSummary } from "./commands.js";

export function buildGroupsCommandDeps(options: ServiceRuntimeOptions): Required<GroupsCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listGroups: async (): Promise<GroupSummary[]> => {
      const auth = await runtime.getClient(scopes("groups"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.groups.list({ customer: "my_customer" });
      const groups = response.data.groups ?? [];

      return groups.map((group) => ({
        name: group.name ?? "",
        groupKey: group.email ?? "",
      }));
    },

    listMembers: async (group: string): Promise<Array<{ email: string; role: string }>> => {
      const auth = await runtime.getClient(scopes("groups"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.members.list({ groupKey: group });
      const members = response.data.members ?? [];

      return members.map((member) => ({
        email: member.email ?? "",
        role: member.role ?? "",
      }));
    },

    getGroup: async (group: string): Promise<GroupSummary> => {
      const auth = await runtime.getClient(scopes("groups"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.groups.get({ groupKey: group });

      return {
        name: response.data.name ?? "",
        groupKey: response.data.email ?? "",
      };
    },

    addMember: async (group: string, email: string, role: string): Promise<{ groupKey: string; email: string; role: string; applied: boolean }> => {
      const auth = await runtime.getClient(scopes("groups"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.members.insert({
        groupKey: group,
        requestBody: { email, role },
      });

      return {
        groupKey: group,
        email: response.data.email ?? email,
        role: response.data.role ?? role,
        applied: response.status === 200,
      };
    },

    removeMember: async (group: string, email: string): Promise<{ applied: boolean }> => {
      const auth = await runtime.getClient(scopes("groups"));
      const admin = google.admin({ version: "directory_v1", auth });

      const response = await admin.members.delete({
        groupKey: group,
        memberKey: email,
      });

      return { applied: response.status === 200 || response.status === 204 };
    },
  };
}
