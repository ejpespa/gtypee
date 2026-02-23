import { google } from "googleapis";

import type { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { AppScriptCommandDeps, AppScriptProject } from "./commands.js";

export function buildAppScriptCommandDeps(runtime: ServiceRuntime): Required<AppScriptCommandDeps> {
  return {
    listProjects: async (): Promise<AppScriptProject[]> => {
      const auth = await runtime.getClient(scopes("appscript"));
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.script'",
        fields: "files(id,name)",
      });
      const files = res.data.files ?? [];
      return files.map((f) => ({
        id: f.id ?? "",
        title: f.name ?? "",
      }));
    },

    getProject: async (scriptId: string): Promise<AppScriptProject> => {
      const auth = await runtime.getClient(scopes("appscript"));
      const script = google.script({ version: "v1", auth });
      const res = await script.projects.get({ scriptId });
      return {
        id: res.data.scriptId ?? "",
        title: res.data.title ?? "",
      };
    },

    createProject: async (title: string): Promise<AppScriptProject & { created: boolean }> => {
      const auth = await runtime.getClient(scopes("appscript"));
      const script = google.script({ version: "v1", auth });
      const res = await script.projects.create({
        requestBody: { title },
      });
      return {
        id: res.data.scriptId ?? "",
        title: res.data.title ?? title,
        created: true,
      };
    },

    runFunction: async (
      scriptId: string,
      fn: string,
      input?: { params?: unknown[]; devMode?: boolean },
    ): Promise<{ done: boolean; result?: unknown; error?: string }> => {
      const auth = await runtime.getClient(scopes("appscript"));
      const script = google.script({ version: "v1", auth });
      const res = await script.scripts.run({
        scriptId,
        requestBody: {
          function: fn,
          parameters: (input?.params as object[]) ?? null,
          devMode: input?.devMode ?? null,
        },
      });
      const data = res.data;
      if (data.error) {
        const errorMessage = data.error.details
          ?.map((d: Record<string, unknown>) => JSON.stringify(d))
          .join("; ") ?? "unknown error";
        return { done: true, error: errorMessage };
      }
      return {
        done: data.done ?? true,
        result: data.response,
      };
    },
  };
}
