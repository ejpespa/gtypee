import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { KeepCommandDeps, KeepNote } from "./commands.js";

export function buildKeepCommandDeps(options: ServiceRuntimeOptions): Required<KeepCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    ensureWorkspace: async () => {
      await runtime.getClient(scopes("keep"));
    },

    listNotes: async (): Promise<KeepNote[]> => {
      const auth = await runtime.getClient(scopes("keep"));
      const keep = google.keep({ version: "v1", auth });

      const response = await keep.notes.list();
      const notes = response.data.notes ?? [];

      return notes.map((note) => ({
        id: note.name ?? "",
        title: note.title ?? "",
      }));
    },

    getNote: async (id: string): Promise<KeepNote> => {
      const auth = await runtime.getClient(scopes("keep"));
      const keep = google.keep({ version: "v1", auth });

      const response = await keep.notes.get({ name: id });

      return {
        id: response.data.name ?? "",
        title: response.data.title ?? "",
      };
    },

    searchNotes: async (query: string): Promise<KeepNote[]> => {
      const auth = await runtime.getClient(scopes("keep"));
      const keep = google.keep({ version: "v1", auth });

      // Google Keep API does not support server-side filtering via a filter parameter,
      // so we list all notes and filter client-side by title match.
      const response = await keep.notes.list();
      const notes = response.data.notes ?? [];

      const needle = query.toLowerCase();
      return notes
        .filter((note) => (note.title ?? "").toLowerCase().includes(needle))
        .map((note) => ({
          id: note.name ?? "",
          title: note.title ?? "",
        }));
    },

    createNote: async (title: string): Promise<{ id: string; created: boolean }> => {
      const auth = await runtime.getClient(scopes("keep"));
      const keep = google.keep({ version: "v1", auth });

      const response = await keep.notes.create({
        requestBody: {
          title,
          body: { text: { text: "" } },
        },
      });

      return {
        id: response.data.name ?? "",
        created: response.status === 200,
      };
    },

    updateNote: async (id: string, title: string): Promise<{ id: string; updated: boolean }> => {
      // Google Keep API does not expose a direct update/patch method for note titles.
      // As a workaround, delete the existing note and recreate it with the new title.
      const auth = await runtime.getClient(scopes("keep"));
      const keep = google.keep({ version: "v1", auth });

      try {
        await keep.notes.delete({ name: id });

        const response = await keep.notes.create({
          requestBody: {
            title,
            body: { text: { text: "" } },
          },
        });

        return {
          id: response.data.name ?? "",
          updated: true,
        };
      } catch {
        return { id, updated: false };
      }
    },
  };
}
