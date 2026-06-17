import { describe, expect, it } from 'vitest';
import {
  driveFileUrl,
  gmailMessageUrl,
  googleDocUrl,
  googleSheetUrl,
} from '../../../src/cmd/tui/resourceLinks.js';

describe('resourceLinks', () => {
  it('builds Gmail message URL', () => {
    expect(gmailMessageUrl('abc123')).toContain('abc123');
  });

  it('builds Drive file URL', () => {
    expect(driveFileUrl('file-id')).toBe('https://drive.google.com/file/d/file-id/view');
  });

  it('builds Docs URL', () => {
    expect(googleDocUrl('doc-id')).toContain('doc-id');
  });

  it('builds Sheets URL', () => {
    expect(googleSheetUrl('sheet-id')).toContain('sheet-id');
  });
});