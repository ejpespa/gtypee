export function resolveDriveDownloadPath(id: string, out?: string): string {
  const trimmedOut = out?.trim() ?? "";
  if (trimmedOut !== "") {
    return trimmedOut;
  }
  return `${id}.download`;
}

export function normalizeDriveSearchQuery(query: string): string {
  return query.trim();
}
