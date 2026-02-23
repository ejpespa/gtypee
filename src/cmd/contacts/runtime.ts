import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { ContactsCommandDeps, ContactSummary } from "./commands.js";

export function buildContactsCommandDeps(options: ServiceRuntimeOptions): Required<ContactsCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listContacts: async (): Promise<ContactSummary[]> => {
      const auth = await runtime.getClient(scopes("contacts"));
      const people = google.people({ version: "v1", auth });

      const response = await people.people.connections.list({
        resourceName: "people/me",
        personFields: "emailAddresses",
        pageSize: 100,
      });
      const connections = response.data.connections ?? [];

      return connections.map((person) => ({
        resourceName: person.resourceName ?? "",
        email: person.emailAddresses?.[0]?.value ?? "",
      }));
    },

    searchContacts: async (query: string): Promise<ContactSummary[]> => {
      const auth = await runtime.getClient(scopes("contacts"));
      const people = google.people({ version: "v1", auth });

      const response = await people.people.searchContacts({
        query,
        readMask: "emailAddresses",
      });
      const results = response.data.results ?? [];

      return results.map((result) => ({
        resourceName: result.person?.resourceName ?? "",
        email: result.person?.emailAddresses?.[0]?.value ?? "",
      }));
    },

    getContact: async (resourceName: string): Promise<ContactSummary> => {
      const auth = await runtime.getClient(scopes("contacts"));
      const people = google.people({ version: "v1", auth });

      const response = await people.people.get({
        resourceName,
        personFields: "emailAddresses",
      });

      return {
        resourceName: response.data.resourceName ?? "",
        email: response.data.emailAddresses?.[0]?.value ?? "",
      };
    },

    updateContact: async (resourceName: string, email: string): Promise<{ resourceName: string; updated: boolean }> => {
      const auth = await runtime.getClient(scopes("contacts"));
      const people = google.people({ version: "v1", auth });

      // Fetch the current contact to get the etag required for updates
      const current = await people.people.get({
        resourceName,
        personFields: "emailAddresses",
      });
      const etag = current.data.etag ?? "";

      await people.people.updateContact({
        resourceName,
        updatePersonFields: "emailAddresses",
        requestBody: {
          etag,
          emailAddresses: [{ value: email }],
        },
      });

      return { resourceName, updated: true };
    },
  };
}
