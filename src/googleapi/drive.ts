export function resolveDriveDownloadPath(id: string, out?: string): string {
  const trimmedOut = out?.trim() ?? "";
  if (trimmedOut !== "") {
    return trimmedOut;
  }
  return `${id}.download`;
}

const DRIVE_QUERY_FIELD_PATTERN =
  /\b(name|fullText|mimeType|modifiedTime|createdTime|viewedByMeTime|parents|owners|writers|viewers|starred|trashed|explicitlyTrashed)\b/i;

function escapeDriveQueryLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function looksLikeDriveQuery(query: string): boolean {
  if (DRIVE_QUERY_FIELD_PATTERN.test(query)) return true;
  if (/\bcontains\b/i.test(query)) return true;
  if (/mimeType\s*=/i.test(query)) return true;
  return false;
}

export function normalizeDriveSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  if (looksLikeDriveQuery(trimmed)) {
    return trimmed;
  }

  return `fullText contains '${escapeDriveQueryLiteral(trimmed)}'`;
}