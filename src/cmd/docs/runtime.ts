import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

import { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { DocsCommandDeps, DocsCreateResult, DocsReadResult, DocsWriteResult, DocsExportResult, DocsSummary } from "./commands.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

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
  const listDocs = async (options?: PaginationOptions): Promise<PaginatedResult<DocsSummary>> => {
    const auth = await runtime.getClient(scopes("drive"));
    const drive = google.drive({ version: "v3", auth });
    const params: { q: string; pageSize: number; pageToken?: string; fields: string } = {
      q: "mimeType='application/vnd.google-apps.document'",
      pageSize: options?.pageSize ?? 100,
      fields: "nextPageToken,files(id,name,mimeType)",
    };
    if (options?.pageToken !== undefined) {
      params.pageToken = options.pageToken;
    }
    const res = await drive.files.list(params);
    const files = res.data.files ?? [];
    const result: PaginatedResult<DocsSummary> = {
      items: files.map((f) => ({
        id: f.id ?? "",
        name: f.name ?? "",
        mimeType: f.mimeType ?? "",
      })),
    };
    if (res.data.nextPageToken) {
      result.nextPageToken = res.data.nextPageToken;
    }
    return result;
  };

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

  const exportDoc = async (id: string, format: string, out?: string): Promise<DocsExportResult> => {
    const DOCS_EXPORT_MIME_TYPES: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      odt: "application/vnd.oasis.opendocument.text",
      txt: "text/plain",
      html: "text/html",
      epub: "application/epub+zip",
    };

    const mimeType = DOCS_EXPORT_MIME_TYPES[format];
    if (!mimeType) {
      throw new Error(`Unsupported export format: ${format}. Supported formats: ${Object.keys(DOCS_EXPORT_MIME_TYPES).join(", ")}`);
    }

    const auth = await runtime.getClient(scopes("drive"));
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.export({
      fileId: id,
      mimeType,
    }, { responseType: "arraybuffer" });

    const outputPath = out ?? `${id}.${format}`;
    const dir = path.dirname(outputPath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, Buffer.from(response.data as ArrayBuffer));

    return {
      id,
      format,
      path: outputPath,
      exported: true,
    };
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

  return { listDocs, exportDoc, createDoc, readDoc, toMarkdown, writeDoc };
}
