import { google } from "googleapis";

import { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { SheetsCommandDeps, SheetsCreateResult, SheetsReadResult } from "./commands.js";

export function buildSheetsCommandDeps(runtime: ServiceRuntime): Required<SheetsCommandDeps> {
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

  return { createSheet, readRange, updateRange };
}
