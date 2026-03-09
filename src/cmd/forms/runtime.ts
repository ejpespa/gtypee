import { google } from "googleapis";

import type { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { FormInfo, FormsCommandDeps } from "./commands.js";

export function buildFormsCommandDeps(runtime: ServiceRuntime): Required<FormsCommandDeps> {
  return {
    createForm: async (title: string): Promise<FormInfo & { created: boolean }> => {
      const auth = await runtime.getClient(scopes("forms"));
      const forms = google.forms({ version: "v1", auth });
      const res = await forms.forms.create({
        requestBody: { info: { title } },
      });
      return {
        id: res.data.formId ?? "",
        title: res.data.info?.title ?? title,
        created: true,
      };
    },

    getForm: async (id: string): Promise<FormInfo> => {
      const auth = await runtime.getClient(scopes("forms"));
      const forms = google.forms({ version: "v1", auth });
      const res = await forms.forms.get({ formId: id });
      return {
        id: res.data.formId ?? "",
        title: res.data.info?.title ?? "",
      };
    },

    listResponses: async (id: string): Promise<Array<{ id: string; submittedAt: string }>> => {
      const auth = await runtime.getClient(scopes("forms"));
      const forms = google.forms({ version: "v1", auth });
      const res = await forms.forms.responses.list({ formId: id });
      const responses = res.data.responses ?? [];
      return responses.map((r) => ({
        id: r.responseId ?? "",
        submittedAt: r.lastSubmittedTime ?? "",
      }));
    },
  };
}
