import { google } from "googleapis";

import type { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { TaskItem, TasksCommandDeps } from "./commands.js";

export function buildTasksCommandDeps(runtime: ServiceRuntime): Required<TasksCommandDeps> {
  return {
    listTasks: async (listId?: string): Promise<TaskItem[]> => {
      const auth = await runtime.getClient(scopes("tasks"));
      const tasksApi = google.tasks({ version: "v1", auth });
      const res = await tasksApi.tasks.list({
        tasklist: listId ?? "@default",
      });
      const items = res.data.items ?? [];
      return items.map((item) => ({
        id: item.id ?? "",
        title: item.title ?? "",
        done: item.status === "completed",
      }));
    },

    addTask: async (title: string, listId?: string): Promise<{ id: string; added: boolean }> => {
      const auth = await runtime.getClient(scopes("tasks"));
      const tasksApi = google.tasks({ version: "v1", auth });
      const res = await tasksApi.tasks.insert({
        tasklist: listId ?? "@default",
        requestBody: { title },
      });
      return {
        id: res.data.id ?? "",
        added: true,
      };
    },

    updateTask: async (id: string, input: { title?: string; listId?: string }): Promise<{ id: string; updated: boolean }> => {
      const auth = await runtime.getClient(scopes("tasks"));
      const tasksApi = google.tasks({ version: "v1", auth });
      const requestBody: { title?: string } = {};
      if (input.title !== undefined) {
        requestBody.title = input.title;
      }
      await tasksApi.tasks.patch({
        tasklist: input.listId ?? "@default",
        task: id,
        requestBody,
      });
      return { id, updated: true };
    },

    completeTask: async (id: string, listId?: string): Promise<{ id: string; done: boolean }> => {
      const auth = await runtime.getClient(scopes("tasks"));
      const tasksApi = google.tasks({ version: "v1", auth });
      await tasksApi.tasks.patch({
        tasklist: listId ?? "@default",
        task: id,
        requestBody: { status: "completed" },
      });
      return { id, done: true };
    },
  };
}
