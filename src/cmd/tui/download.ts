const GOOGLE_APPS_EXPORT_FORMAT: Record<string, string> = {
  'application/vnd.google-apps.document': 'pdf',
  'application/vnd.google-apps.spreadsheet': 'xlsx',
  'application/vnd.google-apps.presentation': 'pptx',
  'application/vnd.google-apps.drawing': 'pdf',
};

export function isGoogleAppsFile(mimeType: string): boolean {
  return mimeType.startsWith('application/vnd.google-apps.');
}

export function resolveDefaultDriveExportFormat(mimeType: string): string {
  return GOOGLE_APPS_EXPORT_FORMAT[mimeType] ?? 'pdf';
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return cleaned.length > 0 ? cleaned : 'download';
}

export function resolveNamedExportPath(name: string, format: string): string {
  return `${sanitizeFilename(name)}.${format.toLowerCase()}`;
}