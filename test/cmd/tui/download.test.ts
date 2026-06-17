import { describe, expect, it } from 'vitest';
import {
  isGoogleAppsFile,
  resolveDefaultDriveExportFormat,
  resolveNamedExportPath,
  sanitizeFilename,
} from '../../../src/cmd/tui/download.js';

describe('tui download helpers', () => {
  it('detects Google Workspace mime types', () => {
    expect(isGoogleAppsFile('application/vnd.google-apps.presentation')).toBe(true);
    expect(isGoogleAppsFile('application/pdf')).toBe(false);
  });

  it('resolves default export format by mime type', () => {
    expect(resolveDefaultDriveExportFormat('application/vnd.google-apps.presentation')).toBe('pptx');
    expect(resolveDefaultDriveExportFormat('application/vnd.google-apps.spreadsheet')).toBe('xlsx');
    expect(resolveDefaultDriveExportFormat('application/vnd.google-apps.unknown')).toBe('pdf');
  });

  it('sanitizes unsafe filename characters', () => {
    expect(sanitizeFilename('report: Q1')).toBe('report_ Q1');
    expect(sanitizeFilename('   ')).toBe('download');
  });

  it('builds export path from name and format', () => {
    expect(resolveNamedExportPath('My Doc', 'pdf')).toBe('My Doc.pdf');
  });
});