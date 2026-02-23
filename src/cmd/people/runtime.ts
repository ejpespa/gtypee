import { google } from "googleapis";

import type { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { PeopleCommandDeps, PersonProfile } from "./commands.js";

function toPersonProfile(person: { resourceName?: string | null; names?: Array<{ displayName?: string | null }> | null; emailAddresses?: Array<{ value?: string | null }> | null }): PersonProfile {
  const profile: PersonProfile = {
    displayName: person.names?.[0]?.displayName ?? "",
    email: person.emailAddresses?.[0]?.value ?? "",
  };
  if (person.resourceName != null) {
    profile.resourceName = person.resourceName;
  }
  return profile;
}

export function buildPeopleCommandDeps(runtime: ServiceRuntime): Required<PeopleCommandDeps> {
  return {
    me: async (): Promise<PersonProfile> => {
      const auth = await runtime.getClient(scopes("people"));
      const people = google.people({ version: "v1", auth });
      const res = await people.people.get({
        resourceName: "people/me",
        personFields: "names,emailAddresses",
      });
      return toPersonProfile(res.data);
    },

    search: async (query: string): Promise<PersonProfile[]> => {
      const auth = await runtime.getClient(scopes("people"));
      const people = google.people({ version: "v1", auth });
      const res = await people.people.searchContacts({
        query,
        readMask: "names,emailAddresses",
      });
      const results = res.data.results ?? [];
      return results.map((r) => toPersonProfile(r.person ?? {}));
    },

    getPerson: async (resourceName: string): Promise<PersonProfile> => {
      const auth = await runtime.getClient(scopes("people"));
      const people = google.people({ version: "v1", auth });
      const res = await people.people.get({
        resourceName,
        personFields: "names,emailAddresses",
      });
      return toPersonProfile(res.data);
    },

    updatePerson: async (resourceName: string, input: { displayName?: string; email?: string }): Promise<{ resourceName: string; updated: boolean }> => {
      const auth = await runtime.getClient(scopes("people"));
      const people = google.people({ version: "v1", auth });

      const updatePersonFields: string[] = [];
      const requestBody: { names?: Array<{ displayName: string }>; emailAddresses?: Array<{ value: string }> } = {};

      if (input.displayName !== undefined) {
        updatePersonFields.push("names");
        requestBody.names = [{ displayName: input.displayName }];
      }

      if (input.email !== undefined) {
        updatePersonFields.push("emailAddresses");
        requestBody.emailAddresses = [{ value: input.email }];
      }

      await people.people.updateContact({
        resourceName,
        updatePersonFields: updatePersonFields.join(","),
        requestBody,
      });

      return { resourceName, updated: true };
    },
  };
}
