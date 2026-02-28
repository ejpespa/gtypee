import { google } from "googleapis";

import { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { SheetsCommandDeps, SheetsCreateResult, SheetsExportResult, SheetsReadResult, SheetsSummary } from "./commands.js";
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
    // TODO: Implement export functionality in Task 13
    return { id, format, path: out ?? "", exported: false };
  };

  return { listSheets, exportSheet, createSheet, readRange, updateRange };
}
