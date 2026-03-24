import { google } from "googleapis";

import * as fs from "fs";
import * as path from "path";

import { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { SheetsCommandDeps, SheetsCreateResult, SheetsExportResult, SheetsReadResult, SheetsSummary, SheetsShareOptions, SheetsShareResult } from "./commands.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export function buildSheetsCommandDeps(runtime: ServiceRuntime): Required<SheetsCommandDeps> {
  const listSheets = async (options?: PaginationOptions): Promise<PaginatedResult<SheetsSummary>> => {
    const auth = await runtime.getClient(scopes("drive"));
    const drive = google.drive({ version: "v3", auth });
    const params: { q: string; pageSize: number; pageToken?: string; fields: string } = {
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      pageSize: options?.pageSize ?? 100,
      fields: "nextPageToken,files(id,name,mimeType)",
    };
    if (options?.pageToken !== undefined) {
      params.pageToken = options.pageToken;
    }
    const res = await drive.files.list(params);
    const files = res.data.files ?? [];
    const result: PaginatedResult<SheetsSummary> = {
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

  const createSheet = async (title: string): Promise<SheetsCreateResult> => {
    const auth = await runtime.getClient(scopes("sheets"));
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
      },
    });
    return { id: response.data.spreadsheetId ?? "", title: response.data.properties?.title ?? title };
  };

  const readRange = async (sheetId: string, range: string): Promise<SheetsReadResult> => {
    const auth = await runtime.getClient(scopes("sheets"));
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    const values = (response.data.values as string[][] | undefined) ?? [];
    return { range: response.data.range ?? range, values };
  };

  const updateRange = async (
    sheetId: string,
    range: string,
    values: string[][],
  ): Promise<{ updated: boolean }> => {
    const auth = await runtime.getClient(scopes("sheets"));
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return { updated: true };
  };

  const exportSheet = async (id: string, format: string, out?: string): Promise<SheetsExportResult> => {
    const SHEETS_EXPORT_MIME_TYPES: Record<string, string> = {
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
      pdf: "application/pdf",
      ods: "application/vnd.oasis.opendocument.spreadsheet",
      tsv: "text/tab-separated-values",
      zip: "application/zip",
    };

    const mimeType = SHEETS_EXPORT_MIME_TYPES[format];
    if (!mimeType) {
      throw new Error(`Unsupported export format: ${format}. Supported formats: ${Object.keys(SHEETS_EXPORT_MIME_TYPES).join(", ")}`);
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

  const shareSheet = async (fileId: string, options: SheetsShareOptions): Promise<SheetsShareResult> => {
    const auth = await runtime.getClient(scopes("drive"));
    const drive = google.drive({ version: "v3", auth });

    // Build permission request based on type
    const permissionRequest: {
      role: string;
      type: string;
      emailAddress?: string;
      domain?: string;
      allowFileDiscovery?: boolean;
    } = {
      role: options.role,
      type: options.type === "anyoneWithLink" ? "anyone" : options.type,
    };

    // Set type-specific fields
    if (options.type === "user" || options.type === "group") {
      if (!options.email) {
        throw new Error(`--email is required for type="${options.type}"`);
      }
      permissionRequest.emailAddress = options.email;
    } else if (options.type === "domain") {
      if (!options.domain) {
        throw new Error(`--domain is required for type="domain"`);
      }
      permissionRequest.domain = options.domain;
      permissionRequest.allowFileDiscovery = true; // Allow domain users to find via search
    } else if (options.type === "anyoneWithLink") {
      permissionRequest.allowFileDiscovery = false; // Only accessible with link
    }

    // Build the API call parameters
    const apiParams: {
      fileId: string;
      requestBody: typeof permissionRequest;
      sendNotificationEmail?: boolean;
      emailMessage?: string;
    } = {
      fileId,
      requestBody: permissionRequest,
    };

    if (options.notify !== undefined) {
      apiParams.sendNotificationEmail = options.notify;
    }

    if (options.message) {
      apiParams.emailMessage = options.message;
    }

    try {
      const response = await drive.permissions.create(apiParams);
      return {
        id: response.data.id ?? "",
        fileId,
        shared: true,
      };
    } catch (error) {
      // Return failure result instead of throwing
      return {
        id: "",
        fileId,
        shared: false,
      };
    }
  };

  return { listSheets, exportSheet, createSheet, readRange, updateRange, shareSheet };
}
