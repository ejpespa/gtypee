import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { MeetCommandDeps } from "./commands.js";

export function buildMeetCommandDeps(options: ServiceRuntimeOptions): Required<MeetCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    createSpace: async () => {
      const auth = await runtime.getClient(scopes("meet"));
      const meet = google.meet({ version: "v2", auth });
      const res = await meet.spaces.create({ requestBody: {} });
      return {
        name: res.data.name ?? "",
        meetingUri: res.data.meetingUri ?? "",
        meetingCode: res.data.meetingCode ?? "",
      };
    },

    getSpace: async (spaceName) => {
      const auth = await runtime.getClient(scopes("meet"));
      const meet = google.meet({ version: "v2", auth });
      const res = await meet.spaces.get({ name: spaceName });
      return {
        name: res.data.name ?? "",
        meetingUri: res.data.meetingUri ?? "",
        meetingCode: res.data.meetingCode ?? "",
      };
    },

    endMeeting: async (spaceName) => {
      const auth = await runtime.getClient(scopes("meet"));
      const meet = google.meet({ version: "v2", auth });
      const res = await meet.spaces.endActiveConference({ name: spaceName });
      return { ended: res.status === 200 };
    },
  };
}
