import { describe, expect, it } from 'vitest';
import {
  buildDriveFolderQuery,
  normalizeDriveSearchQuery,
  resolveDriveDownloadPath,
} from '../../src/googleapi/drive.js';

describe('drive helpers', () => {
  it('resolveDriveDownloadPath uses id when out is empty', () => {
    expect(resolveDriveDownloadPath('abc123')).toBe('abc123.download');
  });

  it('wraps plain text as fullText contains query', () => {
    expect(normalizeDriveSearchQuery('trip')).toBe("fullText contains 'trip'");
  });

  it('escapes single quotes in plain text', () => {
    expect(normalizeDriveSearchQuery("Joe's trip")).toBe("fullText contains 'Joe\\'s trip'");
  });

  it('passes through explicit Drive query syntax', () => {
    expect(normalizeDriveSearchQuery("name contains 'report'")).toBe("name contains 'report'");
    expect(normalizeDriveSearchQuery("mimeType = 'application/pdf'")).toBe("mimeType = 'application/pdf'");
  });

  it('passes through queries with logical operators', () => {
    expect(normalizeDriveSearchQuery("name contains 'a' and trashed = false")).toBe(
      "name contains 'a' and trashed = false",
    );
  });

  it('wraps plain text that includes and/or words', () => {
    expect(normalizeDriveSearchQuery('trip and tour')).toBe("fullText contains 'trip and tour'");
  });

  it('builds folder parent query', () => {
    expect(buildDriveFolderQuery('root')).toBe("'root' in parents and trashed = false");
    expect(buildDriveFolderQuery("Joe's folder")).toBe("'Joe\\'s folder' in parents and trashed = false");
  });
});