import { describe, expect, it } from 'vitest';
import {
  adminDeviceUrl,
  adminGroupUrl,
  adminUserUrl,
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

  it('builds Admin user URL', () => {
    expect(adminUserUrl('user@example.com')).toBe(
      'https://admin.google.com/ac/users/user%40example.com',
    );
  });

  it('builds Admin group URL', () => {
    expect(adminGroupUrl('group@example.com')).toBe(
      'https://admin.google.com/ac/groups/group%40example.com',
    );
  });

  it('builds Admin device URL', () => {
    expect(adminDeviceUrl('device-123')).toBe(
      'https://admin.google.com/ac/devices/details?deviceId=device-123',
    );
  });
});