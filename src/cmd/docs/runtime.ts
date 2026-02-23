import { google } from "googleapis";

import { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { DocsCommandDeps, DocsCreateResult, DocsReadResult, DocsWriteResult } from "./commands.js";

function extractText(
  body: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string | null } }> } }> } | undefined,
): string {
  if (!body?.content) {
    return "";
  }

  const parts: string[] = [];
  for (const structural of body.content) {
    const elements = structural.paragraph?.elements;
    if (!elements) {
      continue;
    }
    for (const element of elements) {
      const text = element.textRun?.content;
      if (text) {
        parts.push(text);
      }
    }
  }

  return parts.join("");
}

export function buildDocsCommandDeps(runtime: ServiceRuntime): Required<DocsCommandDeps> {
  const createDoc = async (title: string): Promise<DocsCreateResult> => {
    const auth = await runtime.getClient(scopes("docs"));
    const docs = google.docs({ version: "v1", auth });
    const response = await docs.documents.create({
      requestBody: { title },
    });
    return { id: response.data.documentId ?? "", title: response.data.title ?? title };
  };

  const readDoc = async (id: string): Promise<DocsReadResult> => {
    const auth = await runtime.getClient(scopes("docs"));
    const docs = google.docs({ version: "v1", auth });
    const response = await docs.documents.get({ documentId: id });
    const title = response.data.title ?? "";
    const markdown = extractText(response.data.body);
    return { id, title, markdown };
  };

  const toMarkdown = async (id: string): Promise<DocsReadResult> => {
    return readDoc(id);
  };

  const writeDoc = async (id: string, markdown: string): Promise<DocsWriteResult> => {
    const auth = await runtime.getClient(scopes("docs"));
    const docs = google.docs({ version: "v1", auth });

    // First, get the document to find the content length for deletion.
    const current = await docs.documents.get({ documentId: id });
    const body = current.data.body;
    const endIndex = body?.content?.at(-1)?.endIndex ?? 1;

    const requests: Array<Record<string, unknown>> = [];

    // Delete all existing content except the trailing newline (index 1 to endIndex - 1).
    if (endIndex > 1) {
      requests.push({
        deleteContentRange: {
          range: { startIndex: 1, endIndex: endIndex - 1 },
        },
      });
    }

    // Insert the new markdown text at the beginning of the body.
    if (markdown.length > 0) {
      requests.push({
        insertText: {
          location: { index: 1 },
          text: markdown,
        },
      });
    }

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: id,
        requestBody: { requests },
      });
    }

    return { id, updated: true };
  };

  return { createDoc, readDoc, toMarkdown, writeDoc };
}
