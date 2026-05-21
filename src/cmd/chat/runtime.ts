import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { ChatCommandDeps, ChatMessage, ChatSpace } from "./commands.js";

export function buildChatCommandDeps(options: ServiceRuntimeOptions): Required<ChatCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    ensureWorkspace: async () => {
      await runtime.getClient(scopes("chat"));
    },

    listSpaces: async (): Promise<ChatSpace[]> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.list();
      const spaces = response.data.spaces ?? [];

      return spaces.map((space) => ({
        id: space.name ?? "",
        displayName: space.displayName ?? "",
      }));
    },

    getSpace: async (spaceId: string): Promise<ChatSpace> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.get({ name: spaceId });

      return {
        id: response.data.name ?? "",
        displayName: response.data.displayName ?? "",
      };
    },

    createSpace: async (displayName: string): Promise<{ id: string; created: boolean }> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.create({
        requestBody: {
          displayName,
          spaceType: "SPACE",
        },
      });

      return {
        id: response.data.name ?? "",
        created: response.status === 200,
      };
    },

    listMessages: async (spaceId: string): Promise<ChatMessage[]> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.messages.list({ parent: spaceId });
      const messages = response.data.messages ?? [];

      return messages.map((message) => ({
        id: message.name ?? "",
        text: message.text ?? "",
      }));
    },

    sendMessage: async (spaceId: string, text: string): Promise<{ id: string; sent: boolean }> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.messages.create({
        parent: spaceId,
        requestBody: { text },
      });

      return {
        id: response.data.name ?? "",
        sent: response.status === 200,
      };
    },

    findDirectMessage: async (email: string): Promise<ChatSpace | null> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      try {
        const response = await chat.spaces.findDirectMessage({
          name: `users/${email}`,
        });

        if (response.data.name) {
          return {
            id: response.data.name,
            displayName: response.data.displayName ?? "",
          };
        }
      } catch {
        // DM doesn't exist yet — return null so caller can set one up
      }

      return null;
    },

    setupDirectMessage: async (email: string): Promise<ChatSpace> => {
      const auth = await runtime.getClient(scopes("chat"));
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.setup({
        requestBody: {
          space: {
            spaceType: "DIRECT_MESSAGE",
          },
          memberships: [
            {
              member: {
                name: `users/${email}`,
                type: "HUMAN",
              },
            },
          ],
        },
      });

      return {
        id: response.data.name ?? "",
        displayName: response.data.displayName ?? "",
      };
    },
  };
}
