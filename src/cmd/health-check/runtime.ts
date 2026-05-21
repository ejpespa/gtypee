import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes, type Service } from "../../googleauth/service.js";
import type { HealthCheckDeps, HealthCheckResult, AuthStatus } from "./commands.js";

// Lightweight probe per service — one cheap read-only API call each
const serviceProbes: Partial<Record<Service, (auth: unknown) => Promise<void>>> = {
  gmail: async (auth) => {
    const gmail = google.gmail({ version: "v1", auth: auth as never });
    await gmail.users.getProfile({ userId: "me" });
  },
  drive: async (auth) => {
    const drive = google.drive({ version: "v3", auth: auth as never });
    await drive.about.get({ fields: "user" });
  },
  calendar: async (auth) => {
    const cal = google.calendar({ version: "v3", auth: auth as never });
    await cal.calendarList.list({ maxResults: 1 });
  },
  chat: async (auth) => {
    const chat = google.chat({ version: "v1", auth: auth as never });
    await chat.spaces.list({ pageSize: 1 });
  },
  meet: async (auth) => {
    const meet = google.meet({ version: "v2", auth: auth as never });
    await meet.spaces.get({ name: "spaces/healthcheckprobe" });
  },
  contacts: async (auth) => {
    const people = google.people({ version: "v1", auth: auth as never });
    await people.people.get({ resourceName: "people/me", personFields: "names" });
  },
  tasks: async (auth) => {
    const tasks = google.tasks({ version: "v1", auth: auth as never });
    await tasks.tasklists.list({ maxResults: 1 });
  },
  sheets: async (auth) => {
    const drive = google.drive({ version: "v3", auth: auth as never });
    await drive.about.get({ fields: "user" });
  },
  docs: async (auth) => {
    const drive = google.drive({ version: "v3", auth: auth as never });
    await drive.about.get({ fields: "user" });
  },
  slides: async (auth) => {
    const drive = google.drive({ version: "v3", auth: auth as never });
    await drive.about.get({ fields: "user" });
  },
};

export function buildHealthCheckDeps(options: ServiceRuntimeOptions): Required<HealthCheckDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    checkHealth: async (filterServices) => {
      const result: HealthCheckResult = {
        auth: { ok: false },
        services: {},
        healthy: 0,
        total: 0,
      };

      // Step 1: Check auth by getting a client for any basic scope
      let auth: unknown;
      try {
        auth = await runtime.getClient(scopes("gmail"));
        const gmail = google.gmail({ version: "v1", auth: auth as never });
        const profile = await gmail.users.getProfile({ userId: "me" });
        const authStatus: AuthStatus = {
          ok: true,
          type: "oauth",
        };
        if (profile.data.emailAddress) {
          authStatus.email = profile.data.emailAddress;
        }
        result.auth = authStatus;
      } catch (err: unknown) {
        result.auth = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        return result;
      }

      // Step 2: Determine which services to probe
      const allProbeableServices = Object.keys(serviceProbes) as Service[];
      const servicesToCheck = filterServices
        ? (filterServices.filter((s) => s in serviceProbes) as Service[])
        : allProbeableServices;

      // Step 3: Probe each service
      for (const serviceName of servicesToCheck) {
        const probe = serviceProbes[serviceName];
        if (!probe) continue;

        result.total++;
        try {
          const serviceAuth = await runtime.getClient(scopes(serviceName));
          await probe(serviceAuth);
          result.services[serviceName] = { ok: true };
          result.healthy++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          result.services[serviceName] = { ok: false, error: message };
        }
      }

      return result;
    },
  };
}
